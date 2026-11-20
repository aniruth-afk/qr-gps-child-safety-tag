export type UserRole = 'guardian' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  assignedChildIds: string[];
}

export interface Child {
  id: string; // e.g. "CHILD_001"
  name: string;
  age: number;
  bloodGroup: string;
  guardianName: string;
  guardianPhone: string;
  emergencyContactAlt: string;
  schoolName: string;
  deviceId: string; // e.g. "TAG001"
  safeZoneRadiusMeters: number; // default e.g. 200m
  homeAddressName: string;
  homeLat: number;
  homeLng: number;
  schoolLat: number;
  schoolLng: number;
  qrToken: string; // opaque non-guessable random token
  qrCreatedAt: string;
  qrRevoked: boolean;
  notes?: string;
}

export interface GPSReading {
  id: string;
  childId: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number; // in meters
  timestamp: string;
  isSimulated: boolean;
  speedKmh?: number;
  batteryPercent?: number | null; // null if not reported by hardware
  satellites?: number;
}

export type GeofenceState = 'IN_SAFE_ZONE' | 'OUTSIDE_SAFE_ZONE' | 'LOCATION_UNKNOWN';
export type RouteState = 'ON_ROUTE' | 'DEVIATED' | 'NO_ROUTE_CONFIGURED';

export interface SafeZone {
  id: string;
  childId: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface RouteWaypoint {
  name: string;
  lat: number;
  lng: number;
  order: number;
}

export interface RouteConfig {
  id: string;
  childId: string;
  name: string;
  waypoints: RouteWaypoint[];
  maxAllowedDeviationMeters: number; // e.g. 150m
  isActive: boolean;
}

export type AlertTriggerType = 
  | 'physical_button' 
  | 'dashboard_test' 
  | 'geofence_breach' 
  | 'route_deviation';

export type AlertStatus = 'unresolved' | 'acknowledged' | 'resolved';

export interface EmergencyAlert {
  id: string;
  childId: string;
  deviceId: string;
  triggerType: AlertTriggerType;
  title: string;
  description: string;
  eventTime: string;
  latitude?: number;
  longitude?: number;
  status: AlertStatus;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  isSimulated: boolean;
}

export interface DeviceTelemetry {
  deviceId: string;
  childId: string;
  isOnline: boolean;
  lastHeartbeat: string;
  lastGpsUpdate: string;
  batteryPercent: number | null; // "Not available" if hardware does not provide
  hasGpsLock: boolean;
  hardwareVersion: string;
  firmwareVersion: string;
  wifiSsid?: string;
  signalStrengthDbm?: number;
}

export interface LocationHistoryEntry {
  id: string;
  childId: string;
  deviceId: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  geofenceStatus: GeofenceState;
  routeStatus: RouteState;
  distanceFromSafeZoneMeters: number;
  distanceFromRouteMeters?: number;
  eventType: 'normal' | 'sos' | 'geofence_exit' | 'geofence_entry' | 'route_deviation';
  isSimulated: boolean;
}

export interface ReferenceLocation {
  id: string;
  name: string;
  type: 'school' | 'home' | 'risk_zone' | 'bus_stop';
  lat: number;
  lng: number;
  description: string;
  riskSeverity?: 'low' | 'medium' | 'high';
}
