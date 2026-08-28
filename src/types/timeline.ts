export type ActivityType =
  | 'FLYING'
  | 'IN_PASSENGER_VEHICLE'
  | 'IN_VEHICLE'
  | 'IN_TRAIN'
  | 'IN_BUS'
  | 'IN_TRAM'
  | 'IN_SUBWAY'
  | 'WALKING'
  | 'RUNNING'
  | 'CYCLING'
  | 'IN_FERRY'
  | 'SAILING'
  | 'BOATING'
  | 'SKIING'
  | 'MOTORCYCLING'
  | 'IN_TAXI'
  | 'UNKNOWN'

export interface GeoPoint {
  lat: number
  lng: number
  time?: number // timestamp in ms
  alt?: number  // altitude in meters or normalized
}

export interface TimelineSegment {
  id: string
  type: 'visit' | 'activity'
  startTime: number
  endTime: number
  durationMinutes: number
  
  // Activity specific
  activityType?: ActivityType
  distanceMeters: number
  startPoint?: GeoPoint
  endPoint?: GeoPoint
  path: GeoPoint[]
  
  // Visit specific
  placeName?: string
  placeId?: string
  semanticType?: string
  point?: GeoPoint
  
  // Inferred geocoding
  country?: string
  city?: string
}

export interface TripCluster {
  id: string
  title: string
  subtitle?: string
  startTime: number
  endTime: number
  totalDistanceKm: number
  segmentCount: number
  segments: TimelineSegment[]
  primaryModes: ActivityType[]
  startCity?: string
  endCity?: string
}

export interface YearSummary {
  year: number
  totalDistanceKm: number
  segmentCount: number
  flightCount: number
  countriesCount: number
}

export interface TravelStats {
  totalDistanceKm: number
  totalTravelTimeHours: number
  totalStayTimeHours: number
  totalSegments: number
  flightKm: number
  driveKm: number
  trainKm: number
  walkKm: number
  longestFlightKm: number
  flightCount: number
  driveCount: number
  trainCount: number
  walkCount: number
  countries: string[]
  cities: string[]
  modeBreakdown: Partial<Record<ActivityType, { distanceKm: number; count: number; durationHours: number }>>
}

export type GlobeTheme = 'satellite' | 'neon' | 'atlas' | 'night'
export type CameraMode = 'follow' | 'bird' | 'orbit' | 'free'
export type AspectRatioType = '9:16' | '1:1' | '16:9'

export interface ActiveJourneyState {
  currentSegment: TimelineSegment | null
  currentPosition: GeoPoint | null
  currentHeading: number // degrees (0-360)
  currentAltitude: number // 0 (ground) to 1 (high flight)
  currentSpeedKmh: number
  progress: number // 0 to 1 along filtered timeline
  timestamp: number
}
