import { ActivityType } from '../types/timeline';

/**
 * Robust coordinate parser that handles:
 * - "47.4154341°, 8.5712966°"
 * - "47.4154341, 8.5712966"
 * - latitudeE7 / longitudeE7 (e.g., 474154341 -> 47.4154341)
 * - Object formats { lat, lng } / { latitude, longitude }
 */
export function parseLatLng(raw: any): { lat: number; lng: number } | null {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const cleaned = raw.replace(/°/g, '').trim();
    const parts = cleaned.split(',').map((p) => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }

  if (typeof raw === 'object') {
    if ('latLng' in raw && typeof raw.latLng === 'string') {
      return parseLatLng(raw.latLng);
    }
    if ('latitudeE7' in raw && 'longitudeE7' in raw) {
      return {
        lat: raw.latitudeE7 / 1e7,
        lng: raw.longitudeE7 / 1e7,
      };
    }
    if ('lat' in raw && 'lng' in raw) {
      const lat = typeof raw.lat === 'number' ? raw.lat : parseFloat(raw.lat);
      const lng = typeof raw.lng === 'number' ? raw.lng : parseFloat(raw.lng);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    if ('latitude' in raw && 'longitude' in raw) {
      const lat = typeof raw.latitude === 'number' ? raw.latitude : parseFloat(raw.latitude);
      const lng = typeof raw.longitude === 'number' ? raw.longitude : parseFloat(raw.longitude);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }

  return null;
}

/**
 * Haversine formula to compute great-circle distance between two points in Kilometers
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Interpolates points along a great circle arc between (lat1, lon1) and (lat2, lon2)
 */
export function interpolateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  numPoints = 50
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  const phi1 = (lat1 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const lambda2 = (lon2 * Math.PI) / 180;

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((phi1 - phi2) / 2), 2) +
          Math.cos(phi1) * Math.cos(phi2) * Math.pow(Math.sin((lambda1 - lambda2) / 2), 2)
      )
    );

  if (d === 0 || isNaN(d)) {
    return [{ lat: lat1, lng: lon1 }, { lat: lat2, lng: lon2 }];
  }

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;
    const lng = (Math.atan2(y, x) * 180) / Math.PI;
    points.push({ lat, lng });
  }

  return points;
}

/**
 * Get distinct neon / glowing color palette for transport types
 */
export function getActivityColor(type: ActivityType | string): string {
  switch (type) {
    case 'FLYING':
      return '#38bdf8'; // Sky cyan
    case 'IN_VEHICLE':
    case 'IN_PASSENGER_VEHICLE':
    case 'IN_TAXI':
    case 'MOTORCYCLING':
      return '#fb923c'; // Vibrant amber orange
    case 'IN_TRAIN':
    case 'IN_SUBWAY':
    case 'IN_TRAM':
      return '#a855f7'; // Neon purple / violet
    case 'CYCLING':
    case 'SKATEBOARDING':
      return '#4ade80'; // Emerald green
    case 'WALKING':
    case 'RUNNING':
      return '#2dd4bf'; // Teal
    case 'IN_FERRY':
    case 'BOATING':
      return '#06b6d4'; // Deep ocean cyan
    case 'SKIING':
      return '#e0e7ff'; // Glacier ice blue
    case 'VISIT':
      return '#ec4899'; // Hot pink
    default:
      return '#818cf8'; // Indigo
  }
}

/**
 * Format activity name nicely
 */
export function formatActivityType(type: ActivityType | string): string {
  switch (type) {
    case 'FLYING':
      return 'Flight';
    case 'IN_VEHICLE':
    case 'IN_PASSENGER_VEHICLE':
      return 'Driving';
    case 'IN_TRAIN':
      return 'Train';
    case 'IN_SUBWAY':
      return 'Subway';
    case 'IN_TRAM':
      return 'Tram';
    case 'IN_BUS':
      return 'Bus';
    case 'IN_FERRY':
    case 'BOATING':
      return 'Ferry / Boat';
    case 'CYCLING':
      return 'Cycling';
    case 'WALKING':
      return 'Walking';
    case 'RUNNING':
      return 'Running';
    case 'SKIING':
      return 'Skiing';
    case 'VISIT':
      return 'Stay / Visit';
    default:
      return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

/**
 * Fast offline approximate place / region / country detector
 */
const KNOWN_HUBS = [
  { name: 'Zurich, Switzerland', country: '🇨🇭 Switzerland', lat: 47.3769, lng: 8.5417, radiusKm: 150 },
  { name: 'Geneva, Switzerland', country: '🇨🇭 Switzerland', lat: 46.2044, lng: 6.1432, radiusKm: 80 },
  { name: 'Basel, Switzerland', country: '🇨🇭 Switzerland', lat: 47.5596, lng: 7.5886, radiusKm: 60 },
  { name: 'Paris, France', country: '🇫🇷 France', lat: 48.8566, lng: 2.3522, radiusKm: 120 },
  { name: 'London, UK', country: '🇬🇧 United Kingdom', lat: 51.5074, lng: -0.1278, radiusKm: 120 },
  { name: 'Berlin, Germany', country: '🇩🇪 Germany', lat: 52.52, lng: 13.405, radiusKm: 100 },
  { name: 'Munich, Germany', country: '🇩🇪 Germany', lat: 48.1351, lng: 11.582, radiusKm: 80 },
  { name: 'Frankfurt, Germany', country: '🇩🇪 Germany', lat: 50.1109, lng: 8.6821, radiusKm: 80 },
  { name: 'Rome, Italy', country: '🇮🇹 Italy', lat: 41.9028, lng: 12.4964, radiusKm: 100 },
  { name: 'Milan, Italy', country: '🇮🇹 Italy', lat: 45.4642, lng: 9.19, radiusKm: 90 },
  { name: 'Madrid, Spain', country: '🇪🇸 Spain', lat: 40.4168, lng: -3.7038, radiusKm: 100 },
  { name: 'Barcelona, Spain', country: '🇪🇸 Spain', lat: 41.3851, lng: 2.1734, radiusKm: 80 },
  { name: 'Amsterdam, Netherlands', country: '🇳🇱 Netherlands', lat: 52.3676, lng: 4.9041, radiusKm: 80 },
  { name: 'Vienna, Austria', country: '🇦🇹 Austria', lat: 48.2082, lng: 16.3738, radiusKm: 90 },
  { name: 'Istanbul, Turkey', country: '🇹🇷 Turkey', lat: 41.0082, lng: 28.9784, radiusKm: 120 },
  { name: 'Antalya, Turkey', country: '🇹🇷 Turkey', lat: 36.8969, lng: 30.7133, radiusKm: 80 },
  { name: 'Athens, Greece', country: '🇬🇷 Greece', lat: 37.9838, lng: 23.7275, radiusKm: 80 },
  { name: 'Dubai, UAE', country: '🇦🇪 United Arab Emirates', lat: 25.2048, lng: 55.2708, radiusKm: 100 },
  { name: 'New York, USA', country: '🇺🇸 United States', lat: 40.7128, lng: -74.006, radiusKm: 150 },
  { name: 'San Francisco, USA', country: '🇺🇸 United States', lat: 37.7749, lng: -122.4194, radiusKm: 120 },
  { name: 'Los Angeles, USA', country: '🇺🇸 United States', lat: 34.0522, lng: -118.2437, radiusKm: 150 },
  { name: 'Tokyo, Japan', country: '🇯🇵 Japan', lat: 35.6762, lng: 139.6503, radiusKm: 150 },
  { name: 'Singapore', country: '🇸🇬 Singapore', lat: 1.3521, lng: 103.8198, radiusKm: 60 },
  { name: 'Sydney, Australia', country: '🇦🇺 Australia', lat: -33.8688, lng: 151.2093, radiusKm: 120 },
  { name: 'Reykjavik, Iceland', country: '🇮🇸 Iceland', lat: 64.1466, lng: -21.9426, radiusKm: 150 },
  { name: 'Oslo, Norway', country: '🇳🇴 Norway', lat: 59.9139, lng: 10.7522, radiusKm: 100 },
  { name: 'Stockholm, Sweden', country: '🇸🇪 Sweden', lat: 59.3293, lng: 18.0686, radiusKm: 100 },
  { name: 'Copenhagen, Denmark', country: '🇩🇰 Denmark', lat: 55.6761, lng: 12.5683, radiusKm: 80 },
  { name: 'Prague, Czechia', country: '🇨🇿 Czechia', lat: 50.0755, lng: 14.4378, radiusKm: 80 },
  { name: 'Lisbon, Portugal', country: '🇵🇹 Portugal', lat: 38.7223, lng: -9.1393, radiusKm: 80 },
];

export function findNearestRegion(lat: number, lng: number): { name: string; country: string } {
  let closest = KNOWN_HUBS[0];
  let minDistance = Infinity;

  for (const hub of KNOWN_HUBS) {
    const dist = haversineDistanceKm(lat, lng, hub.lat, hub.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closest = hub;
    }
  }

  if (minDistance <= closest.radiusKm) {
    return { name: closest.name, country: closest.country };
  }

  // Fallback to geographic coordinates
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return {
    name: `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lng).toFixed(2)}° ${lngDir}`,
    country: minDistance < 600 ? closest.country : '🌐 Global Location',
  };
}
