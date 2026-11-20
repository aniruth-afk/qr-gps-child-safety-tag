import React, { useState } from 'react';
import {
  MapPin,
  RefreshCw,
  Compass,
  Battery,
  Radio,
  Clock,
  ShieldCheck,
  AlertTriangle,
  History,
  Activity,
  Layers,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafetyMap } from '../components/Map/SafetyMap';
import { formatCoordinates, getLocationFreshness } from '../utils/geoUtils';

export const LiveLocationView: React.FC = () => {
  const {
    selectedChild,
    latestReadings,
    getCurrentReading,
    getChildGeofenceStatus,
    getChildRouteStatus,
    safeZones,
    routes,
    referenceLocations,
    deviceStatusList,
    systemMode,
    simulateWalkStep,
    setActiveNavTab,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!selectedChild) {
    return (
      <div className="p-8 text-center bg-white border border-[#E5E7EB] rounded-lg">
        <h2 className="text-base font-bold text-[#111827]">No Child Selected</h2>
        <p className="text-xs text-gray-500 mt-1">Please select or register a child profile.</p>
      </div>
    );
  }

  const reading = getCurrentReading(selectedChild.id);
  const device = deviceStatusList[selectedChild.deviceId];
  const geofence = getChildGeofenceStatus(selectedChild.id);
  const routeStatus = getChildRouteStatus(selectedChild.id);
  const activeSafeZone = safeZones.find((sz) => sz.childId === selectedChild.id && sz.isActive);
  const activeRoute = routes.find((r) => r.childId === selectedChild.id && r.isActive);

  const freshness = reading ? getLocationFreshness(reading.timestamp) : null;

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#111827]">
              Live GPS Location
            </h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              systemMode === 'demo'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-blue-100 text-blue-800 border-blue-300'
            }`}>
              {systemMode === 'demo' ? 'SIMULATED GPS' : 'LIVE ESP32 FIX'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Tracking {selectedChild.name} (Device #{selectedChild.deviceId}) • NEO-6M Serial Stream
          </p>
        </div>

        <div className="flex items-center gap-2">
          {systemMode === 'demo' && (
            <button
              onClick={simulateWalkStep}
              className="bg-white hover:bg-gray-100 text-[#111827] text-xs font-bold px-3 py-2 rounded-md border border-[#E5E7EB] flex items-center gap-1.5 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span>Simulate Movement Step</span>
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Coordinates</span>
          </button>

          <button
            onClick={() => setActiveNavTab('history')}
            className="bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold px-3 py-2 rounded-md border border-[#E5E7EB] flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-gray-600" />
            <span>Location History</span>
          </button>
        </div>
      </div>

      {/* Real Mode Disclaimer / Telemetry Check */}
      {systemMode === 'real' && !reading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-4 text-xs">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Awaiting Real GPS Fix from ESP32</span>
          </div>
          <p className="text-blue-800">
            Real Device Mode is active. No simulated coordinates are shown. Connect the ESP32 to Wi-Fi and verify the NEO-6M has a clear view of the sky (PPS LED flashing). The tag posts telemetry to:
          </p>
          <pre className="mt-2 p-2 bg-white rounded border border-blue-200 font-mono text-[11px] overflow-x-auto">
            POST /api/devices/location
            {`\n{\n  "device_id": "${selectedChild.deviceId}",\n  "latitude": 9.92520,\n  "longitude": 78.11980,\n  "accuracy": 8\n}`}
          </pre>
        </div>
      )}

      {/* Main Map View */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-[#111827]">
              Geospatial Positioning Map
            </h3>
            {reading && (
              <span className="font-mono text-xs text-gray-500">
                ({formatCoordinates(reading.latitude, reading.longitude)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">Accuracy:</span>
            <span className="font-mono font-bold text-gray-800">±{reading?.accuracy || 8}m</span>
          </div>
        </div>

        {reading ? (
          <SafetyMap
            currentLat={reading.latitude}
            currentLng={reading.longitude}
            childName={selectedChild.name}
            isSimulated={reading.isSimulated}
            safeZone={activeSafeZone}
            waypoints={activeRoute?.waypoints}
            riskZones={referenceLocations.filter((r) => r.type === 'risk_zone')}
            accuracyMeters={reading.accuracy}
            heightClass="h-[460px]"
          />
        ) : (
          <div className="h-[460px] rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
            <Compass className="w-10 h-10 text-gray-400 mb-2 animate-spin" />
            <p className="text-sm font-bold text-[#111827]">Searching for satellite constellation...</p>
            <p className="text-xs text-gray-500 max-w-md mt-1">
              Ensure the NEO-6M ceramic patch antenna is oriented facing upwards towards open sky. Initial TTFF (Time To First Fix) is typically 27–45 seconds.
            </p>
          </div>
        )}
      </div>

      {/* 4 Detail Telemetry Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Coordinates & Timestamp */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            GPS Coordinates &amp; Timestamp
          </span>
          <div className="mt-2 font-mono text-xs font-extrabold text-[#111827]">
            {reading ? (
              <>
                <div>LAT: {reading.latitude.toFixed(6)}°</div>
                <div>LNG: {reading.longitude.toFixed(6)}°</div>
              </>
            ) : (
              '--.------, --.------'
            )}
          </div>
          <div className="text-[11px] text-gray-500 mt-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{reading ? new Date(reading.timestamp).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>

        {/* Box 2: Freshness & Accuracy */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            Location Freshness
          </span>
          <div className="mt-2 flex items-center gap-2">
            {freshness ? (
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${freshness.colorClass}`}>
                {freshness.label} ({freshness.minutesAgo} min ago)
              </span>
            ) : (
              <span className="text-xs text-gray-400">Waiting fix</span>
            )}
          </div>
          <div className="text-[11px] text-gray-600 mt-2">
            Horizontal Accuracy: <strong>±{reading?.accuracy || 0}m</strong>
          </div>
        </div>

        {/* Box 3: Safe Zone Assessment */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            Safe Zone Compliance
          </span>
          <div className="mt-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
              geofence.state === 'IN_SAFE_ZONE'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {geofence.state === 'IN_SAFE_ZONE' ? 'IN SAFE ZONE' : 'OUTSIDE SAFE ZONE'}
            </span>
          </div>
          <div className="text-[11px] text-gray-600 mt-2">
            Distance from center: <strong>{geofence.distanceMeters}m</strong>
          </div>
        </div>

        {/* Box 4: Hardware & Satellites */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
            Hardware &amp; Power
          </span>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">Device Tag:</span>
            <span className="font-mono font-bold text-blue-700">{selectedChild.deviceId}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">Battery:</span>
            <span className="font-bold text-emerald-700">
              {device?.batteryPercent !== null && device?.batteryPercent !== undefined
                ? `${device.batteryPercent}%`
                : 'Not available'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">Satellites Tracked:</span>
            <span className="font-bold text-gray-900">{reading?.satellites || 7} (NEO-6M)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
