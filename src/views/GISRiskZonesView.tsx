import React, { useState } from 'react';
import {
  Compass,
  AlertTriangle,
  MapPin,
  Plus,
  Info,
  Shield,
  Layers,
  CheckCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SafetyMap } from '../components/Map/SafetyMap';
import { formatCoordinates } from '../utils/geoUtils';

export const GISRiskZonesView: React.FC = () => {
  const {
    selectedChild,
    referenceLocations,
    addReferenceLocation,
    safeZones,
    routes,
    latestReadings,
    getCurrentReading,
  } = useApp();

  const [isAddingZone, setIsAddingZone] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Heavy Traffic Highway Crossing',
    type: 'risk_zone' as const,
    lat: 9.92950,
    lng: 78.12510,
    description: 'Multi-lane arterial highway intersection lacking pedestrian bridge signal.',
    riskSeverity: 'high' as 'low' | 'medium' | 'high',
  });

  if (!selectedChild) {
    return <div className="p-8 text-center text-xs text-gray-500">No child selected.</div>;
  }

  const currentReading = getCurrentReading(selectedChild.id);
  const activeSafeZone = safeZones.find((sz) => sz.childId === selectedChild.id && sz.isActive);
  const activeRoute = routes.find((r) => r.childId === selectedChild.id && r.isActive);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addReferenceLocation(formData);
    setIsAddingZone(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            GIS &amp; Civil Engineering Spatial Risk Analysis
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Geographic information system layer incorporating urban infrastructure hazards and pedestrian safety corridors.
          </p>
        </div>

        {!isAddingZone && (
          <button
            onClick={() => setIsAddingZone(true)}
            className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Map Hazard Zone</span>
          </button>
        )}
      </div>

      {/* Academic / Civil Engineering Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Academic Project Contribution: Spatial Infrastructure Risk Layer</span>
        </div>
        <p className="text-blue-800 leading-relaxed">
          Standard consumer child trackers only mark circular distance from home. This system extends spatial intelligence by superimposing <strong>civil infrastructure hazard zones</strong> (active construction sites, unbarricaded irrigation canals, and high-speed arterial road crossings). When an ESP32 GPS reading intersects with a defined risk buffer, the guardian receives a contextual warning with infrastructure details.
        </p>
      </div>

      {/* Add Hazard Form */}
      {isAddingZone && (
        <form onSubmit={handleAdd} className="bg-white border border-[#E5E7EB] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827]">Add Civil Infrastructure Hazard Marker</h3>
            <button onClick={() => setIsAddingZone(false)} className="text-xs text-gray-500">Cancel</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Hazard Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-[#E5E7EB] rounded"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Severity</label>
              <select
                value={formData.riskSeverity}
                onChange={(e) => setFormData({ ...formData, riskSeverity: e.target.value as 'low' | 'medium' | 'high' })}
                className="w-full p-2 border border-[#E5E7EB] rounded"
              >
                <option value="low">Low (Minor detour)</option>
                <option value="medium">Medium (Moderate traffic)</option>
                <option value="high">High (Civil construction / Water hazard)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Latitude</label>
              <input
                type="number"
                step="0.00001"
                value={formData.lat}
                onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-[#E5E7EB] rounded font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Longitude</label>
              <input
                type="number"
                step="0.00001"
                value={formData.lng}
                onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) || 0 })}
                className="w-full p-2 border border-[#E5E7EB] rounded font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Civil / Engineering Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs p-2 border border-[#E5E7EB] rounded"
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="bg-[#3B82F6] text-white text-xs font-bold px-4 py-2 rounded">
              Save Infrastructure Marker
            </button>
          </div>
        </form>
      )}

      {/* Map View */}
      <div className="bg-white p-4 rounded-lg border border-[#E5E7EB]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-[#111827]">
            Civil Spatial Layer: Safe Zones vs. Hazard Perimeters
          </h3>
          <span className="text-xs text-gray-500 font-mono">
            {referenceLocations.length} Spatial Reference POIs
          </span>
        </div>

        <SafetyMap
          currentLat={currentReading?.latitude || 9.9275}
          currentLng={currentReading?.longitude || 78.1224}
          childName={selectedChild.name}
          safeZone={activeSafeZone}
          waypoints={activeRoute?.waypoints}
          riskZones={referenceLocations.filter((r) => r.type === 'risk_zone')}
          heightClass="h-[400px]"
        />
      </div>

      {/* Reference Points List */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 border-b border-[#E5E7EB]">
          <h3 className="text-sm font-bold text-[#111827]">Geographic Anchors &amp; Infrastructure Risk Log</h3>
        </div>

        <div className="divide-y divide-[#E5E7EB]">
          {referenceLocations.map((loc) => (
            <div key={loc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#111827]">{loc.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    loc.type === 'risk_zone'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : loc.type === 'school'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {loc.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{loc.description}</p>
                <div className="text-[11px] font-mono text-gray-500 mt-1">
                  Coords: {formatCoordinates(loc.lat, loc.lng)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

