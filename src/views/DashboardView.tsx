import React from 'react';
import {
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  Clock,
  Battery,
  AlertTriangle,
  Play,
  RotateCcw,
  ArrowRight,
  UserCheck,
  Radio
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafetyMap } from '../components/Map/SafetyMap';
import { formatCoordinates, getLocationFreshness } from '../utils/geoUtils';

export const DashboardView: React.FC = () => {
  const {
    childrenList,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    latestReadings,
    getCurrentReading,
    getChildGeofenceStatus,
    getChildRouteStatus,
    alerts,
    unresolvedAlertCount,
    deviceStatusList,
    safeZones,
    routes,
    referenceLocations,
    locationHistory,
    systemMode,
    simulateWalkStep,
    simulateGeofenceExit,
    simulateRouteDeviation,
    triggerSos,
    setActiveNavTab,
  } = useApp();

  if (!selectedChild) {
    return (
      <div className="p-8 text-center bg-white border border-[#E5E7EB] rounded-lg">
        <h2 className="text-base font-bold text-[#111827]">No Children Registered Yet</h2>
        <p className="text-sm text-gray-500 mt-1">Register a child profile to initiate safety tracking.</p>
        <button
          onClick={() => setActiveNavTab('profile')}
          className="mt-4 bg-[#3B82F6] text-white px-4 py-2 rounded-md font-semibold text-xs cursor-pointer"
        >
          Register First Child
        </button>
      </div>
    );
  }

  const currentReading = getCurrentReading(selectedChild.id);
  const geofenceStatus = getChildGeofenceStatus(selectedChild.id);
  const routeStatus = getChildRouteStatus(selectedChild.id);
  const device = deviceStatusList[selectedChild.deviceId];
  const activeSafeZone = safeZones.find((sz) => sz.childId === selectedChild.id && sz.isActive);
  const activeRoute = routes.find((r) => r.childId === selectedChild.id && r.isActive);

  const freshness = currentReading ? getLocationFreshness(currentReading.timestamp) : null;
  const recentEvents = locationHistory.filter((h) => h.childId === selectedChild.id).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Page Title & Child Quick Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#111827]">
              Guardian Safety Dashboard
            </h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
              systemMode === 'demo'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {systemMode === 'demo' ? 'SIMULATED DATA' : 'LIVE HARDWARE DATA'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Active surveillance overview for {selectedChild.name} • Tag #{selectedChild.deviceId}
          </p>
        </div>

        {/* Demo Fast Simulator Toolbar (Visible in Demo mode) */}
        {systemMode === 'demo' && (
          <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-md p-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-600 px-2">Simulation Test:</span>
            <button
              onClick={simulateWalkStep}
              className="bg-white hover:bg-gray-100 text-[#111827] text-xs font-semibold px-2.5 py-1 rounded border border-[#E5E7EB] flex items-center gap-1 cursor-pointer"
              title="Simulates child walking forward along route"
            >
              <Play className="w-3 h-3 text-blue-600" />
              <span>Step Forward</span>
            </button>
            <button
              onClick={simulateGeofenceExit}
              className="bg-white hover:bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded border border-red-200 flex items-center gap-1 cursor-pointer"
              title="Simulates child stepping outside the safe zone boundary"
            >
              <AlertTriangle className="w-3 h-3 text-red-600" />
              <span>Exit Safe Zone</span>
            </button>
            <button
              onClick={simulateRouteDeviation}
              className="bg-white hover:bg-amber-50 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded border border-amber-200 flex items-center gap-1 cursor-pointer"
              title="Simulates child deviating into unauthorized alley or risk area"
            >
              <Navigation className="w-3 h-3 text-amber-600" />
              <span>Deviate Route</span>
            </button>
          </div>
        )}
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Geofence Status */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Safe Zone Status</span>
            <ShieldCheck className={`w-4 h-4 ${geofenceStatus.state === 'IN_SAFE_ZONE' ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-base font-extrabold ${
              geofenceStatus.state === 'IN_SAFE_ZONE' ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {geofenceStatus.state === 'IN_SAFE_ZONE' ? 'IN SAFE ZONE' : 'OUTSIDE SAFE ZONE'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{geofenceStatus.zoneName}</span>
            <span className="font-semibold text-gray-700">{geofenceStatus.distanceMeters}m from center</span>
          </div>
        </div>

        {/* KPI 2: Route Monitoring */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Route Monitoring</span>
            <Navigation className={`w-4 h-4 ${routeStatus.state === 'ON_ROUTE' ? 'text-blue-600' : 'text-amber-600'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-base font-extrabold ${
              routeStatus.state === 'ON_ROUTE'
                ? 'text-blue-700'
                : routeStatus.state === 'DEVIATED'
                ? 'text-amber-700'
                : 'text-gray-600'
            }`}>
              {routeStatus.state === 'ON_ROUTE'
                ? 'ON EXPECTED ROUTE'
                : routeStatus.state === 'DEVIATED'
                ? 'ROUTE DEVIATED'
                : 'NO ROUTE DEFINED'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>Threshold: {routeStatus.maxAllowedMeters}m</span>
            <span className="font-semibold text-gray-700">Offset: {routeStatus.distanceMeters}m</span>
          </div>
        </div>

        {/* KPI 3: Unresolved SOS */}
        <div className={`p-4 rounded-lg border transition-colors ${
          unresolvedAlertCount > 0
            ? 'bg-red-50 border-red-300'
            : 'bg-white border-[#E5E7EB]'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">SOS Emergency Status</span>
            <ShieldAlert className={`w-4 h-4 ${unresolvedAlertCount > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-xl font-extrabold ${unresolvedAlertCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              {unresolvedAlertCount > 0 ? `${unresolvedAlertCount} ACTIVE SOS` : 'NO ALERTS'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>{unresolvedAlertCount > 0 ? 'Requires immediate action' : 'System nominal'}</span>
            <button
              onClick={() => setActiveNavTab('emergency')}
              className="text-blue-600 hover:underline font-semibold"
            >
              View Alerts
            </button>
          </div>
        </div>

        {/* KPI 4: Hardware & GPS Freshness */}
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">ESP32 Hardware Tag</span>
            <Radio className={`w-4 h-4 ${device?.isOnline ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base font-extrabold text-[#111827]">
              {device?.isOnline ? 'ONLINE (ACTIVE)' : 'OFFLINE'}
            </span>
            {device?.batteryPercent !== null && device?.batteryPercent !== undefined && (
              <span className="text-xs font-bold text-gray-700 flex items-center gap-0.5">
                <Battery className="w-3.5 h-3.5 text-emerald-600" />
                {device.batteryPercent}%
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
            <span>Freshness:</span>
            {freshness ? (
              <span className={`font-semibold px-1.5 py-0.5 rounded text-[10px] border ${freshness.colorClass}`}>
                {freshness.label} ({freshness.minutesAgo}m ago)
              </span>
            ) : (
              <span className="text-gray-400">No fix</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Center Grid: Live Map + Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Column (2 spans) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  Live Geolocation Map
                </h3>
                <p className="text-xs text-gray-500">
                  Visualizing GPS fix, safe perimeter ({activeSafeZone?.radiusMeters || 200}m), and school walkway.
                </p>
              </div>
              <button
                onClick={() => setActiveNavTab('live')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Screen Live View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {currentReading ? (
              <SafetyMap
                currentLat={currentReading.latitude}
                currentLng={currentReading.longitude}
                childName={selectedChild.name}
                isSimulated={currentReading.isSimulated}
                safeZone={activeSafeZone}
                waypoints={activeRoute?.waypoints}
                riskZones={referenceLocations.filter((r) => r.type === 'risk_zone')}
                accuracyMeters={currentReading.accuracy}
                heightClass="h-[380px]"
              />
            ) : (
              <div className="h-[380px] rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] flex flex-col items-center justify-center p-6 text-center">
                <MapPin className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm font-bold text-[#111827]">No GPS coordinates available yet</p>
                <p className="text-xs text-gray-500 max-w-sm mt-1">
                  In Real Device Mode, connect the ESP32 and send a reading to <code>POST /api/devices/location</code>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Info Column: Child Card & Quick Actions */}
        <div className="space-y-4">
          {/* Child Identity Card */}
          <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-sm">
                  {selectedChild.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#111827]">{selectedChild.name}</h4>
                  <span className="text-xs text-gray-500">Age: {selectedChild.age} • Blood: {selectedChild.bloodGroup}</span>
                </div>
              </div>
              <button
                onClick={() => setActiveNavTab('profile')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Edit
              </button>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">School:</span>
                <span className="font-semibold text-gray-900 text-right">{selectedChild.schoolName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Primary Contact:</span>
                <span className="font-semibold text-gray-900">{selectedChild.guardianPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Device Hardware ID:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                  {selectedChild.deviceId}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Current Coordinates:</span>
                <span className="font-mono text-[11px] text-gray-800">
                  {currentReading ? formatCoordinates(currentReading.latitude, currentReading.longitude) : 'Waiting fix'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">QR Tag Token:</span>
                <span className={`font-mono text-[11px] font-bold ${selectedChild.qrRevoked ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                  {selectedChild.qrToken} {selectedChild.qrRevoked && '(REVOKED)'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#E5E7EB] flex gap-2">
              <button
                onClick={() => setActiveNavTab('qr')}
                className="flex-1 bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold py-2 rounded-md border border-[#E5E7EB] text-center cursor-pointer"
              >
                Print QR Badge
              </button>
              <button
                onClick={() => setActiveNavTab('geofence')}
                className="flex-1 bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold py-2 rounded-md border border-[#E5E7EB] text-center cursor-pointer"
              >
                Safe Zone Setup
              </button>
            </div>
          </div>

          {/* Quick SOS Trigger in Dashboard */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h4 className="text-sm font-bold text-red-900">Dashboard SOS Emergency Drill</h4>
            </div>
            <p className="text-xs text-red-700 mb-3 leading-relaxed">
              Triggers simulated emergency sequence. Records instant GPS fix and activates alerts for guardians.
            </p>
            <button
              onClick={() => {
                if (confirm(`Confirm SOS EMERGENCY drill for ${selectedChild.name}?`)) {
                  triggerSos(selectedChild.id, 'dashboard_test', 'Emergency drill triggered from web dashboard');
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-2.5 rounded-md uppercase tracking-wider transition-colors cursor-pointer"
            >
              Trigger Test SOS Alert
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity Log Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Recent Location &amp; Telemetry Events
            </h3>
            <p className="text-xs text-gray-500">
              Audit trail of safe zone evaluations, route adherence, and device pings.
            </p>
          </div>
          <button
            onClick={() => setActiveNavTab('history')}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            View Full History →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F3F4F6] text-gray-700 uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Coordinates</th>
                <th className="px-3 py-2">Safe Zone</th>
                <th className="px-3 py-2">Route Status</th>
                <th className="px-3 py-2">Event Classification</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {recentEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-900">
                    {evt.latitude.toFixed(5)}, {evt.longitude.toFixed(5)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      evt.geofenceStatus === 'IN_SAFE_ZONE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {evt.geofenceStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      evt.routeStatus === 'ON_ROUTE'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : evt.routeStatus === 'DEVIATED'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {evt.routeStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-gray-800 uppercase text-[10px]">
                      {evt.eventType}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      evt.isSimulated
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {evt.isSimulated ? 'Simulated' : 'Real Hardware'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
