import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiUrl, readApiJson } from '../lib/api';
import {
  User,
  Child,
  GPSReading,
  SafeZone,
  RouteConfig,
  EmergencyAlert,
  DeviceTelemetry,
  LocationHistoryEntry,
  ReferenceLocation,
  GeofenceState,
  RouteState,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_CHILDREN,
  INITIAL_SAFE_ZONES,
  INITIAL_ROUTES,
  INITIAL_REFERENCE_LOCATIONS,
  INITIAL_GPS_READINGS,
  INITIAL_DEVICE_STATUS,
  INITIAL_ALERTS,
  INITIAL_LOCATION_HISTORY,
} from '../store/safetyStore';
import {
  evaluateGeofence,
  calculateDistanceToRoute,
  generateOpaqueToken,
  isValidCoordinate,
} from '../utils/geoUtils';

interface AppContextType {
  // Auth state
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  authToken: string | null;
  logout: () => void;

  // Mode state
  systemMode: 'demo' | 'real';
  setSystemMode: (mode: 'demo' | 'real') => void;

  // Children state
  childrenList: Child[];
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
  selectedChild: Child | undefined;
  registerChild: (child: Omit<Child, 'id' | 'qrToken' | 'qrCreatedAt' | 'qrRevoked'>) => Promise<Child>;
  updateChild: (id: string, updates: Partial<Child>) => void;

  // GPS & Live Tracking
  latestReadings: Record<string, GPSReading>;
  getCurrentReading: (childId: string) => GPSReading | undefined;
  ingestGpsReading: (params: {
    deviceId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
    batteryPercent?: number | null;
    isSimulated?: boolean;
    speedKmh?: number;
  }) => { success: boolean; message: string; geofenceState: GeofenceState; routeState: RouteState };

  // Geofencing & Safe Zones
  safeZones: SafeZone[];
  addSafeZone: (zone: Omit<SafeZone, 'id'>) => void;
  updateSafeZone: (id: string, updates: Partial<SafeZone>) => void;
  deleteSafeZone: (id: string) => void;
  getChildGeofenceStatus: (childId: string) => {
    state: GeofenceState;
    distanceMeters: number;
    zoneName: string;
  };

  // Route Monitoring
  routes: RouteConfig[];
  addRoute: (route: Omit<RouteConfig, 'id'>) => void;
  updateRoute: (id: string, updates: Partial<RouteConfig>) => void;
  getChildRouteStatus: (childId: string) => {
    state: RouteState;
    distanceMeters: number;
    routeName: string;
    maxAllowedMeters: number;
  };

  // Emergency SOS
  alerts: EmergencyAlert[];
  unresolvedAlertCount: number;
  triggerSos: (childId: string, triggerType: 'physical_button' | 'dashboard_test', notes?: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string, notes?: string) => void;

  // Location History
  locationHistory: LocationHistoryEntry[];
  clearLocationHistory: (childId?: string) => void;

  // Device Telemetry
  deviceStatusList: Record<string, DeviceTelemetry>;
  updateHeartbeat: (deviceId: string) => void;

  // Reference Locations (GIS/Civil Eng)
  referenceLocations: ReferenceLocation[];
  addReferenceLocation: (loc: Omit<ReferenceLocation, 'id'>) => void;

  // Dynamic QR
  revokeQrToken: (childId: string) => Promise<boolean>;
  regenerateQrToken: (childId: string) => Promise<string>;
  validateQrToken: (token: string) => {
    valid: boolean;
    child?: Child;
    isRevoked: boolean;
  };

  // Simulation Controls (for Demo Mode)
  simulateWalkStep: () => void;
  simulateGeofenceExit: () => void;
  simulateRouteDeviation: () => void;
  resetDemoData: () => void;

  // Active navigation tab
  activeNavTab: string;
  setActiveNavTab: (tab: string) => void;

  // Public QR view token (when simulating scanning from camera)
  scannedTokenForPublicView: string | null;
  setScannedTokenForPublicView: (token: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'qrgps_child_safety_data_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load saved state or defaults
  const [authToken, setAuthToken] = useState<string | null>(() => sessionStorage.getItem('qrgps_auth_token'));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem('qrgps_auth_user');
      return savedUser ? JSON.parse(savedUser) as User : null;
    } catch { return null; }
  });
  const [systemMode, setSystemMode] = useState<'demo' | 'real'>('demo');
  const [childrenList, setChildrenList] = useState<Child[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_children`);
    return saved ? JSON.parse(saved) : INITIAL_CHILDREN;
  });
  const [selectedChildId, setSelectedChildId] = useState<string>('CHILD_001');

  const [latestReadings, setLatestReadings] = useState<Record<string, GPSReading>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_readings`);
    return saved ? JSON.parse(saved) : INITIAL_GPS_READINGS;
  });

  const [safeZones, setSafeZones] = useState<SafeZone[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_safezones`);
    return saved ? JSON.parse(saved) : INITIAL_SAFE_ZONES;
  });

  const [routes, setRoutes] = useState<RouteConfig[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_routes`);
    return saved ? JSON.parse(saved) : INITIAL_ROUTES;
  });

  const [alerts, setAlerts] = useState<EmergencyAlert[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_alerts`);
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  const [locationHistory, setLocationHistory] = useState<LocationHistoryEntry[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_history`);
    return saved ? JSON.parse(saved) : INITIAL_LOCATION_HISTORY;
  });

  const [deviceStatusList, setDeviceStatusList] = useState<Record<string, DeviceTelemetry>>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_devices`);
    return saved ? JSON.parse(saved) : INITIAL_DEVICE_STATUS;
  });

  const [referenceLocations, setReferenceLocations] = useState<ReferenceLocation[]>(INITIAL_REFERENCE_LOCATIONS);
  const [activeNavTab, setActiveNavTab] = useState<string>('dashboard');
  const [scannedTokenForPublicView, setScannedTokenForPublicView] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_children`, JSON.stringify(childrenList));
  }, [childrenList]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_readings`, JSON.stringify(latestReadings));
  }, [latestReadings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_safezones`, JSON.stringify(safeZones));
  }, [safeZones]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_routes`, JSON.stringify(routes));
  }, [routes]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_alerts`, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_history`, JSON.stringify(locationHistory));
  }, [locationHistory]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_devices`, JSON.stringify(deviceStatusList));
  }, [deviceStatusList]);

  // Audio beep on SOS
  const playAlertChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const selectedChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  const login = async (email: string, password: string) => {
    const response = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await readApiJson<any>(response);
    if (!response.ok || !data.token || !data.user) {
      throw new Error(data.error || 'Unable to sign in. Check your credentials.');
    }
    const user = data.user as User;
    setAuthToken(data.token as string);
    setCurrentUser(user);
    sessionStorage.setItem('qrgps_auth_token', data.token as string);
    sessionStorage.setItem('qrgps_auth_user', JSON.stringify(user));
    setSystemMode('real');
    const childrenResponse = await fetch(apiUrl('/api/children'), {
      headers: { Authorization: `Bearer ${data.token}` },
    });
    const childrenData = await readApiJson<any>(childrenResponse);
    if (!childrenResponse.ok) {
      throw new Error(childrenData.error || 'Unable to load registered child profiles.');
    }
    const serverChildren = ((childrenData.children || []) as Child[]).map((child) => {
      const cached = childrenList.find((item) => item.id === child.id);
      return {
        ...cached,
        ...child,
        homeAddressName: cached?.homeAddressName || '',
        schoolLat: cached?.schoolLat ?? child.schoolLat,
        schoolLng: cached?.schoolLng ?? child.schoolLng,
      };
    });
    setChildrenList(serverChildren);
    if (serverChildren.length > 0) setSelectedChildId(serverChildren[0].id);
  };

  const logout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    sessionStorage.removeItem('qrgps_auth_token');
    sessionStorage.removeItem('qrgps_auth_user');
  };

  const getCurrentReading = (childId: string): GPSReading | undefined => {
    return latestReadings[childId];
  };

  const unresolvedAlertCount = alerts.filter((a) => a.status === 'unresolved').length;

  // Ingest GPS reading with Geofence & Route deviation analysis
  const ingestGpsReading = (params: {
    deviceId: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
    batteryPercent?: number | null;
    isSimulated?: boolean;
    speedKmh?: number;
  }) => {
    const { deviceId, latitude, longitude, accuracy = 8, timestamp = new Date().toISOString(), batteryPercent, isSimulated = false, speedKmh = 0 } = params;

    if (!isValidCoordinate(latitude, longitude)) {
      return {
        success: false,
        message: 'Invalid coordinate values. Latitude must be -90..90, Longitude -180..180.',
        geofenceState: 'LOCATION_UNKNOWN' as GeofenceState,
        routeState: 'NO_ROUTE_CONFIGURED' as RouteState,
      };
    }

    // Match child by deviceId
    const targetChild = childrenList.find((c) => c.deviceId.toUpperCase() === deviceId.toUpperCase());
    if (!targetChild) {
      return {
        success: false,
        message: `No registered child associated with Device ID: ${deviceId}`,
        geofenceState: 'LOCATION_UNKNOWN' as GeofenceState,
        routeState: 'NO_ROUTE_CONFIGURED' as RouteState,
      };
    }

    const childId = targetChild.id;

    // 1. Geofence evaluation
    const childSafeZones = safeZones.filter((sz) => sz.childId === childId && sz.isActive);
    let geofenceState: GeofenceState = 'LOCATION_UNKNOWN';
    let minSafeZoneDist = Infinity;
    let insideAnyZone = false;

    if (childSafeZones.length > 0) {
      for (const sz of childSafeZones) {
        const evalRes = evaluateGeofence(latitude, longitude, sz.centerLat, sz.centerLng, sz.radiusMeters);
        if (evalRes.distanceMeters < minSafeZoneDist) {
          minSafeZoneDist = evalRes.distanceMeters;
        }
        if (evalRes.isInside) {
          insideAnyZone = true;
          break;
        }
      }
      geofenceState = insideAnyZone ? 'IN_SAFE_ZONE' : 'OUTSIDE_SAFE_ZONE';
    } else {
      // Fallback to child's home/school radius
      const homeDist = evaluateGeofence(latitude, longitude, targetChild.homeLat, targetChild.homeLng, targetChild.safeZoneRadiusMeters);
      minSafeZoneDist = homeDist.distanceMeters;
      geofenceState = homeDist.isInside ? 'IN_SAFE_ZONE' : 'OUTSIDE_SAFE_ZONE';
    }

    // Detect transition from IN_SAFE_ZONE -> OUTSIDE_SAFE_ZONE
    const previousReading = latestReadings[childId];
    let previousGeofenceState: GeofenceState = 'IN_SAFE_ZONE';
    if (previousReading) {
      const prevHomeDist = evaluateGeofence(previousReading.latitude, previousReading.longitude, targetChild.homeLat, targetChild.homeLng, targetChild.safeZoneRadiusMeters);
      previousGeofenceState = prevHomeDist.isInside ? 'IN_SAFE_ZONE' : 'OUTSIDE_SAFE_ZONE';
    }

    if (previousGeofenceState === 'IN_SAFE_ZONE' && geofenceState === 'OUTSIDE_SAFE_ZONE') {
      // Trigger breach alert
      const newAlert: EmergencyAlert = {
        id: `ALT_GEO_${Date.now()}`,
        childId,
        deviceId,
        triggerType: 'geofence_breach',
        title: 'Geofence Perimeter Breached',
        description: `${targetChild.name} moved outside designated safe zone perimeter (${minSafeZoneDist}m from center).`,
        eventTime: timestamp,
        latitude,
        longitude,
        status: 'unresolved',
        isSimulated,
      };
      setAlerts((prev) => [newAlert, ...prev]);
      playAlertChime();
    }

    // 2. Route evaluation
    const childRoute = routes.find((r) => r.childId === childId && r.isActive);
    let routeState: RouteState = 'NO_ROUTE_CONFIGURED';
    let distanceToRoute = 0;

    if (childRoute && childRoute.waypoints.length > 1) {
      distanceToRoute = calculateDistanceToRoute(latitude, longitude, childRoute.waypoints);
      const isDeviated = distanceToRoute > childRoute.maxAllowedDeviationMeters;
      routeState = isDeviated ? 'DEVIATED' : 'ON_ROUTE';

      if (isDeviated) {
        // Trigger deviation alert if not already alerted within last 10 minutes
        const recentDeviationAlert = alerts.find(
          (a) => a.childId === childId && a.triggerType === 'route_deviation' && a.status === 'unresolved'
        );
        if (!recentDeviationAlert) {
          const devAlert: EmergencyAlert = {
            id: `ALT_DEV_${Date.now()}`,
            childId,
            deviceId,
            triggerType: 'route_deviation',
            title: 'Route Deviation Detected',
            description: `${targetChild.name} deviated ${distanceToRoute}m from designated ${childRoute.name} (limit: ${childRoute.maxAllowedDeviationMeters}m).`,
            eventTime: timestamp,
            latitude,
            longitude,
            status: 'unresolved',
            isSimulated,
          };
          setAlerts((prev) => [devAlert, ...prev]);
          playAlertChime();
        }
      }
    }

    // 3. Update Latest Reading
    const newGpsReading: GPSReading = {
      id: `GPS_${Date.now()}`,
      childId,
      deviceId,
      latitude,
      longitude,
      accuracy,
      timestamp,
      isSimulated,
      speedKmh,
      batteryPercent: batteryPercent !== undefined ? batteryPercent : (previousReading?.batteryPercent ?? null),
      satellites: 8,
    };

    setLatestReadings((prev) => ({
      ...prev,
      [childId]: newGpsReading,
    }));

    // 4. Record to Location History
    const historyEntry: LocationHistoryEntry = {
      id: `HIST_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      childId,
      deviceId,
      timestamp,
      latitude,
      longitude,
      accuracy,
      geofenceStatus: geofenceState,
      routeStatus: routeState,
      distanceFromSafeZoneMeters: minSafeZoneDist,
      distanceFromRouteMeters: distanceToRoute,
      eventType: geofenceState === 'OUTSIDE_SAFE_ZONE' ? 'geofence_exit' : (routeState === 'DEVIATED' ? 'route_deviation' : 'normal'),
      isSimulated,
    };

    setLocationHistory((prev) => [historyEntry, ...prev.slice(0, 99)]); // Keep last 100 entries

    // 5. Update Device Status Telemetry
    setDeviceStatusList((prev) => ({
      ...prev,
      [deviceId]: {
        deviceId,
        childId,
        isOnline: true,
        lastHeartbeat: timestamp,
        lastGpsUpdate: timestamp,
        batteryPercent: batteryPercent !== undefined ? batteryPercent : (prev[deviceId]?.batteryPercent ?? null),
        hasGpsLock: true,
        hardwareVersion: prev[deviceId]?.hardwareVersion || 'ESP32-WROOM-32D / NEO-6M',
        firmwareVersion: prev[deviceId]?.firmwareVersion || 'v1.4.2-iot-safety',
        wifiSsid: prev[deviceId]?.wifiSsid || 'Active_AP_2.4G',
        signalStrengthDbm: prev[deviceId]?.signalStrengthDbm || -65,
      },
    }));

    return {
      success: true,
      message: `Location updated successfully for ${targetChild.name}`,
      geofenceState,
      routeState,
    };
  };

  const getChildGeofenceStatus = (childId: string) => {
    const reading = latestReadings[childId];
    const child = childrenList.find((c) => c.id === childId);
    if (!reading || !child) {
      return { state: 'LOCATION_UNKNOWN' as GeofenceState, distanceMeters: 0, zoneName: 'No reading' };
    }

    const zone = safeZones.find((sz) => sz.childId === childId && sz.isActive);
    const centerLat = zone ? zone.centerLat : child.homeLat;
    const centerLng = zone ? zone.centerLng : child.homeLng;
    const radius = zone ? zone.radiusMeters : child.safeZoneRadiusMeters;

    const res = evaluateGeofence(reading.latitude, reading.longitude, centerLat, centerLng, radius);
    return {
      state: (res.isInside ? 'IN_SAFE_ZONE' : 'OUTSIDE_SAFE_ZONE') as GeofenceState,
      distanceMeters: res.distanceMeters,
      zoneName: zone ? zone.name : 'Default Home Perimeter',
    };
  };

  const getChildRouteStatus = (childId: string) => {
    const reading = latestReadings[childId];
    const route = routes.find((r) => r.childId === childId && r.isActive);
    if (!reading || !route || route.waypoints.length < 2) {
      return { state: 'NO_ROUTE_CONFIGURED' as RouteState, distanceMeters: 0, routeName: 'None', maxAllowedMeters: 0 };
    }

    const dist = calculateDistanceToRoute(reading.latitude, reading.longitude, route.waypoints);
    return {
      state: (dist > route.maxAllowedDeviationMeters ? 'DEVIATED' : 'ON_ROUTE') as RouteState,
      distanceMeters: dist,
      routeName: route.name,
      maxAllowedMeters: route.maxAllowedDeviationMeters,
    };
  };

  // SOS Alert functions
  const triggerSos = (childId: string, triggerType: 'physical_button' | 'dashboard_test', notes?: string) => {
    const child = childrenList.find((c) => c.id === childId);
    const reading = latestReadings[childId];
    const newAlert: EmergencyAlert = {
      id: `SOS_${Date.now()}`,
      childId,
      deviceId: child ? child.deviceId : 'TAG001',
      triggerType,
      title: triggerType === 'physical_button' ? 'HARDWARE SOS BUTTON PRESSED' : 'MANUAL DASHBOARD SOS TRIGGERED',
      description: notes || (triggerType === 'physical_button' 
        ? 'Physical push button on ESP32 held down for 2 seconds. Buzzer alarm active.' 
        : 'Guardian/Admin triggered high-priority emergency alert from control console.'),
      eventTime: new Date().toISOString(),
      latitude: reading?.latitude,
      longitude: reading?.longitude,
      status: 'unresolved',
      isSimulated: systemMode === 'demo',
    };

    setAlerts((prev) => [newAlert, ...prev]);
    playAlertChime();

    // Also record to location history as SOS event
    if (reading) {
      const historyEntry: LocationHistoryEntry = {
        id: `LH_SOS_${Date.now()}`,
        childId,
        deviceId: child?.deviceId || 'TAG001',
        timestamp: new Date().toISOString(),
        latitude: reading.latitude,
        longitude: reading.longitude,
        accuracy: reading.accuracy,
        geofenceStatus: 'IN_SAFE_ZONE',
        routeStatus: 'ON_ROUTE',
        distanceFromSafeZoneMeters: 0,
        eventType: 'sos',
        isSimulated: systemMode === 'demo',
      };
      setLocationHistory((prev) => [historyEntry, ...prev]);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'acknowledged',
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: currentUser ? currentUser.name : 'Authorized Guardian',
            }
          : a
      )
    );
  };

  const resolveAlert = (alertId: string, notes?: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved',
              resolvedAt: new Date().toISOString(),
              resolvedBy: currentUser ? currentUser.name : 'Authorized Guardian',
              resolutionNotes: notes || 'Verified child is safe with guardian / school authority.',
            }
          : a
      )
    );
  };

  // QR dynamic token lifecycle
  const revokeQrToken = async (childId: string): Promise<boolean> => {
    if (systemMode === 'real') {
      if (!authToken) throw new Error('Please sign in again to manage this QR tag.');
      const response = await fetch(apiUrl('/api/qr/revoke'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ child_id: childId }),
      });
      const data = await readApiJson<any>(response);
      if (!response.ok) throw new Error(data.error || 'Unable to revoke QR tag.');
    }
    setChildrenList((prev) => prev.map((c) => c.id === childId ? { ...c, qrRevoked: true } : c));
    return true;
  };

  const regenerateQrToken = async (childId: string): Promise<string> => {
    let newToken: string;
    if (systemMode === 'real') {
      if (!authToken) throw new Error('Please sign in again to manage this QR tag.');
      const response = await fetch(apiUrl('/api/qr/regenerate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ child_id: childId }),
      });
      const data = await readApiJson<any>(response);
      if (!response.ok || !data.new_token) throw new Error(data.error || 'Unable to regenerate QR tag.');
      newToken = data.new_token as string;
    } else {
      newToken = generateOpaqueToken();
    }
    setChildrenList((prev) => prev.map((c) => c.id === childId
      ? { ...c, qrToken: newToken, qrCreatedAt: new Date().toISOString(), qrRevoked: false }
      : c));
    return newToken;
  };

  const validateQrToken = (token: string) => {
    const child = childrenList.find((c) => c.qrToken === token);
    if (!child) {
      return { valid: false, isRevoked: false };
    }
    if (child.qrRevoked) {
      return { valid: false, child, isRevoked: true };
    }
    return { valid: true, child, isRevoked: false };
  };

  // Children Management
  const registerChild = async (childData: Omit<Child, 'id' | 'qrToken' | 'qrCreatedAt' | 'qrRevoked'>): Promise<Child> => {
    if (systemMode === 'real') {
      if (!authToken) throw new Error('Please sign in before registering a child in Real Mode.');
      const response = await fetch(apiUrl('/api/children'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(childData),
      });
      const data = await readApiJson<any>(response);
      if (!response.ok || !data.child?.id || !data.child?.qrToken) throw new Error(data.error || 'Unable to register child.');
      const newChild: Child = {
        ...childData,
        ...(data.child as Partial<Child>),
        id: data.child.id as string,
        qrToken: data.child.qrToken as string,
        homeAddressName: childData.homeAddressName,
        schoolLat: childData.schoolLat,
        schoolLng: childData.schoolLng,
        qrCreatedAt: data.child.qrCreatedAt || new Date().toISOString(),
        qrRevoked: false,
      };
      setChildrenList((prev) => [...prev, newChild]);
      const newSafeZone: SafeZone = {
        id: `SZ_${Date.now()}`, childId: newChild.id,
        name: `${childData.name} Home Safe Zone`,
        centerLat: childData.homeLat, centerLng: childData.homeLng,
        radiusMeters: childData.safeZoneRadiusMeters || 200, isActive: true,
      };
      setSafeZones((prev) => [...prev, newSafeZone]);
      return newChild;
    }
    const newId = `CHILD_${String(childrenList.length + 1).padStart(3, '0')}`;
    const token = generateOpaqueToken();
    const newChild: Child = {
      ...childData,
      id: newId,
      qrToken: token,
      qrCreatedAt: new Date().toISOString(),
      qrRevoked: false,
    };

    setChildrenList((prev) => [...prev, newChild]);

    // Initial safe zone
    const newSafeZone: SafeZone = {
      id: `SZ_${Date.now()}`,
      childId: newId,
      name: `${childData.name} Home Safe Zone`,
      centerLat: childData.homeLat,
      centerLng: childData.homeLng,
      radiusMeters: childData.safeZoneRadiusMeters || 200,
      isActive: true,
    };
    setSafeZones((prev) => [...prev, newSafeZone]);

    // Initial reading
    setLatestReadings((prev) => ({
      ...prev,
      [newId]: {
        id: `GPS_${Date.now()}`,
        childId: newId,
        deviceId: childData.deviceId,
        latitude: childData.homeLat,
        longitude: childData.homeLng,
        accuracy: 10,
        timestamp: new Date().toISOString(),
        isSimulated: true,
        batteryPercent: 100,
      },
    }));

    return newChild;
  };

  const updateChild = (id: string, updates: Partial<Child>) => {
    setChildrenList((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  // Safe Zones
  const addSafeZone = (zone: Omit<SafeZone, 'id'>) => {
    const newZone: SafeZone = { ...zone, id: `SZ_${Date.now()}` };
    setSafeZones((prev) => [...prev, newZone]);
  };

  const updateSafeZone = (id: string, updates: Partial<SafeZone>) => {
    setSafeZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  };

  const deleteSafeZone = (id: string) => {
    setSafeZones((prev) => prev.filter((z) => z.id !== id));
  };

  // Routes
  const addRoute = (route: Omit<RouteConfig, 'id'>) => {
    const newRoute: RouteConfig = { ...route, id: `ROUTE_${Date.now()}` };
    setRoutes((prev) => [...prev, newRoute]);
  };

  const updateRoute = (id: string, updates: Partial<RouteConfig>) => {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  // Device status
  const updateHeartbeat = (deviceId: string) => {
    setDeviceStatusList((prev) => {
      const current = prev[deviceId];
      if (!current) return prev;
      return {
        ...prev,
        [deviceId]: {
          ...current,
          isOnline: true,
          lastHeartbeat: new Date().toISOString(),
        },
      };
    });
  };

  const clearLocationHistory = (childId?: string) => {
    if (childId) {
      setLocationHistory((prev) => prev.filter((h) => h.childId !== childId));
    } else {
      setLocationHistory([]);
    }
  };

  const addReferenceLocation = (loc: Omit<ReferenceLocation, 'id'>) => {
    const newLoc: ReferenceLocation = { ...loc, id: `REF_${Date.now()}` };
    setReferenceLocations((prev) => [...prev, newLoc]);
  };

  // Demonstration Simulation Controls
  const simulateWalkStep = () => {
    if (!selectedChild) return;
    const current = latestReadings[selectedChild.id] || {
      latitude: selectedChild.schoolLat,
      longitude: selectedChild.schoolLng,
    };
    // Move slightly towards home
    const deltaLat = (selectedChild.homeLat - current.latitude) * 0.15;
    const deltaLng = (selectedChild.homeLng - current.longitude) * 0.15;
    const newLat = current.latitude + (deltaLat !== 0 ? deltaLat : 0.0001);
    const newLng = current.longitude + (deltaLng !== 0 ? deltaLng : 0.0001);

    ingestGpsReading({
      deviceId: selectedChild.deviceId,
      latitude: parseFloat(newLat.toFixed(6)),
      longitude: parseFloat(newLng.toFixed(6)),
      accuracy: 5,
      isSimulated: true,
      speedKmh: 4.2,
      batteryPercent: 86,
    });
  };

  const simulateGeofenceExit = () => {
    if (!selectedChild) return;
    // Jump position far beyond the safe zone center
    const farLat = selectedChild.homeLat + 0.008; // ~900 meters away
    const farLng = selectedChild.homeLng + 0.008;

    ingestGpsReading({
      deviceId: selectedChild.deviceId,
      latitude: parseFloat(farLat.toFixed(6)),
      longitude: parseFloat(farLng.toFixed(6)),
      accuracy: 6,
      isSimulated: true,
      speedKmh: 12.0,
      batteryPercent: 85,
    });
  };

  const simulateRouteDeviation = () => {
    if (!selectedChild) return;
    // Push point into side alley or construction area
    const devLat = 9.92950; // Near canal risk zone
    const devLng = 78.12510;

    ingestGpsReading({
      deviceId: selectedChild.deviceId,
      latitude: devLat,
      longitude: devLng,
      accuracy: 7,
      isSimulated: true,
      speedKmh: 8.5,
      batteryPercent: 84,
    });
  };

  const resetDemoData = () => {
    setChildrenList(INITIAL_CHILDREN);
    setLatestReadings(INITIAL_GPS_READINGS);
    setSafeZones(INITIAL_SAFE_ZONES);
    setRoutes(INITIAL_ROUTES);
    setAlerts(INITIAL_ALERTS);
    setLocationHistory(INITIAL_LOCATION_HISTORY);
    setDeviceStatusList(INITIAL_DEVICE_STATUS);
    setSelectedChildId('CHILD_001');
    localStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        authToken,
        logout,
        systemMode,
        setSystemMode,
        childrenList,
        selectedChildId,
        setSelectedChildId,
        selectedChild,
        registerChild,
        updateChild,
        latestReadings,
        getCurrentReading,
        ingestGpsReading,
        safeZones,
        addSafeZone,
        updateSafeZone,
        deleteSafeZone,
        getChildGeofenceStatus,
        routes,
        addRoute,
        updateRoute,
        getChildRouteStatus,
        alerts,
        unresolvedAlertCount,
        triggerSos,
        acknowledgeAlert,
        resolveAlert,
        locationHistory,
        clearLocationHistory,
        deviceStatusList,
        updateHeartbeat,
        referenceLocations,
        addReferenceLocation,
        revokeQrToken,
        regenerateQrToken,
        validateQrToken,
        simulateWalkStep,
        simulateGeofenceExit,
        simulateRouteDeviation,
        resetDemoData,
        activeNavTab,
        setActiveNavTab,
        scannedTokenForPublicView,
        setScannedTokenForPublicView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
