import { defineStore } from 'pinia'
import type {
  TimelineSegment,
  TripCluster,
  TravelStats,
  YearSummary,
  GlobeTheme,
  CameraMode,
  ActiveJourneyState,
  ActivityType
} from '../types/timeline'
import { calculateBearing, haversineDistanceKm } from '../services/geodesic'
import { generateSampleDataset } from '../services/timelineParser'

export const useTimelineStore = defineStore('timeline', {
  state: () => ({
    // Data
    segments: [] as TimelineSegment[],
    clusters: [] as TripCluster[],
    stats: null as TravelStats | null,
    years: [] as YearSummary[],
    isLoading: false,
    loadingProgress: 0,
    loadingMessage: '',
    hasLoadedData: false,

    // Visualization Config
    globeTheme: 'satellite' as GlobeTheme,
    cameraMode: 'follow' as CameraMode,
    is3DRealisticGlobe: true,
    showAtmosphereGlow: true,
    showClouds: true,
    autoRotateGlobe: false,

    // Filtering
    selectedYear: null as number | null,
    selectedClusterId: null as string | null,
    customTimeRange: null as [number, number] | null,

    // Playback Engine
    isPlaying: false,
    playbackSpeed: 10, // multiplier
    playbackIndex: 0, // index into filtered segments
    playbackSegmentProgress: 0, // 0..1 within current segment
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

    filteredSegments(state): TimelineSegment[] {
      if (state.segments.length === 0) return []

      if (state.selectedClusterId) {
        const cluster = state.clusters.find(c => c.id === state.selectedClusterId)
        if (cluster) return cluster.segments
      }

      if (state.selectedYear) {
        const yrStart = new Date(state.selectedYear, 0, 1).getTime()
        const yrEnd = new Date(state.selectedYear, 11, 31, 23, 59, 59).getTime()
        return state.segments.filter(s => s.startTime >= yrStart && s.endTime <= yrEnd)
      }

      if (state.customTimeRange) {
        const [start, end] = state.customTimeRange
        return state.segments.filter(s => s.startTime >= start && s.endTime <= end)
      }

      return state.segments
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

      // Live compute for filtered subset
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

    setCameraMode(mode: CameraMode) {
      this.cameraMode = mode
    },

    setSpeed(speed: number) {
      this.playbackSpeed = speed
    },

    setFilterYear(year: number | null) {
      this.selectedYear = year
      this.selectedClusterId = null
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    setFilterCluster(clusterId: string | null) {
      this.selectedClusterId = clusterId
      this.selectedYear = null
      this.playbackIndex = 0
      this.playbackSegmentProgress = 0
      this.updateActiveJourneyState()
    },

    setCustomTimeRange(range: [number, number] | null) {
      this.customTimeRange = range
      this.selectedYear = null
      this.selectedClusterId = null
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

      // Base duration for a segment in animation: ~2.5s for normal activity, 4s for flight
      const baseDurationSec = seg.activityType === 'FLYING' ? 3.5 : 2.0
      const scaledSpeed = Math.max(0.5, this.playbackSpeed / 5)
      const step = (deltaSeconds / baseDurationSec) * scaledSpeed

      this.playbackSegmentProgress += step
      if (this.playbackSegmentProgress >= 1) {
        this.playbackSegmentProgress = 0
        this.playbackIndex++
        if (this.playbackIndex >= segs.length) {
          // Loop around
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
