import * as THREE from 'three'
import type { GeoPoint } from '../types/timeline'

const EARTH_RADIUS_KM = 6371

/**
 * Converts lat/lng coordinates to a 3D Cartesian vector on a sphere of given radius.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 100,
  altitude: number = 0
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  const r = radius + altitude

  const x = -(r * Math.sin(phi) * Math.cos(theta))
  const z = r * Math.sin(phi) * Math.sin(theta)
  const y = r * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

/**
 * Creates 3D curved arc points between two coordinates on a sphere.
 */
export function createArcPoints(
  p1: GeoPoint,
  p2: GeoPoint,
  radius: number = 100,
  maxAltitude: number | boolean = 25,
  steps: number = 50
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const altKm = typeof maxAltitude === 'boolean' ? (maxAltitude ? 25 : 0) : maxAltitude
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps
    const interp = interpolateFlightPoint(p1, p2, frac, altKm)
    points.push(latLngToVector3(interp.lat, interp.lng, radius, interp.altitudeKm))
  }
  return points
}

/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
 */
export function haversineDistanceKm(p1: GeoPoint, p2: GeoPoint): number {
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180

  const lat1 = (p1.lat * Math.PI) / 180
  const lat2 = (p2.lat * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/**
 * Calculates compass bearing (heading in degrees from 0 to 360) from p1 to p2.
 */
export function calculateBearing(p1: GeoPoint, p2: GeoPoint): number {
  const lat1 = (p1.lat * Math.PI) / 180
  const lat2 = (p2.lat * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  const brng = (Math.atan2(y, x) * 180) / Math.PI
  return (brng + 360) % 360
}

/**
 * Interpolates between two points on a great circle with a parabolic flight altitude arch.
 */
export function interpolateFlightPoint(
  p1: GeoPoint,
  p2: GeoPoint,
  fraction: number,
  maxAltitudeKm: number = 10
): GeoPoint & { altitudeKm: number } {
  const f = Math.max(0, Math.min(1, fraction))

  const lat1 = (p1.lat * Math.PI) / 180
  const lng1 = (p1.lng * Math.PI) / 180
  const lat2 = (p2.lat * Math.PI) / 180
  const lng2 = (p2.lng * Math.PI) / 180

  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng1 - lng2) / 2), 2)
    )
  )

  if (d === 0) {
    return { lat: p1.lat, lng: p1.lng, altitudeKm: 0 }
  }

  const A = Math.sin((1 - f) * d) / Math.sin(d)
  const B = Math.sin(f * d) / Math.sin(d)

  const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
  const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
  const z = A * Math.sin(lat1) + B * Math.sin(lat2)

  const lat = (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI
  const lng = (Math.atan2(y, x) * 180) / Math.PI

  // Parabolic altitude arch: 4 * h * f * (1 - f)
  const altitudeKm = maxAltitudeKm * (4 * f * (1 - f))

  return { lat, lng, altitudeKm }
}

/**
 * High-precision offline City & Province Database
 */
export const CITY_DATABASE: { name: string; country: string; lat: number; lng: number }[] = [
  // Turkey (Eastern, Central, Western & Coastal Provinces)
  { name: 'Sivas', country: 'Turkey', lat: 39.7505, lng: 37.0150 },
  { name: 'Erzincan', country: 'Turkey', lat: 39.7468, lng: 39.4911 },
  { name: 'Erzurum', country: 'Turkey', lat: 39.9043, lng: 41.2679 },
  { name: 'Kars', country: 'Turkey', lat: 40.6013, lng: 43.0975 },
  { name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Izmir', country: 'Turkey', lat: 38.4237, lng: 27.1428 },
  { name: 'Antalya', country: 'Turkey', lat: 36.8969, lng: 30.7133 },
  { name: 'Kayseri', country: 'Turkey', lat: 38.7205, lng: 35.4826 },
  { name: 'Trabzon', country: 'Turkey', lat: 41.0027, lng: 39.7168 },
  { name: 'Rize', country: 'Turkey', lat: 41.0201, lng: 40.5234 },
  { name: 'Artvin', country: 'Turkey', lat: 41.1828, lng: 41.8183 },
  { name: 'Ardahan', country: 'Turkey', lat: 41.1105, lng: 42.7022 },
  { name: 'Agri', country: 'Turkey', lat: 39.7191, lng: 43.0503 },
  { name: 'Igdir', country: 'Turkey', lat: 39.9237, lng: 44.0450 },
  { name: 'Van', country: 'Turkey', lat: 38.5012, lng: 43.3730 },
  { name: 'Malatya', country: 'Turkey', lat: 38.3552, lng: 38.3095 },
  { name: 'Elazig', country: 'Turkey', lat: 38.6810, lng: 39.2264 },
  { name: 'Diyarbakir', country: 'Turkey', lat: 37.9144, lng: 40.2306 },
  { name: 'Gaziantep', country: 'Turkey', lat: 37.0662, lng: 37.3833 },
  { name: 'Sanliurfa', country: 'Turkey', lat: 37.1674, lng: 38.7955 },
  { name: 'Mardin', country: 'Turkey', lat: 37.3212, lng: 40.7245 },
  { name: 'Batman', country: 'Turkey', lat: 37.8812, lng: 41.1294 },
  { name: 'Mus', country: 'Turkey', lat: 38.7432, lng: 41.5064 },
  { name: 'Bingol', country: 'Turkey', lat: 38.8854, lng: 40.4983 },
  { name: 'Tunceli', country: 'Turkey', lat: 39.1080, lng: 39.5401 },
  { name: 'Bayburt', country: 'Turkey', lat: 40.2552, lng: 40.2249 },
  { name: 'Gumushane', country: 'Turkey', lat: 40.4600, lng: 39.4814 },
  { name: 'Giresun', country: 'Turkey', lat: 40.9128, lng: 38.3895 },
  { name: 'Ordu', country: 'Turkey', lat: 40.9839, lng: 37.8764 },
  { name: 'Samsun', country: 'Turkey', lat: 41.2867, lng: 36.3300 },
  { name: 'Tokat', country: 'Turkey', lat: 40.3167, lng: 36.5500 },
  { name: 'Amasya', country: 'Turkey', lat: 40.6533, lng: 35.8331 },
  { name: 'Corum', country: 'Turkey', lat: 40.5506, lng: 34.9556 },
  { name: 'Yozgat', country: 'Turkey', lat: 39.8181, lng: 34.8147 },
  { name: 'Kirsehir', country: 'Turkey', lat: 39.1425, lng: 34.1709 },
  { name: 'Nevsehir', country: 'Turkey', lat: 38.6244, lng: 34.7142 },
  { name: 'Nigde', country: 'Turkey', lat: 37.9667, lng: 34.6833 },
  { name: 'Aksaray', country: 'Turkey', lat: 38.3687, lng: 34.0370 },
  { name: 'Konya', country: 'Turkey', lat: 37.8746, lng: 32.4932 },
  { name: 'Karaman', country: 'Turkey', lat: 37.1759, lng: 33.2287 },
  { name: 'Eskisehir', country: 'Turkey', lat: 39.7767, lng: 30.5206 },
  { name: 'Bursa', country: 'Turkey', lat: 40.1885, lng: 29.0610 },
  { name: 'Kocaeli', country: 'Turkey', lat: 40.7654, lng: 29.9408 },
  { name: 'Sakarya', country: 'Turkey', lat: 40.7731, lng: 30.4043 },
  { name: 'Bolu', country: 'Turkey', lat: 40.7358, lng: 31.6061 },
  { name: 'Duzce', country: 'Turkey', lat: 40.8438, lng: 31.1565 },
  { name: 'Zonguldak', country: 'Turkey', lat: 41.4564, lng: 31.7987 },
  { name: 'Karabuk', country: 'Turkey', lat: 41.2061, lng: 32.6204 },
  { name: 'Bartin', country: 'Turkey', lat: 41.6344, lng: 32.3375 },
  { name: 'Kastamonu', country: 'Turkey', lat: 41.3887, lng: 33.7827 },
  { name: 'Cankiri', country: 'Turkey', lat: 40.6013, lng: 33.6134 },
  { name: 'Sinop', country: 'Turkey', lat: 42.0231, lng: 35.1531 },
  { name: 'Adana', country: 'Turkey', lat: 37.0000, lng: 35.3213 },
  { name: 'Mersin', country: 'Turkey', lat: 36.8121, lng: 34.6415 },
  { name: 'Osmaniye', country: 'Turkey', lat: 37.0742, lng: 36.2478 },
  { name: 'Kahramanmaras', country: 'Turkey', lat: 37.5858, lng: 36.9371 },
  { name: 'Hatay', country: 'Turkey', lat: 36.2023, lng: 36.1613 },
  { name: 'Mugla', country: 'Turkey', lat: 37.2153, lng: 28.3636 },
  { name: 'Bodrum', country: 'Turkey', lat: 37.0344, lng: 27.4305 },
  { name: 'Fethiye', country: 'Turkey', lat: 36.6593, lng: 29.1263 },
  { name: 'Marmaris', country: 'Turkey', lat: 36.8550, lng: 28.2742 },
  { name: 'Aydin', country: 'Turkey', lat: 37.8560, lng: 27.8416 },
  { name: 'Kusadasi', country: 'Turkey', lat: 37.8579, lng: 27.2610 },
  { name: 'Denizli', country: 'Turkey', lat: 37.7765, lng: 29.0864 },
  { name: 'Manisa', country: 'Turkey', lat: 38.6191, lng: 27.4289 },
  { name: 'Usak', country: 'Turkey', lat: 38.6823, lng: 29.4082 },
  { name: 'Afyonkarahisar', country: 'Turkey', lat: 38.7507, lng: 30.5567 },
  { name: 'Kutahya', country: 'Turkey', lat: 39.4167, lng: 29.9833 },
  { name: 'Bilecik', country: 'Turkey', lat: 40.1451, lng: 29.9799 },
  { name: 'Yalova', country: 'Turkey', lat: 40.6500, lng: 29.2667 },
  { name: 'Balikesir', country: 'Turkey', lat: 39.6484, lng: 27.8826 },
  { name: 'Canakkale', country: 'Turkey', lat: 40.1553, lng: 26.4142 },
  { name: 'Edirne', country: 'Turkey', lat: 41.6772, lng: 26.5557 },
  { name: 'Tekirdag', country: 'Turkey', lat: 40.9780, lng: 27.5110 },
  { name: 'Kirklareli', country: 'Turkey', lat: 41.7333, lng: 27.2167 },
  { name: 'Isparta', country: 'Turkey', lat: 37.7648, lng: 30.5566 },
  { name: 'Burdur', country: 'Turkey', lat: 37.7203, lng: 30.2908 },

  // Switzerland (All Cantons & Major Hubs)
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { name: 'Basel', country: 'Switzerland', lat: 47.5596, lng: 7.5886 },
  { name: 'Bern', country: 'Switzerland', lat: 46.948, lng: 7.4474 },
  { name: 'Lausanne', country: 'Switzerland', lat: 46.5197, lng: 6.6323 },
  { name: 'Lucerne', country: 'Switzerland', lat: 47.0502, lng: 8.3093 },
  { name: 'St. Gallen', country: 'Switzerland', lat: 47.4245, lng: 9.3767 },
  { name: 'Lugano', country: 'Switzerland', lat: 46.0037, lng: 8.9511 },
  { name: 'Winterthur', country: 'Switzerland', lat: 47.4984, lng: 8.7299 },
  { name: 'Zermatt', country: 'Switzerland', lat: 45.9765, lng: 7.7491 },
  { name: 'Interlaken', country: 'Switzerland', lat: 46.6863, lng: 7.8632 },
  { name: 'Chur', country: 'Switzerland', lat: 46.8508, lng: 9.5319 },
  { name: 'Sion', country: 'Switzerland', lat: 46.2294, lng: 7.3589 },
  { name: 'Neuchatel', country: 'Switzerland', lat: 46.9899, lng: 6.9293 },
  { name: 'Fribourg', country: 'Switzerland', lat: 46.8065, lng: 7.1619 },
  { name: 'Biel', country: 'Switzerland', lat: 47.1368, lng: 7.2468 },
  { name: 'Bellinzona', country: 'Switzerland', lat: 46.1950, lng: 9.0232 },
  { name: 'Davos', country: 'Switzerland', lat: 46.8027, lng: 9.8360 },
  { name: 'Montreux', country: 'Switzerland', lat: 46.4312, lng: 6.9107 },

  // Europe & World
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Nice', country: 'France', lat: 43.7102, lng: 7.2620 },
  { name: 'Lyon', country: 'France', lat: 45.7640, lng: 4.8357 },
  { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lng: -3.1883 },
  { name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821 },
  { name: 'Hamburg', country: 'Germany', lat: 53.5511, lng: 9.9937 },
  { name: 'Cologne', country: 'Germany', lat: 50.9375, lng: 6.9603 },
  { name: 'Stuttgart', country: 'Germany', lat: 48.7758, lng: 9.1829 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { name: 'Florence', country: 'Italy', lat: 43.7696, lng: 11.2558 },
  { name: 'Naples', country: 'Italy', lat: 40.8518, lng: 14.2681 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Salzburg', country: 'Austria', lat: 47.8095, lng: 13.0550 },
  { name: 'Innsbruck', country: 'Austria', lat: 47.2692, lng: 11.4041 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3879, lng: 2.1699 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Valencia', country: 'Spain', lat: 39.4699, lng: -0.3763 },
  { name: 'Seville', country: 'Spain', lat: 37.3891, lng: -5.9845 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Prague', country: 'Czechia', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Krakow', country: 'Poland', lat: 50.0647, lng: 19.9450 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Thessaloniki', country: 'Greece', lat: 40.6401, lng: 22.9444 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Porto', country: 'Portugal', lat: 41.1579, lng: -8.6291 },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522 },
  { name: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.5310 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Kyoto', country: 'Japan', lat: 35.0116, lng: 135.7681 },
  { name: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 }
]

/**
 * Identifies the exact closest city and country for any geographic point.
 */
export function identifyLocation(point: GeoPoint): { city: string; country: string } {
  let closestCity = 'Unknown Place'
  let closestCountry = 'World'
  let minDistance = Infinity

  for (const item of CITY_DATABASE) {
    const dist = haversineDistanceKm(point, item)
    if (dist < minDistance) {
      minDistance = dist
      closestCity = item.name
      closestCountry = item.country
    }
  }

  // If within 180km of the closest city, use that exact city name!
  if (minDistance <= 180) {
    return { city: closestCity, country: closestCountry }
  }

  // Country bounding box checks if in an isolated region
  if (point.lat >= 35.8 && point.lat <= 42.2 && point.lng >= 25.5 && point.lng <= 44.8) {
    return { city: closestCity, country: 'Turkey' }
  }
  if (point.lat >= 45.8 && point.lat <= 47.9 && point.lng >= 5.9 && point.lng <= 10.5) {
    return { city: closestCity, country: 'Switzerland' }
  }

  return { city: closestCity, country: closestCountry }
}
