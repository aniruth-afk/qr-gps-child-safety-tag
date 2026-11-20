import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Info,
  Footprints
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafetyMap } from '../components/Map/SafetyMap';
import { calculateDistanceToRoute, formatCoordinates } from '../utils/geoUtils';
import { RouteWaypoint } from '../types';

export const RouteMonitoringView: React.FC = () => {
  const {
    selectedChild,
    routes,
    updateRoute,
    addRoute,
    latestReadings,
    getCurrentReading,
    getChildRouteStatus,
    referenceLocations,
    systemMode,
    simulateRouteDeviation,
  } = useApp();

  const [thresholdInput, setThresholdInput] = useState<number>(110);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  if (!selectedChild) {
    return <div className="p-8 text-center text-xs text-gray-500">No child selected.</div>;
  }

  const childRoute = routes.find((r) => r.childId === selectedChild.id) || routes[0];
  const currentReading = getCurrentReading(selectedChild.id);
  const routeStatus = getChildRouteStatus(selectedChild.id);

  const handleUpdateThreshold = (newVal: number) => {
    setThresholdInput(newVal);
    if (childRoute) {
      updateRoute(childRoute.id, { maxAllowedDeviationMeters: newVal });
      setSuccessNotice(`Route deviation tolerance set to ${newVal} meters.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            Route-Deviation Monitoring
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Rule-based perpendicular cross-track corridor detection along the child&apos;s daily path.
          </p>
        </div>

        {systemMode === 'demo' && (
          <button
            onClick={simulateRouteDeviation}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Route Deviation Event</span>
          </button>
        )}
      </div>

      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-md flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Corridor Adherence Status Bar */}
      <div className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        routeStatus.state === 'ON_ROUTE'
          ? 'bg-blue-50 border-blue-200 text-blue-950'
          : routeStatus.state === 'DEVIATED'
          ? 'bg-amber-50 border-amber-200 text-amber-950'
          : 'bg-gray-50 border-gray-200 text-gray-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
            routeStatus.state === 'ON_ROUTE'
              ? 'bg-blue-200 text-blue-800'
              : routeStatus.state === 'DEVIATED'
              ? 'bg-amber-200 text-amber-800'
              : 'bg-gray-200 text-gray-700'
          }`}>
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-600">
              Corridor Adherence Status
            </div>
            <div className="text-base font-extrabold mt-0.5">
              {routeStatus.state === 'ON_ROUTE'
                ? 'ON EXPECTED SAFE PATH'
                : routeStatus.state === 'DEVIATED'
                ? 'ROUTE DEVIATION DETECTED!'
                : 'NO ROUTE DEFINED'}
            </div>
          </div>
        </div>

        <div className="text-xs sm:text-right font-medium">
          <div>Corridor Name: <strong>{childRoute ? childRoute.name : 'N/A'}</strong></div>
          <div>Current Offset: <strong className="font-bold">{routeStatus.distanceMeters}m</strong> (Allowed: ±{childRoute?.maxAllowedDeviationMeters || 110}m)</div>
        </div>
      </div>

      {/* Main Map with Route Polyline */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[#111827]">
              Expected Route Polyline &amp; Waypoint Nodes
            </h3>
            <p className="text-xs text-gray-500">
              Blue dashed line indicates approved path. Child icon marks real-time or simulated GPS fix.
            </p>
          </div>
          <span className="text-xs font-mono text-gray-600">
            {childRoute?.waypoints.length || 0} Waypoint Anchors
          </span>
        </div>

        <SafetyMap
          currentLat={currentReading?.latitude || childRoute?.waypoints[0]?.lat || 9.9281}
          currentLng={currentReading?.longitude || childRoute?.waypoints[0]?.lng || 78.1235}
          childName={selectedChild.name}
          isSimulated={currentReading?.isSimulated}
          waypoints={childRoute?.waypoints}
          riskZones={referenceLocations.filter((r) => r.type === 'risk_zone')}
          heightClass="h-[420px]"
        />
      </div>

      {/* Route Configuration & Waypoint Table */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Deviation Threshold Settings */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Corridor Tolerance Buffer
            </h3>
            <p className="text-xs text-gray-500">
              Adjust maximum allowed distance before raising an emergency warning.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Allowed Corridor Width: <span className="text-blue-700 font-extrabold">{childRoute?.maxAllowedDeviationMeters || thresholdInput} meters</span>
            </label>
            <input
              type="range"
              min="50"
              max="400"
              step="10"
              value={childRoute?.maxAllowedDeviationMeters || thresholdInput}
              onChange={(e) => handleUpdateThreshold(parseInt(e.target.value))}
              className="w-full mt-2"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Strict (50m)</span>
              <span>Default (120m)</span>
              <span>Relaxed (400m)</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded text-[11px] text-gray-600 space-y-1">
            <span className="font-bold text-gray-800 block">Civil &amp; Urban Context:</span>
            <span>A 100m–150m corridor provides adequate tolerance for GPS drift in urban canyons while promptly flagging detour into unauthorized alleyways.</span>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
            <strong>Prototype Disclaimer:</strong> This rule-based geometric calculation is an engineering prototype and does not detect every unpredictable movement or replace human supervision.
          </div>
        </div>

        {/* Right 2 cols: Waypoints Table */}
        <div className="md:col-span-2 bg-white rounded-lg border border-[#E5E7EB] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
            <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
              <Footprints className="w-4 h-4 text-blue-600" />
              Route Waypoint Sequence ({childRoute?.name})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F3F4F6] text-gray-700 uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-3 py-2">Node #</th>
                  <th className="px-3 py-2">Checkpoint Landmark</th>
                  <th className="px-3 py-2">Latitude</th>
                  <th className="px-3 py-2">Longitude</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {childRoute?.waypoints.map((wp) => (
                  <tr key={wp.order} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-bold text-blue-700">
                      Waypoint {wp.order}
                    </td>
                    <td className="px-3 py-2 font-semibold text-gray-900">
                      {wp.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">
                      {wp.lat.toFixed(5)}°
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-600">
                      {wp.lng.toFixed(5)}°
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
