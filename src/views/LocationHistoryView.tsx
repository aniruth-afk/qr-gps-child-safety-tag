import React, { useState } from 'react';
import {
  History,
  Download,
  Filter,
  Calendar,
  MapPin,
  Clock,
  Layers,
  Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafetyMap } from '../components/Map/SafetyMap';
import { formatCoordinates } from '../utils/geoUtils';

export const LocationHistoryView: React.FC = () => {
  const {
    selectedChild,
    locationHistory,
    clearLocationHistory,
    safeZones,
    routes,
    referenceLocations,
    systemMode,
  } = useApp();

  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [showMapPath, setShowMapPath] = useState(true);

  if (!selectedChild) {
    return <div className="p-8 text-center text-xs text-gray-500">No child selected.</div>;
  }

  const childHistory = locationHistory.filter((h) => h.childId === selectedChild.id);
  const filteredHistory = childHistory.filter((h) => {
    if (eventTypeFilter === 'all') return true;
    return h.eventType === eventTypeFilter;
  });

  const activeSafeZone = safeZones.find((sz) => sz.childId === selectedChild.id && sz.isActive);
  const activeRoute = routes.find((r) => r.childId === selectedChild.id && r.isActive);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Child_ID', 'Device_ID', 'Latitude', 'Longitude', 'Accuracy_m', 'Geofence_Status', 'Route_Status', 'Event_Type', 'Source'];
    const rows = filteredHistory.map((h) => [
      h.timestamp,
      h.childId,
      h.deviceId,
      h.latitude,
      h.longitude,
      h.accuracy,
      h.geofenceStatus,
      h.routeStatus,
      h.eventType,
      h.isSimulated ? 'Simulated' : 'Real_Hardware',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `gps_history_${selectedChild.id}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            Location Audit &amp; Historical Trajectory
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Chronological audit of GPS positions, safe zone transitions, and corridor compliance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMapPath(!showMapPath)}
            className="bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold px-3 py-2 rounded-md border border-[#E5E7EB] flex items-center gap-1.5 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-gray-700" />
            <span>{showMapPath ? 'Hide Trajectory Map' : 'Show Trajectory Map'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={filteredHistory.length === 0}
            className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Map Trajectory Component */}
      {showMapPath && childHistory.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#111827]">Historical Waypoint Breadcrumb Path</h3>
            <span className="text-xs text-gray-500 font-mono">
              {childHistory.length} Recorded GPS Fixes
            </span>
          </div>

          <SafetyMap
            currentLat={childHistory[0]?.latitude || 9.9275}
            currentLng={childHistory[0]?.longitude || 78.1224}
            childName={selectedChild.name}
            safeZone={activeSafeZone}
            waypoints={activeRoute?.waypoints}
            historyPoints={childHistory.map((h) => ({ lat: h.latitude, lng: h.longitude, timestamp: h.timestamp }))}
            showHistoryPath={true}
            riskZones={referenceLocations.filter((r) => r.type === 'risk_zone')}
            heightClass="h-[360px]"
          />
        </div>
      )}

      {/* Filters & Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-3 bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-700">Filter Event Type:</span>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-[#E5E7EB] rounded px-2.5 py-1.5 text-gray-800 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Events ({childHistory.length})</option>
              <option value="normal">Normal Periodic Updates</option>
              <option value="sos">Emergency SOS Triggers</option>
              <option value="geofence_exit">Geofence Breaches</option>
              <option value="route_deviation">Route Deviations</option>
            </select>
          </div>

          <button
            onClick={() => {
              if (confirm('Clear location history for this child?')) {
                clearLocationHistory(selectedChild.id);
              }
            }}
            className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F3F4F6] text-gray-700 uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">GPS Coordinates</th>
                <th className="px-4 py-3">Horizontal Accuracy</th>
                <th className="px-4 py-3">Safe Zone State</th>
                <th className="px-4 py-3">Route Compliance</th>
                <th className="px-4 py-3">Event Trigger</th>
                <th className="px-4 py-3">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No history entries found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-600">
                      <div>{new Date(item.timestamp).toLocaleDateString()}</div>
                      <div className="font-bold text-gray-900">{new Date(item.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium text-gray-900">
                      <div>{item.latitude.toFixed(6)}° N</div>
                      <div>{item.longitude.toFixed(6)}° E</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600">
                      ±{item.accuracy}m
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.geofenceStatus === 'IN_SAFE_ZONE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {item.geofenceStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.routeStatus === 'ON_ROUTE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : item.routeStatus === 'DEVIATED'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {item.routeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold uppercase text-[10px] text-gray-800">
                        {item.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.isSimulated
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {item.isSimulated ? 'Simulated' : 'ESP32 Live'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
