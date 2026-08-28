import type {
  TimelineSegment,
  TripCluster,
  TravelStats,
  ActivityType,
  GeoPoint,
  YearSummary
} from '../types/timeline'
import { haversineDistanceKm, identifyLocation } from '../services/geodesic'

// Helper to parse coordinate strings: "47.4154341°, 8.5712966°" or "47.4154, 8.5712"
function parseCoord(str: string | undefined): GeoPoint | undefined {
  if (!str || typeof str !== 'string') return undefined
  const cleaned = str.replace(/°/g, '').trim()
  const parts = cleaned.split(',')
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0].trim())
    const lng = parseFloat(parts[1].trim())
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng }
    }
  }
  return undefined
}

function normalizeActivityType(rawType?: string): ActivityType {
  if (!rawType) return 'UNKNOWN'
  const t = rawType.toUpperCase()
  if (t.includes('FLY')) return 'FLYING'
  if (t.includes('PASSENGER_VEHICLE') || t.includes('IN_VEHICLE') || t.includes('DRIVE') || t.includes('CAR')) return 'IN_PASSENGER_VEHICLE'
  if (t.includes('TRAIN')) return 'IN_TRAIN'
  if (t.includes('TRAM')) return 'IN_TRAM'
  if (t.includes('SUBWAY')) return 'IN_SUBWAY'
  if (t.includes('BUS')) return 'IN_BUS'
  if (t.includes('WALK')) return 'WALKING'
  if (t.includes('RUN')) return 'RUNNING'
  if (t.includes('CYCLE') || t.includes('BIKE')) return 'CYCLING'
  if (t.includes('FERRY')) return 'IN_FERRY'
  if (t.includes('SAIL') || t.includes('BOAT')) return 'SAILING'
  if (t.includes('SKI')) return 'SKIING'
  if (t.includes('MOTORCYCLE')) return 'MOTORCYCLING'
  return 'UNKNOWN'
}

self.onmessage = async (e: MessageEvent) => {
  const { jsonString } = e.data
  try {
    self.postMessage({ type: 'PROGRESS', percent: 10, message: 'Parsing JSON data...' })
    
    const parsed = JSON.parse(jsonString)
    const rawSegments = parsed.semanticSegments || parsed.timelineObjects || []
    const totalRaw = rawSegments.length

    if (totalRaw === 0) {
      throw new Error('No semanticSegments or timelineObjects found in JSON.')
    }

    self.postMessage({ type: 'PROGRESS', percent: 25, message: `Processing ${totalRaw.toLocaleString()} segments...` })

    const segments: TimelineSegment[] = []
    const countriesSet = new Set<string>()
    const citiesSet = new Set<string>()
    const modeStats: Record<string, { distanceKm: number; count: number; durationHours: number }> = {}
    const yearSummariesMap: Record<number, YearSummary> = {}

    let totalDistKm = 0
    let totalTravelHours = 0
    let totalStayHours = 0
    let longestFlight = 0
    let flights = 0
    let drives = 0
    let trains = 0
    let walks = 0

    // Process each segment
    for (let i = 0; i < totalRaw; i++) {
      const raw = rawSegments[i]
      const startTime = raw.startTime ? new Date(raw.startTime).getTime() : 0
      const endTime = raw.endTime ? new Date(raw.endTime).getTime() : startTime
      const durationMin = Math.max(1, Math.round((endTime - startTime) / 60000))
      const durationHours = durationMin / 60
      const year = startTime > 0 ? new Date(startTime).getFullYear() : 2024

      if (!yearSummariesMap[year]) {
        yearSummariesMap[year] = {
          year,
          totalDistanceKm: 0,
          segmentCount: 0,
          flightCount: 0,
          countriesCount: 0
        }
      }
      yearSummariesMap[year].segmentCount++

      if (raw.visit) {
        const placeLoc = raw.visit.topCandidate?.placeLocation
        const point = parseCoord(placeLoc?.latLng)
        if (point) {
          const locInfo = identifyLocation(point)
          if (locInfo.country && locInfo.country !== 'World') countriesSet.add(locInfo.country)
          if (locInfo.city && locInfo.city !== 'Unknown Place') citiesSet.add(locInfo.city)

          totalStayHours += durationHours

          segments.push({
            id: `visit-${i}`,
            type: 'visit',
            startTime,
            endTime,
            durationMinutes: durationMin,
            distanceMeters: 0,
            point,
            path: [point],
            placeName: raw.visit.topCandidate?.placeId || 'Visited Location',
            semanticType: raw.visit.topCandidate?.semanticType || 'VISIT',
            country: locInfo.country,
            city: locInfo.city
          })
        }
      } else if (raw.activity) {
        const startPoint = parseCoord(raw.activity.start?.latLng)
        const endPoint = parseCoord(raw.activity.end?.latLng)
        const rawType = raw.activity.topCandidate?.type
        const activityType = normalizeActivityType(rawType)

        let path: GeoPoint[] = []
        if (raw.timelinePath && Array.isArray(raw.timelinePath)) {
          for (const tp of raw.timelinePath) {
            const p = parseCoord(tp.point)
            if (p) {
              if (tp.time) p.time = new Date(tp.time).getTime()
              path.push(p)
            }
          }
        }

        if (path.length === 0 && startPoint && endPoint) {
          path = [startPoint, endPoint]
        } else if (path.length === 0 && startPoint) {
          path = [startPoint]
        }

        let distMeters = raw.activity.distanceMeters || 0
        if (distMeters === 0 && startPoint && endPoint) {
          distMeters = haversineDistanceKm(startPoint, endPoint) * 1000
        }
        const distKm = distMeters / 1000

        totalDistKm += distKm
        totalTravelHours += durationHours
        yearSummariesMap[year].totalDistanceKm += distKm

        if (activityType === 'FLYING') {
          flights++
          yearSummariesMap[year].flightCount++
          if (distKm > longestFlight) longestFlight = distKm
        } else if (activityType === 'IN_PASSENGER_VEHICLE' || activityType === 'IN_VEHICLE') {
          drives++
        } else if (activityType === 'IN_TRAIN' || activityType === 'IN_TRAM' || activityType === 'IN_SUBWAY') {
          trains++
        } else if (activityType === 'WALKING' || activityType === 'RUNNING') {
          walks++
        }

        if (!modeStats[activityType]) {
          modeStats[activityType] = { distanceKm: 0, count: 0, durationHours: 0 }
        }
        modeStats[activityType].distanceKm += distKm
        modeStats[activityType].count++
        modeStats[activityType].durationHours += durationHours

        const refPoint = startPoint || (path.length > 0 ? path[0] : undefined)
        let locInfo = { city: 'Journey', country: 'World' }
        if (refPoint) {
          locInfo = identifyLocation(refPoint)
          if (locInfo.country && locInfo.country !== 'World') countriesSet.add(locInfo.country)
        }

        segments.push({
          id: `activity-${i}`,
          type: 'activity',
          startTime,
          endTime,
          durationMinutes: durationMin,
          activityType,
          distanceMeters: distMeters,
          startPoint: startPoint || path[0],
          endPoint: endPoint || path[path.length - 1],
          path,
          country: locInfo.country,
          city: locInfo.city
        })
      }

      if (i % 8000 === 0 && i > 0) {
        const p = 25 + Math.floor((i / totalRaw) * 50)
        self.postMessage({ type: 'PROGRESS', percent: p, message: `Parsed ${i.toLocaleString()} / ${totalRaw.toLocaleString()} items...` })
      }
    }

    self.postMessage({ type: 'PROGRESS', percent: 80, message: 'Clustering trips and journeys...' })

    // Sort chronologically
    segments.sort((a, b) => a.startTime - b.startTime)

    // Cluster significant trips (clusters where distance > 60km or flights occurred)
    const clusters: TripCluster[] = []
    let currentClusterSegments: TimelineSegment[] = []
    let currentClusterDist = 0

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      currentClusterSegments.push(seg)
      if (seg.distanceMeters) currentClusterDist += seg.distanceMeters / 1000

      const isBreak =
        i === segments.length - 1 ||
        (segments[i + 1].startTime - seg.endTime > 36 * 3600 * 1000) || // >36h idle gap
        (currentClusterSegments.length >= 60 && currentClusterDist > 100)

      if (isBreak && currentClusterSegments.length > 0) {
        const startSeg = currentClusterSegments[0]
        const endSeg = currentClusterSegments[currentClusterSegments.length - 1]
        const startCity = startSeg.city || 'Departure'
        const endCity = endSeg.city || startCity

        const primaryModes = Array.from(
          new Set(
            currentClusterSegments
              .filter(s => s.activityType)
              .map(s => s.activityType as ActivityType)
          )
        )

        const title =
          startCity !== endCity && endCity !== 'Unknown Place'
            ? `${startCity} → ${endCity}`
            : `${startCity || 'Trip'} Journey`

        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          title,
          subtitle: `${new Date(startSeg.startTime).toLocaleDateString()} — ${Math.round(currentClusterDist).toLocaleString()} km`,
          startTime: startSeg.startTime,
          endTime: endSeg.endTime,
          totalDistanceKm: currentClusterDist,
          segmentCount: currentClusterSegments.length,
          segments: currentClusterSegments,
          primaryModes,
          startCity,
          endCity
        })

        currentClusterSegments = []
        currentClusterDist = 0
      }
    }

    const stats: TravelStats = {
      totalDistanceKm: Math.round(totalDistKm),
      totalTravelTimeHours: Math.round(totalTravelHours),
      totalStayTimeHours: Math.round(totalStayHours),
      totalSegments: segments.length,
      flightKm: Math.round(modeStats['FLYING']?.distanceKm || 0),
      driveKm: Math.round(modeStats['IN_PASSENGER_VEHICLE']?.distanceKm || 0),
      trainKm: Math.round((modeStats['IN_TRAIN']?.distanceKm || 0) + (modeStats['IN_TRAM']?.distanceKm || 0)),
      walkKm: Math.round(modeStats['WALKING']?.distanceKm || 0),
      longestFlightKm: Math.round(longestFlight),
      flightCount: flights,
      driveCount: drives,
      trainCount: trains,
      walkCount: walks,
      countries: Array.from(countriesSet),
      cities: Array.from(citiesSet),
      modeBreakdown: modeStats
    }

    const years = Object.values(yearSummariesMap).sort((a, b) => b.year - a.year)

    self.postMessage({ type: 'PROGRESS', percent: 100, message: 'Done!' })
    self.postMessage({
      type: 'COMPLETE',
      segments,
      clusters,
      stats,
      years
    })
  } catch (err: any) {
    self.postMessage({
      type: 'ERROR',
      error: err?.message || 'Failed to parse JSON file'
    })
  }
}
