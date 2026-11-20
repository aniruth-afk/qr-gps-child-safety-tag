import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RouteWaypoint, SafeZone, ReferenceLocation } from '../../types';

interface SafetyMapProps {
  currentLat: number;
  currentLng: number;
  childName: string;
  isSimulated?: boolean;
  safeZone?: SafeZone;
  waypoints?: RouteWaypoint[];
  riskZones?: ReferenceLocation[];
  historyPoints?: Array<{ lat: number; lng: number; timestamp: string }>;
  showHistoryPath?: boolean;
  accuracyMeters?: number;
  onMapClick?: (lat: number, lng: number) => void;
  heightClass?: string;
}

export const SafetyMap: React.FC<SafetyMapProps> = ({
  currentLat,
  currentLng,
  childName,
  isSimulated = false,
  safeZone,
  waypoints = [],
  riskZones = [],
  historyPoints = [],
  showHistoryPath = false,
  accuracyMeters = 8,
  onMapClick,
  heightClass = 'h-[440px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 16,
        zoomControl: true,
      });

      // Standard OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Student Project IoT Child Safety',
        maxZoom: 19,
      }).addTo(map);

      const layersGroup = L.layerGroup().addTo(map);
      layersGroupRef.current = layersGroup;
      mapInstanceRef.current = map;

      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    return () => {
      // Map cleanup will be handled if component completely unmounts
    };
  }, []);

  // Update layers whenever coordinates or configuration change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layers = layersGroupRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    // 1. Accuracy circle
    if (accuracyMeters > 0) {
      L.circle([currentLat, currentLng], {
        radius: accuracyMeters,
        color: '#3B82F6',
        fillColor: '#93C5FD',
        fillOpacity: 0.2,
        weight: 1,
        dashArray: '3, 3',
      }).addTo(layers);
    }

    // 2. Safe Zone Circle
    if (safeZone && safeZone.isActive) {
      const isBreached = false; // Evaluated by caller if needed
      L.circle([safeZone.centerLat, safeZone.centerLng], {
        radius: safeZone.radiusMeters,
        color: '#10B981',
        fillColor: '#A7F3D0',
        fillOpacity: 0.15,
        weight: 2,
      })
        .bindTooltip(`<b>Safe Zone:</b> ${safeZone.name} (${safeZone.radiusMeters}m radius)`, {
          permanent: false,
          direction: 'top',
        })
        .addTo(layers);

      // Safe Zone Center Pin
      const safeZoneCenterIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="background-color: #10B981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
            SZ
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      L.marker([safeZone.centerLat, safeZone.centerLng], { icon: safeZoneCenterIcon })
        .bindPopup(`<b>${safeZone.name}</b><br>Center Lat: ${safeZone.centerLat.toFixed(5)}<br>Center Lng: ${safeZone.centerLng.toFixed(5)}<br>Radius: ${safeZone.radiusMeters}m`)
        .addTo(layers);
    }

    // 3. Expected Route & Waypoints
    if (waypoints && waypoints.length > 0) {
      const latlngs: [number, number][] = waypoints
        .sort((a, b) => a.order - b.order)
        .map((wp) => [wp.lat, wp.lng]);

      // Route polyline
      L.polyline(latlngs, {
        color: '#3B82F6',
        weight: 4,
        dashArray: '6, 6',
        opacity: 0.85,
      }).addTo(layers);

      // Waypoint Markers
      waypoints.forEach((wp, idx) => {
        const wpIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="background-color: #1E40AF; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid white;">
              ${wp.order || idx + 1}
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        L.marker([wp.lat, wp.lng], { icon: wpIcon })
          .bindPopup(`<b>Waypoint ${wp.order}:</b> ${wp.name}<br>Lat: ${wp.lat.toFixed(5)}, Lng: ${wp.lng.toFixed(5)}`)
          .addTo(layers);
      });
    }

    // 4. Civil Engineering Risk Zones
    if (riskZones && riskZones.length > 0) {
      riskZones.forEach((rz) => {
        const rzIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="background-color: #DC2626; color: white; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; border: 2px solid white;">
              ⚠️
            </div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        L.marker([rz.lat, rz.lng], { icon: rzIcon })
          .bindPopup(`<b>RISK ZONE: ${rz.name}</b><br>${rz.description}<br><span style="color: #DC2626; font-size: 11px; font-weight: bold;">Civil Engineering Hazard Alert</span>`)
          .addTo(layers);

        // Warning circle around risk zone
        L.circle([rz.lat, rz.lng], {
          radius: 120,
          color: '#DC2626',
          fillColor: '#FEE2E2',
          fillOpacity: 0.2,
          weight: 1.5,
          dashArray: '4, 4',
        }).addTo(layers);
      });
    }

    // 5. History Path (if enabled)
    if (showHistoryPath && historyPoints.length > 1) {
      const histCoords: [number, number][] = historyPoints.map((p) => [p.lat, p.lng]);
      L.polyline(histCoords, {
        color: '#6B7280',
        weight: 3,
        opacity: 0.6,
      }).addTo(layers);

      historyPoints.forEach((hp, idx) => {
        if (idx % 2 === 0 || idx === historyPoints.length - 1) {
          const histDot = L.circleMarker([hp.lat, hp.lng], {
            radius: 4,
            color: '#4B5563',
            fillColor: '#9CA3AF',
            fillOpacity: 0.8,
            weight: 1,
          });
          histDot.bindTooltip(`Time: ${new Date(hp.timestamp).toLocaleTimeString()}`);
          histDot.addTo(layers);
        }
      });
    }

    // 6. Current Child Live Marker
    const childMarkerIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position: relative; width: 36px; height: 36px;">
          <div style="position: absolute; inset: 0; background-color: #3B82F6; opacity: 0.3; border-radius: 50%; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; inset: 4px; background-color: #2563EB; border: 3px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px; font-weight: bold;">
            🧒
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    const childMarker = L.marker([currentLat, currentLng], { icon: childMarkerIcon }).addTo(layers);
    childMarker.bindPopup(`
      <div style="font-family: Outfit, sans-serif; min-width: 180px;">
        <div style="font-weight: 700; font-size: 14px; color: #111827; margin-bottom: 4px;">${childName}</div>
        <div style="font-size: 12px; color: #4B5563; margin-bottom: 2px;">
          <b>Lat:</b> ${currentLat.toFixed(6)}°
        </div>
        <div style="font-size: 12px; color: #4B5563; margin-bottom: 6px;">
          <b>Lng:</b> ${currentLng.toFixed(6)}°
        </div>
        <div style="display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; ${
          isSimulated
            ? 'background-color: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;'
            : 'background-color: #D1FAE5; color: #065F46; border: 1px solid #A7F3D0;'
        }">
          ${isSimulated ? 'Simulated Coordinates' : 'Live ESP32 Hardware Fix'}
        </div>
      </div>
    `);

    // Center map smoothly on coordinate update
    map.panTo([currentLat, currentLng], { animate: true, duration: 0.6 });
  }, [currentLat, currentLng, childName, isSimulated, safeZone, waypoints, riskZones, historyPoints, showHistoryPath, accuracyMeters]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([currentLat, currentLng], 16);
    }
  };

  return (
    <div className="relative w-full rounded-lg border border-[#E5E7EB] overflow-hidden bg-[#F3F4F6]">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

      {/* Map Overlay Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        <button
          onClick={handleRecenter}
          className="bg-white hover:bg-[#F3F4F6] text-[#111827] text-xs font-semibold px-3 py-2 rounded-md border border-[#E5E7EB] shadow-none transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Recenter map on child's current GPS coordinates"
        >
          <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Recenter
        </button>
      </div>

      {/* Map Legend Bar */}
      <div className="absolute bottom-2 left-2 right-2 z-[1000] bg-white/95 backdrop-blur-none border border-[#E5E7EB] rounded-md px-3 py-1.5 flex flex-wrap items-center justify-between text-xs text-[#111827]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
            Current Child GPS
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
            Safe Zone Boundary
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-blue-600 inline-block"></span>
            Expected Route
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block"></span>
            Civil Eng Risk Zone
          </span>
        </div>
        <div className="text-[11px] font-medium text-gray-500">
          OSM Leaflet Engine
        </div>
      </div>
    </div>
  );
};
