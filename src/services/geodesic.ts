import * as THREE from 'three'
import type { GeoPoint } from '../types/timeline'

const EARTH_RADIUS_KM = 6371

/**
 * Converts Latitude & Longitude (degrees) to 3D Cartesian coordinates on a sphere
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number = 100,
  altitudeOffset: number = 0
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)
  const r = radius + altitudeOffset

  const x = -(r * Math.sin(phi) * Math.cos(theta))
  const z = r * Math.sin(phi) * Math.sin(theta)
  const y = r * Math.cos(phi)

  return new THREE.Vector3(x, y, z)
}

/**
 * Converts 3D Cartesian coordinates back to Latitude & Longitude (degrees)
 */
export function vector3ToLatLng(v: THREE.Vector3): { lat: number; lng: number } {
  const normalized = v.clone().normalize()
  const phi = Math.acos(Math.max(-1, Math.min(1, normalized.y))) // 0 to PI
  const theta = Math.atan2(normalized.z, -normalized.x) // -PI to PI

  const lat = 90 - (phi * 180) / Math.PI
  let lng = (theta * 180) / Math.PI - 180
  while (lng < -180) lng += 360
  while (lng > 180) lng -= 360

  return { lat, lng }
}

/**
 * Calculates Haversine distance in kilometers between two geo points
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
 * Computes initial compass bearing / heading in degrees (0 = North, 90 = East, 180 = South, 270 = West)
 */
export function calculateBearing(from: GeoPoint, to: GeoPoint): number {
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  let brng = (Math.atan2(y, x) * 180) / Math.PI
  return (brng + 360) % 360
}

/**
 * Interpolates between two geo points along a great circle (Slerp) with optional height parabola
 */
export function interpolateGreatCircle(
  p1: GeoPoint,
  p2: GeoPoint,
  t: number,
  radius: number = 100,
  maxAltitude: number = 0
): { position: THREE.Vector3; lat: number; lng: number; altitude: number } {
  const v1 = latLngToVector3(p1.lat, p1.lng, radius).normalize()
  const v2 = latLngToVector3(p2.lat, p2.lng, radius).normalize()

  // Slerp quaternion/vector
  const dot = Math.max(-1, Math.min(1, v1.dot(v2)))
  const omega = Math.acos(dot)

  let vInterp: THREE.Vector3
  if (omega < 0.0001) {
    vInterp = v1.clone().lerp(v2, t).normalize()
  } else {
    const sinOmega = Math.sin(omega)
    const s1 = Math.sin((1 - t) * omega) / sinOmega
    const s2 = Math.sin(t * omega) / sinOmega
    vInterp = new THREE.Vector3()
      .addScaledVector(v1, s1)
      .addScaledVector(v2, s2)
      .normalize()
  }

  // Parabolic altitude curve for flight arcs: 4 * t * (1 - t)
  const arcHeight = Math.sin(t * Math.PI) * maxAltitude
  const r = radius + arcHeight
  const position = vInterp.clone().multiplyScalar(r)
  const geo = vector3ToLatLng(position)

  return {
    position,
    lat: geo.lat,
    lng: geo.lng,
    altitude: arcHeight
  }
}

/**
 * Generates smooth 3D curved line vertices for flight / ground trajectories
 */
export function createArcPoints(
  p1: GeoPoint,
  p2: GeoPoint,
  radius: number = 100,
  isFlight: boolean = false,
  segments: number = 64
): THREE.Vector3[] {
  const distanceKm = haversineDistanceKm(p1, p2)
  // Flights have altitude proportional to distance (up to 25 units above globe)
  const maxAltitude = isFlight ? Math.min(28, Math.max(4, distanceKm * 0.003)) : 0.4

  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const interp = interpolateGreatCircle(p1, p2, t, radius, maxAltitude)
    points.push(interp.position)
  }
  return points
}

/**
 * Built-in fast reverse geocoder for cities and countries (zero network latency)
 */
const CITY_DATABASE: Array<{ name: string; country: string; lat: number; lng: number }> = [
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { name: 'Basel', country: 'Switzerland', lat: 47.5596, lng: 7.5886 },
  { name: 'Bern', country: 'Switzerland', lat: 46.948, lng: 7.4474 },
  { name: 'Lucerne', country: 'Switzerland', lat: 47.0502, lng: 8.3093 },
  { name: 'Lugano', country: 'Switzerland', lat: 46.0037, lng: 8.9511 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Innsbruck', country: 'Austria', lat: 47.2692, lng: 11.4041 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3879, lng: 2.1699 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Prague', country: 'Czechia', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Antalya', country: 'Turkey', lat: 36.8969, lng: 30.7133 },
  { name: 'Izmir', country: 'Turkey', lat: 38.4237, lng: 27.1428 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 }
]

export function identifyLocation(point: GeoPoint): { city: string; country: string } {
  let closestCity = 'Unknown Place'
  let closestCountry = 'World'
  let minDistance = 150 // km threshold

  for (const item of CITY_DATABASE) {
    const dist = haversineDistanceKm(point, item)
    if (dist < minDistance) {
      minDistance = dist
      closestCity = item.name
      closestCountry = item.country
    }
  }

  // If beyond 150km of known city, use coarse country bounding estimate
  if (closestCity === 'Unknown Place') {
    if (point.lat >= 45.8 && point.lat <= 47.9 && point.lng >= 5.9 && point.lng <= 10.5) {
      closestCountry = 'Switzerland'
      closestCity = 'Swiss Region'
    } else if (point.lat >= 35.8 && point.lat <= 42.1 && point.lng >= 25.6 && point.lng <= 44.8) {
      closestCountry = 'Turkey'
      closestCity = 'Anatolia'
    } else if (point.lat >= 41.3 && point.lat <= 51.1 && point.lng >= -5.2 && point.lng <= 9.6) {
      closestCountry = 'France'
      closestCity = 'France Region'
    } else if (point.lat >= 47.2 && point.lat <= 55.1 && point.lng >= 5.8 && point.lng <= 15.0) {
      closestCountry = 'Germany'
      closestCity = 'Germany Region'
    } else if (point.lat >= 36.6 && point.lat <= 47.1 && point.lng >= 6.6 && point.lng <= 18.5) {
      closestCountry = 'Italy'
      closestCity = 'Italy Region'
    }
  }

  return { city: closestCity, country: closestCountry }
}
