import { defineStore } from 'pinia'
import type {
  TimelineSegment,
  TripCluster,
  TravelStats,
  YearSummary,
  GlobeTheme,
  CameraMode,
  ActiveJourneyState,
  ActivityType,
  ActionFilters,
  CityDetail,
  GeoPoint,
  MapLayerType
} from '../types/timeline'
import { calculateBearing, haversineDistanceKm } from '../services/geodesic'
import { generateSampleDataset } from '../services/timelineParser'

export const useTimelineStore = defineStore('timeline', {
  state: () => ({
    // Raw Data
    segments: [] as TimelineSegment[],
    clusters: [] as TripCluster[],
    stats: null as TravelStats | null,
    years: [] as YearSummary[],
    isLoading: false,
    loadingProgress: 0,
    loadingMessage: '',
    hasLoadedData: false,

    // Map & Layer Config
    mapLayer: 'satellite' as MapLayerType,
    globeTheme: 'satellite' as GlobeTheme,
    cameraMode: 'follow' as CameraMode,
    is3DRealisticGlobe: true,
    showAtmosphereGlow: true,
    showClouds: true,
    autoRotateGlobe: false,

    // Action Filters (Hide/Show specific activities)
    actionFilters: {
      showFlights: true,
      showDrives: true,
      showTrains: true,
      showWalks: true,
      showVisits: true,
      onlyVisitedCities: false
    } as ActionFilters,

    // Date Filters
    selectedYear: null as number | null,
    selectedClusterId: null as string | null,
    startDate: null as string | null, // YYYY-MM-DD
    endDate: null as string | null,   // YYYY-MM-DD
    customTimeRange: null as [number, number] | null,

    // City Deep-Dive Drilldown
    selectedCity: null as string | null,
    isCityDrawerOpen: false,

    // Trip Overview Drawer
    isOverviewOpen: false,

    // Segment Activity Correction
    editingSegment: null as TimelineSegment | null,
    isSegmentEditOpen: false,

    // Playback Engine
    isPlaying: false,
    playbackSpeed: 10,
    playbackIndex: 0,
    playbackSegmentProgress: 0,
    activeJourneyState: {
      currentSegment: null,
      currentPosition: null,
      currentHeading: 0,
      currentAltitude: 0,
      currentSpeedKmh: 0,
      progress: 0,
      timestamp: 0
    } as ActiveJourneyState,

    // UI state
    isStatsOpen: false,
    isUploadOpen: false,
    isExportOpen: false,
    isFilterOpen: false
  }),

  getters: {
    minTimestamp(state): number {
      if (state.segments.length === 0) return 0
      return state.segments[0].startTime
    },

    maxTimestamp(state): number {
      if (state.segments.length === 0) return 0
      return state.segments[state.segments.length - 1].endTime
    },

    minDateString(state): string {
      if (state.segments.length === 0) return '2014-01-01'
      return new Date(state.segments[0].startTime).toISOString().split('T')[0]
    },

    maxDateString(state): string {
      if (state.segments.length === 0) return new Date().toISOString().split('T')[0]
      return new Date(state.segments[state.segments.length - 1].endTime).toISOString().split('T')[0]
    },

    /**
     * Extracts all unique cities with their coordinates and visit counts
     */
    availableCities(state): CityDetail[] {
      const cityMap = new Map<string, {
        name: string
        country: string
        coordinates: GeoPoint
        visitCount: number
        totalStayHours: number
        firstVisitDate: number
        lastVisitDate: number
        segments: TimelineSegment[]
        placeCounts: Map<string, number>
      }>()

      for (const seg of state.segments) {
        if (!seg.city || seg.city === 'Unknown Place' || seg.city === 'Journey') continue

        const key = seg.city
        const coord = seg.point || seg.startPoint || { lat: 0, lng: 0 }

        if (!cityMap.has(key)) {
          cityMap.set(key, {
            name: seg.city,
            country: seg.country || 'World',
            coordinates: coord,
            visitCount: 0,
            totalStayHours: 0,
            firstVisitDate: seg.startTime,
            lastVisitDate: seg.endTime,
            segments: [],
            placeCounts: new Map()
          })
        }

        const data = cityMap.get(key)!
        data.segments.push(seg)
        if (seg.type === 'visit') {
          data.visitCount++
          data.totalStayHours += seg.durationMinutes / 60
        }
        if (seg.placeName) {
          data.placeCounts.set(seg.placeName, (data.placeCounts.get(seg.placeName) || 0) + 1)
        }
        if (seg.startTime < data.firstVisitDate) data.firstVisitDate = seg.startTime
        if (seg.endTime > data.lastVisitDate) data.lastVisitDate = seg.endTime
      }

      return Array.from(cityMap.values())
        .map(c => {
          let localDist = 0
          let walk = 0
          let drive = 0
          let train = 0

          for (const s of c.segments) {
            const km = (s.distanceMeters || 0) / 1000
            localDist += km
            if (s.activityType === 'WALKING' || s.activityType === 'RUNNING') walk += km
            else if (s.activityType === 'IN_PASSENGER_VEHICLE' || s.activityType === 'IN_VEHICLE') drive += km
            else if (s.activityType === 'IN_TRAIN' || s.activityType === 'IN_TRAM' || s.activityType === 'IN_SUBWAY') train += km
          }

          return {
            name: c.name,
            country: c.country,
            coordinates: c.coordinates,
            visitCount: Math.max(1, c.visitCount),
            totalStayHours: Math.round(c.totalStayHours),
            localDistanceKm: Math.round(localDist),
            walkKm: Math.round(walk),
            driveKm: Math.round(drive),
            trainKm: Math.round(train),
            firstVisitDate: c.firstVisitDate,
            lastVisitDate: c.lastVisitDate,
            segments: c.segments,
            topPlaces: Array.from(c.placeCounts.entries())
              .map(([name, count]) => ({ name, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
          }
        })
        .sort((a, b) => b.visitCount - a.visitCount)
    },

    selectedCityDetail(state): CityDetail | null {
      if (!state.selectedCity) return null
      return this.availableCities.find(c => c.name === state.selectedCity) || null
    },

    filteredSegments(state): TimelineSegment[] {
      if (state.segments.length === 0) return []

      let list = state.segments

      // 1. City Filter Drilldown
      if (state.selectedCity) {
        list = list.filter(s => s.city === state.selectedCity || (s.placeName && s.placeName.includes(state.selectedCity!)))
      }

      // 2. Exact Date Range Filter
      if (state.startDate || state.endDate) {
        const startTs = state.startDate ? new Date(state.startDate + 'T00:00:00').getTime() : 0
        const endTs = state.endDate ? new Date(state.endDate + 'T23:59:59').getTime() : Infinity
        list = list.filter(s => s.startTime >= startTs && s.endTime <= endTs)
      }
      // 3. Year Filter
      else if (state.selectedYear) {
        const yrStart = new Date(state.selectedYear, 0, 1).getTime()
        const yrEnd = new Date(state.selectedYear, 11, 31, 23, 59, 59).getTime()
        list = list.filter(s => s.startTime >= yrStart && s.endTime <= yrEnd)
      }
      // 4. Trip Cluster Filter
      else if (state.selectedClusterId) {
        const cluster = state.clusters.find(c => c.id === state.selectedClusterId)
        if (cluster) list = cluster.segments
      }
      // 5. Custom Time Range
      else if (state.customTimeRange) {
        const [start, end] = state.customTimeRange
        list = list.filter(s => s.startTime >= start && s.endTime <= end)
      }

      // 6. Action Filters
      const f = state.actionFilters
      if (f.onlyVisitedCities) {
        // Only keep visits or inter-city flights/trains
        list = list.filter(s => s.type === 'visit' || s.activityType === 'FLYING' || (s.distanceMeters && s.distanceMeters > 30000))
      } else {
        list = list.filter(s => {
          if (s.type === 'visit') return f.showVisits
          if (s.activityType === 'FLYING') return f.showFlights
          if (s.activityType === 'IN_PASSENGER_VEHICLE' || s.activityType === 'IN_VEHICLE' || s.activityType === 'MOTORCYCLING' || s.activityType === 'IN_TAXI') return f.showDrives
          if (s.activityType === 'IN_TRAIN' || s.activityType === 'IN_TRAM' || s.activityType === 'IN_SUBWAY' || s.activityType === 'IN_BUS') return f.showTrains
          if (s.activityType === 'WALKING' || s.activityType === 'RUNNING' || s.activityType === 'CYCLING' || s.activityType === 'SKIING') return f.showWalks
          return true
        })
      }

      return list
    },

    filteredStats(state): TravelStats {
      const segs = this.filteredSegments
      if (segs.length === 0 || !state.stats) {
        return (
          state.stats || {
            totalDistanceKm: 0,
            totalTravelTimeHours: 0,
            totalStayTimeHours: 0,
            totalSegments: 0,
            flightKm: 0,
            driveKm: 0,
            trainKm: 0,
            walkKm: 0,
            longestFlightKm: 0,
            flightCount: 0,
            driveCount: 0,
            trainCount: 0,
            walkCount: 0,
            countries: [],
            cities: [],
            modeBreakdown: {}
          }
        )
      }

      let totalDist = 0
      let totalTravelH = 0
      let totalStayH = 0
      let longestFlight = 0
      let flights = 0
      let drives = 0
      let trains = 0
      let walks = 0
      const countries = new Set<string>()
      const cities = new Set<string>()
      const breakdown: Partial<Record<ActivityType, { distanceKm: number; count: number; durationHours: number }>> = {}

      for (const s of segs) {
        if (s.country && s.country !== 'World') countries.add(s.country)
        if (s.city && s.city !== 'Unknown Place') cities.add(s.city)

        const durH = s.durationMinutes / 60
        if (s.type === 'visit') {
          totalStayH += durH
        } else if (s.type === 'activity') {
          totalTravelH += durH
          const km = (s.distanceMeters || 0) / 1000
          totalDist += km
          const mode = s.activityType || 'UNKNOWN'

          if (!breakdown[mode]) breakdown[mode] = { distanceKm: 0, count: 0, durationHours: 0 }
          breakdown[mode]!.distanceKm += km
          breakdown[mode]!.count++
          breakdown[mode]!.durationHours += durH

          if (mode === 'FLYING') {
            flights++
            if (km > longestFlight) longestFlight = km
          } else if (mode === 'IN_PASSENGER_VEHICLE' || mode === 'IN_VEHICLE') {
            drives++
          } else if (mode === 'IN_TRAIN' || mode === 'IN_TRAM' || mode === 'IN_SUBWAY') {
            trains++
          } else if (mode === 'WALKING' || mode === 'RUNNING') {
            walks++
          }
        }
      }

      return {
        totalDistanceKm: Math.round(totalDist),
        totalTravelTimeHours: Math.round(totalTravelH),
        totalStayTimeHours: Math.round(totalStayH),
        totalSegments: segs.length,
        flightKm: Math.round(breakdown['FLYING']?.distanceKm || 0),
        driveKm: Math.round(breakdown['IN_PASSENGER_VEHICLE']?.distanceKm || 0),
        trainKm: Math.round((breakdown['IN_TRAIN']?.distanceKm || 0) + (breakdown['IN_TRAM']?.distanceKm || 0)),
        walkKm: Math.round(breakdown['WALKING']?.distanceKm || 0),
        longestFlightKm: Math.round(longestFlight),
        flightCount: flights,
        driveCount: drives,
        trainCount: trains,
        walkCount: walks,
        countries: Array.from(countries),
        cities: Array.from(cities),
        modeBreakdown: breakdown
      }
    },

    currentOverallProgress(state): number {
      const segs = this.filteredSegments
      if (segs.length === 0) return 0
      const idx = Math.min(segs.length - 1, state.playbackIndex)
      return (idx + state.playbackSegmentProgress) / segs.length
    }
  },

  actions: {
    loadData(payload: {
      segments: TimelineSegment[]
      clusters: TripCluster[]
      stats: TravelStats
      years: YearSummary[]
    }) {
      this.segments = payload.segments
      this.clusters = payload.clusters
      this.stats = payload.stats
      this.years = payload.years
      this.hasLoadedData = true
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.selectedYear = null
      this.selectedClusterId = null
      this.startDate = null
      this.endDate = null
      this.selectedCity = null
      this.isCityDrawerOpen = false
      this.customTimeRange = null

      this.updateActiveJourneyState()
    },

    loadSample() {
      const sample = generateSampleDataset()
      this.loadData(sample)
    },

    setTheme(theme: GlobeTheme) {
      this.globeTheme = theme
    },

    setMapLayer(layer: MapLayerType) {
      this.mapLayer = layer
    },

    toggleOverview() {
      this.isOverviewOpen = !this.isOverviewOpen
    },

    setCameraMode(mode: CameraMode) {
      this.cameraMode = mode
    },

    setSpeed(speed: number) {
      this.playbackSpeed = speed
    },

    setDateRange(start: string | null, end: string | null) {
      this.startDate = start
      this.endDate = end
      this.selectedYear = null
      this.selectedClusterId = null
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    setFilterYear(year: number | null) {
      this.selectedYear = year
      this.selectedClusterId = null
      this.startDate = null
      this.endDate = null
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    setFilterCluster(clusterId: string | null) {
      this.selectedClusterId = clusterId
      this.selectedYear = null
      this.startDate = null
      this.endDate = null
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    openSegmentEditor(segment: TimelineSegment) {
      this.editingSegment = segment
      this.isSegmentEditOpen = true
    },

    overrideSegmentActivity(segmentId: string, newType: ActivityType) {
      const seg = this.segments.find(s => s.id === segmentId)
      if (seg) {
        seg.activityType = newType
        if (newType === 'FLYING') {
          seg.type = 'activity'
          if (!seg.distanceMeters || seg.distanceMeters < 50000) {
            seg.distanceMeters = 500000 // default flight estimate
          }
        }
      }
      this.isSegmentEditOpen = false
      this.editingSegment = null
      this.updateActiveJourneyState()
    },

    selectCity(cityName: string | null) {
      this.selectedCity = cityName
      this.isCityDrawerOpen = cityName !== null
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    toggleActionFilter(filterKey: keyof ActionFilters) {
      this.actionFilters[filterKey] = !this.actionFilters[filterKey]
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    play() {
      this.isPlaying = true
    },

    pause() {
      this.isPlaying = false
    },

    togglePlay() {
      this.isPlaying = !this.isPlaying
    },

    seek(fraction: number) {
      const segs = this.filteredSegments
      if (segs.length === 0) return
      const clamped = Math.max(0, Math.min(0.9999, fraction))
      const totalUnits = clamped * segs.length
      this.playbackIndex = Math.floor(totalUnits)
      this.playbackSegmentProgress = totalUnits - this.playbackIndex
      this.updateActiveJourneyState()
    },

    advancePlayback(deltaSeconds: number) {
      const segs = this.filteredSegments
      if (segs.length === 0) return

      const seg = segs[this.playbackIndex]
      if (!seg) {
        this.playbackIndex = 0
        this.playbackSegmentProgress = 0
        return
      }

      const baseDurationSec = seg.activityType === 'FLYING' ? 3.5 : 2.0
      const scaledSpeed = Math.max(0.5, this.playbackSpeed / 5)
      const step = (deltaSeconds / baseDurationSec) * scaledSpeed

      this.playbackSegmentProgress += step
      if (this.playbackSegmentProgress >= 1) {
        this.playbackSegmentProgress = 0
        this.playbackIndex++
        if (this.playbackIndex >= segs.length) {
          this.playbackIndex = 0
        }
      }

      this.updateActiveJourneyState()
    },

    updateActiveJourneyState() {
      const segs = this.filteredSegments
      if (segs.length === 0) {
        this.activeJourneyState.currentSegment = null
        this.activeJourneyState.currentPosition = null
        return
      }

      const safeIdx = Math.min(segs.length - 1, Math.max(0, this.playbackIndex))
      const currentSegment = segs[safeIdx]
      const t = this.playbackSegmentProgress

      let pos = currentSegment.point || currentSegment.startPoint || { lat: 0, lng: 0 }
      let heading = 0
      let speedKmh = 0
      let altitude = 0

      if (currentSegment.type === 'activity' && currentSegment.path.length >= 2) {
        const path = currentSegment.path
        const pointFloatIdx = t * (path.length - 1)
        const p1Idx = Math.floor(pointFloatIdx)
        const p2Idx = Math.min(path.length - 1, p1Idx + 1)
        const pFrac = pointFloatIdx - p1Idx

        const pt1 = path[p1Idx]
        const pt2 = path[p2Idx]

        pos = {
          lat: pt1.lat + (pt2.lat - pt1.lat) * pFrac,
          lng: pt1.lng + (pt2.lng - pt1.lng) * pFrac
        }

        heading = calculateBearing(pt1, pt2)

        if (currentSegment.activityType === 'FLYING') {
          altitude = Math.sin(t * Math.PI) * 20
          speedKmh = 850
        } else if (currentSegment.activityType === 'IN_TRAIN') {
          speedKmh = 180
        } else if (currentSegment.activityType === 'IN_PASSENGER_VEHICLE') {
          speedKmh = 90
        } else if (currentSegment.activityType === 'WALKING') {
          speedKmh = 5
        } else {
          speedKmh = 25
        }
      } else if (currentSegment.point) {
        pos = currentSegment.point
        speedKmh = 0
        altitude = 0
      }

      this.activeJourneyState = {
        currentSegment,
        currentPosition: pos,
        currentHeading: heading,
        currentAltitude: altitude,
        currentSpeedKmh: Math.round(speedKmh),
        progress: this.currentOverallProgress,
        timestamp: currentSegment.startTime + (currentSegment.endTime - currentSegment.startTime) * t
      }
    }
  }
})
