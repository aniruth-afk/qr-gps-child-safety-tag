/**
 * Geographic calculations and validation utilities for QR-GPS Child Safety Tag.
 * Uses accurate Haversine Formula and segment cross-track calculations.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two coordinates using the Haversine formula.
 * @returns Distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Evaluates whether a coordinate is inside a circular geofence safe zone.
 */
export function evaluateGeofence(
  currentLat: number,
  currentLng: number,
  centerLat: number,
  centerLng: number,
  radiusMeters: number
): { isInside: boolean; distanceMeters: number } {
  const distance = calculateHaversineDistance(currentLat, currentLng, centerLat, centerLng);
  return {
    isInside: distance <= radiusMeters,
    distanceMeters: Math.round(distance),
  };
}

/**
 * Calculates distance from a point P to a line segment AB.
 * Project P onto AB, clamped to segment ends.
 */
export function distanceToSegment(
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  // Use equirectangular planar projection for local segments (< 50 km)
  const x = toRad(pLng - aLng) * Math.cos(toRad((aLat + pLat) / 2));
  const y = toRad(pLat - aLat);

  const dx = toRad(bLng - aLng) * Math.cos(toRad((aLat + bLat) / 2));
  const dy = toRad(bLat - aLat);

  const segmentLengthSquared = dx * dx + dy * dy;

  if (segmentLengthSquared === 0) {
    return calculateHaversineDistance(pLat, pLng, aLat, aLng);
  }

  // Projection parameter t
  let t = (x * dx + y * dy) / segmentLengthSquared;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);

  return calculateHaversineDistance(pLat, pLng, projLat, projLng);
}

/**
 * Calculates shortest distance from a GPS point to an expected polyline route.
 */
export function calculateDistanceToRoute(
  lat: number,
  lng: number,
  waypoints: Array<{ lat: number; lng: number }>
): number {
  if (!waypoints || waypoints.length === 0) return 0;
  if (waypoints.length === 1) {
    return calculateHaversineDistance(lat, lng, waypoints[0].lat, waypoints[0].lng);
  }

  let minDistance = Infinity;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const dist = distanceToSegment(
      lat,
      lng,
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return Math.round(minDistance);
}

/**
 * Validates GPS coordinates range.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Evaluates freshness of timestamp.
 */
export function getLocationFreshness(timestampIso: string): {
  label: 'Fresh' | 'Recent' | 'Stale' | 'Offline';
  colorClass: string;
  minutesAgo: number;
} {
  const then = new Date(timestampIso).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.round((now - then) / 60000));

  if (diffMinutes < 3) {
    return { label: 'Fresh', colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', minutesAgo: diffMinutes };
  } else if (diffMinutes < 10) {
    return { label: 'Recent', colorClass: 'text-amber-700 bg-amber-50 border-amber-200', minutesAgo: diffMinutes };
  } else if (diffMinutes < 60) {
    return { label: 'Stale', colorClass: 'text-orange-700 bg-orange-50 border-orange-200', minutesAgo: diffMinutes };
  } else {
    return { label: 'Offline', colorClass: 'text-red-700 bg-red-50 border-red-200', minutesAgo: diffMinutes };
  }
}

/**
 * Format coordinates for display e.g. "9.925200° N, 78.119800° E"
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
}

/**
 * Generates an opaque random token for child QR tag.
 */
export function generateOpaqueToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = 'TAG-';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) token += '-';
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
