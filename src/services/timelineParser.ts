import type {
  TimelineSegment,
  TripCluster,
  TravelStats,
  YearSummary
} from '../types/timeline'
import ParserWorker from '../workers/timelineParser.worker.ts?worker'

export interface ParseResult {
  segments: TimelineSegment[]
  clusters: TripCluster[]
  stats: TravelStats
  years: YearSummary[]
}

/**
 * Parses Google Location History Timeline JSON file via Web Worker
 */
export function parseTimelineFile(
  file: File,
  onProgress?: (percent: number, message: string) => void
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new ParserWorker()
    const reader = new FileReader()

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const p = Math.round((e.loaded / e.total) * 15)
        onProgress(p, `Reading ${(file.size / (1024 * 1024)).toFixed(1)} MB file...`)
      }
    }

    reader.onload = () => {
      const jsonString = reader.result as string
      worker.postMessage({ jsonString })
    }

    reader.onerror = () => {
      worker.terminate()
      reject(new Error('Failed to read file from disk'))
    }

    worker.onmessage = (e) => {
      const { type, percent, message, segments, clusters, stats, years, error } = e.data
      if (type === 'PROGRESS' && onProgress) {
        onProgress(percent, message)
      } else if (type === 'COMPLETE') {
        worker.terminate()
        resolve({ segments, clusters, stats, years })
      } else if (type === 'ERROR') {
        worker.terminate()
        reject(new Error(error || 'Worker parse error'))
      }
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }

    reader.readAsText(file)
  })
}

/**
 * Generates an authentic, rich multi-continent European & World travel dataset for instant demo
 */
export function generateSampleDataset(): ParseResult {
  const now = Date.now()
  const oneDay = 24 * 3600 * 1000

  // Waypoints for our sample tour: Zurich -> Geneva -> Paris -> London -> Rome -> Istanbul -> Ankara -> Sivas -> Erzincan -> Erzurum -> Kars -> Dubai -> Tokyo
  const sampleTripPoints = [
    { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
    { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
    { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
    { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
    { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
    { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
    { name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597 },
    { name: 'Sivas', country: 'Turkey', lat: 39.7505, lng: 37.0150 },
    { name: 'Erzincan', country: 'Turkey', lat: 39.7468, lng: 39.4911 },
    { name: 'Erzurum', country: 'Turkey', lat: 39.9043, lng: 41.2679 },
    { name: 'Kars', country: 'Turkey', lat: 40.6013, lng: 43.0975 },
    { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
    { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 }
  ]

  const segments: TimelineSegment[] = []
  let currentTime = now - 60 * oneDay

  // Create visits & inter-city flight/train/car activities
  for (let i = 0; i < sampleTripPoints.length - 1; i++) {
    const origin = sampleTripPoints[i]
    const dest = sampleTripPoints[i + 1]

    // 1. Visit origin city (2 days)
    const visitStart = currentTime
    const visitEnd = visitStart + 2 * oneDay
    segments.push({
      id: `sample-visit-${i}`,
      type: 'visit',
      startTime: visitStart,
      endTime: visitEnd,
      durationMinutes: 48 * 60,
      distanceMeters: 0,
      point: { lat: origin.lat, lng: origin.lng },
      path: [{ lat: origin.lat, lng: origin.lng }],
      placeName: `${origin.name} City Center`,
      semanticType: 'CITY_CENTER',
      city: origin.name,
      country: origin.country
    })

    // 2. Local explore walk / drive in city
    const walkStart = visitEnd
    const walkEnd = walkStart + 3 * 3600 * 1000
    segments.push({
      id: `sample-walk-${i}`,
      type: 'activity',
      startTime: walkStart,
      endTime: walkEnd,
      durationMinutes: 180,
      activityType: i % 2 === 0 ? 'WALKING' : 'CYCLING',
      distanceMeters: 8400,
      startPoint: { lat: origin.lat, lng: origin.lng },
      endPoint: { lat: origin.lat + 0.02, lng: origin.lng + 0.02 },
      path: [
        { lat: origin.lat, lng: origin.lng },
        { lat: origin.lat + 0.01, lng: origin.lng + 0.01 },
        { lat: origin.lat + 0.02, lng: origin.lng + 0.02 }
      ],
      city: origin.name,
      country: origin.country
    })

    // 3. Travel to next destination (Flight, Train or Car)
    const travelStart = walkEnd + 2 * 3600 * 1000
    const travelEnd = travelStart + 4 * 3600 * 1000

    // Dogu Express rail line across Turkey: Ankara -> Sivas -> Erzincan -> Erzurum -> Kars
    const isTurkishRail = origin.country === 'Turkey' && dest.country === 'Turkey' && origin.name !== 'Istanbul'
    const isFlight = (origin.name === 'Rome' && dest.name === 'Istanbul') || (origin.name === 'Kars' && dest.name === 'Dubai') || (origin.name === 'Dubai' && dest.name === 'Tokyo')
    const mode = isFlight ? 'FLYING' : (isTurkishRail || i === 0 ? 'IN_TRAIN' : 'IN_PASSENGER_VEHICLE')

    // Generate realistic road/rail curved waypoints
    const steps = 30
    const routePath = []
    const dLat = dest.lat - origin.lat
    const dLng = dest.lng - origin.lng
    const perpLat = -dLng * (mode === 'IN_TRAIN' ? 0.06 : 0.09)
    const perpLng = dLat * (mode === 'IN_TRAIN' ? 0.06 : 0.09)

    for (let s = 0; s <= steps; s++) {
      const frac = s / steps
      const curveSine = Math.sin(frac * Math.PI)
      const subSine = Math.sin(frac * Math.PI * 3) * 0.25
      routePath.push({
        lat: origin.lat + dLat * frac + (perpLat * curveSine) + (perpLat * subSine),
        lng: origin.lng + dLng * frac + (perpLng * curveSine) + (perpLng * subSine)
      })
    }

    segments.push({
      id: `sample-travel-${i}`,
      type: 'activity',
      startTime: travelStart,
      endTime: travelEnd,
      durationMinutes: 240,
      activityType: mode,
      distanceMeters: isFlight ? 3850000 : 350000,
      startPoint: { lat: origin.lat, lng: origin.lng },
      endPoint: { lat: dest.lat, lng: dest.lng },
      path: routePath,
      city: `${origin.name} → ${dest.name}`,
      country: dest.country
    })

    currentTime = travelEnd + 12 * 3600 * 1000
  }

  const clusters: TripCluster[] = [
    {
      id: 'cluster-grand-tour',
      title: 'Grand Europe & Asia World Journey',
      subtitle: 'Zurich → Paris → Rome → Istanbul → Tokyo',
      startTime: segments[0].startTime,
      endTime: segments[segments.length - 1].endTime,
      totalDistanceKm: 24850,
      segmentCount: segments.length,
      segments: [...segments],
      primaryModes: ['FLYING', 'IN_TRAIN', 'WALKING', 'IN_PASSENGER_VEHICLE'],
      startCity: 'Zurich',
      endCity: 'Tokyo'
    }
  ]

  const stats: TravelStats = {
    totalDistanceKm: 24850,
    totalTravelTimeHours: 64,
    totalStayTimeHours: 280,
    totalSegments: segments.length,
    flightKm: 22400,
    driveKm: 950,
    trainKm: 1420,
    walkKm: 80,
    longestFlightKm: 9600,
    flightCount: 5,
    driveCount: 4,
    trainCount: 3,
    walkCount: 8,
    countries: ['Switzerland', 'France', 'United Kingdom', 'Italy', 'Turkey', 'United Arab Emirates', 'Japan'],
    cities: ['Zurich', 'Geneva', 'Paris', 'London', 'Rome', 'Istanbul', 'Antalya', 'Dubai', 'Tokyo'],
    modeBreakdown: {
      FLYING: { distanceKm: 22400, count: 5, durationHours: 28 },
      IN_TRAIN: { distanceKm: 1420, count: 3, durationHours: 12 },
      IN_PASSENGER_VEHICLE: { distanceKm: 950, count: 4, durationHours: 14 },
      WALKING: { distanceKm: 80, count: 8, durationHours: 10 }
    }
  }

  const currentYear = new Date().getFullYear()
  const years: YearSummary[] = [
    { year: currentYear, totalDistanceKm: 24850, segmentCount: segments.length, flightCount: 5, countriesCount: 7 }
  ]

  return { segments, clusters, stats, years }
}
