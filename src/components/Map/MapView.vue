<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import { useTimelineStore } from '../../stores/timelineStore'
import type { TimelineSegment, MapLayerType, GeoPoint } from '../../types/timeline'
import { fetchRealRoadRoute, generateFlightGeodesic } from '../../services/routingService'

const timelineStore = useTimelineStore()
const mapContainer = ref<HTMLElement | null>(null)

let map: L.Map | null = null
let currentTileLayer: L.TileLayer | null = null
let routePolylines: L.Polyline[] = []
let cityMarkers: L.Marker[] = []
let activeVehicleMarker: L.Marker | null = null
let playbackRaf: number | null = null
let lastTime = performance.now()

const EMOJI_MAP: Record<string, string> = {
  FLYING: '✈️',
  IN_PASSENGER_VEHICLE: '🚗',
  IN_VEHICLE: '🚗',
  IN_TRAIN: '🚆',
  IN_TRAM: '🚊',
  IN_SUBWAY: '🚇',
  IN_BUS: '🚌',
  WALKING: '🚶',
  RUNNING: '🏃',
  CYCLING: '🚴',
  IN_FERRY: '⛴️',
  SAILING: '⛵',
  UNKNOWN: '📍'
}

const TILE_SERVERS: Record<MapLayerType, { url: string; attribution: string }> = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
  }
}

onMounted(() => {
  if (mapContainer.value) {
    map = L.map(mapContainer.value, {
      center: [35, 15],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    })

    setTileLayer(timelineStore.mapLayer)

    if (timelineStore.filteredSegments.length > 0) {
      updateMapRoutes(timelineStore.filteredSegments)
    }

    const tick = (now: number) => {
      playbackRaf = requestAnimationFrame(tick)
      const deltaSec = (now - lastTime) / 1000
      lastTime = now

      if (timelineStore.isPlaying) {
        timelineStore.advancePlayback(deltaSec)
      }

      updateVehicleMarker()
    }

    lastTime = performance.now()
    playbackRaf = requestAnimationFrame(tick)
  }
})

onUnmounted(() => {
  if (playbackRaf) cancelAnimationFrame(playbackRaf)
  if (map) {
    map.remove()
    map = null
  }
})

function setTileLayer(layerKey: MapLayerType) {
  if (!map) return
  if (currentTileLayer) {
    map.removeLayer(currentTileLayer)
  }

  const config = TILE_SERVERS[layerKey] || TILE_SERVERS.satellite
  currentTileLayer = L.tileLayer(config.url, {
    maxZoom: 19,
    subdomains: 'abcd'
  }).addTo(map)
}

async function updateMapRoutes(segments: TimelineSegment[]) {
  if (!map) return

  // Clear previous lines
  for (const line of routePolylines) {
    map.removeLayer(line)
  }
  routePolylines = []

  // Clear previous city markers
  for (const marker of cityMarkers) {
    map.removeLayer(marker)
  }
  cityMarkers = []

  const isOnlyCities = timelineStore.actionFilters.onlyVisitedCities
  const visitedCitiesMap = new Map<string, { lat: number; lng: number; count: number; name: string; country: string }>()

  // 1. Process Visited Cities (In Only Cities mode, use the distinct available cities list)
  if (isOnlyCities) {
    for (const city of timelineStore.availableCities) {
      if (city.name && city.name !== 'Unknown Place' && city.name !== 'Journey' && city.coordinates) {
        visitedCitiesMap.set(city.name, {
          lat: city.coordinates.lat,
          lng: city.coordinates.lng,
          count: city.visitCount,
          name: city.name,
          country: city.country
        })
      }
    }
  } else {
    for (const seg of segments) {
      if (seg.point && seg.city && seg.city !== 'Unknown Place' && seg.city !== 'Journey') {
        const key = seg.city
        if (!visitedCitiesMap.has(key)) {
          visitedCitiesMap.set(key, {
            lat: seg.point.lat,
            lng: seg.point.lng,
            count: 1,
            name: seg.city,
            country: seg.country || ''
          })
        } else {
          visitedCitiesMap.get(key)!.count++
        }
      }
    }
  }

  // 2. Render City Pins (Only major city badges in 'Only Cities' mode)
  for (const [_, city] of visitedCitiesMap) {
    const isSelected = timelineStore.selectedCity === city.name
    const iconHtml = `
      <div class="city-map-pin ${isSelected ? 'selected' : ''}">
        <div class="city-badge">
          <span class="city-pin-dot"></span>
          <span class="city-pin-name">${city.name}</span>
          ${city.count > 1 ? `<span class="city-pin-count">${city.count}x</span>` : ''}
        </div>
      </div>
    `
    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-city-icon',
      iconSize: [120, 32],
      iconAnchor: [60, 16]
    })

    const marker = L.marker([city.lat, city.lng], { icon: customIcon }).addTo(map)
    marker.on('click', () => {
      timelineStore.selectCity(city.name)
    })
    cityMarkers.push(marker)
  }

  // 3. Render Activity Routes with Real-World Road & Geodesic Paths
  for (const seg of segments) {
    if (seg.type === 'activity' && seg.startPoint && seg.endPoint) {
      const isFlight = seg.activityType === 'FLYING'
      const isTrain = seg.activityType === 'IN_TRAIN' || seg.activityType === 'IN_TRAM' || seg.activityType === 'IN_SUBWAY'
      const isCar = seg.activityType === 'IN_PASSENGER_VEHICLE' || seg.activityType === 'IN_VEHICLE' || seg.activityType === 'IN_BUS'

      const color = isFlight
        ? '#00f0ff'
        : isTrain
        ? '#00ff9d'
        : isCar
        ? '#ff9900'
        : '#ff2a6d'

      if (isFlight) {
        // True curved Great-Circle flight arc
        const flightPoints = generateFlightGeodesic(seg.startPoint, seg.endPoint)
        const latLngs: [number, number][] = flightPoints.map(p => [p.lat, p.lng])
        const line = L.polyline(latLngs, {
          color,
          weight: 3.5,
          opacity: 0.9,
          dashArray: '8, 6',
          lineCap: 'round'
        }).addTo(map)
        routePolylines.push(line)
      } else if (seg.path && seg.path.length > 5) {
        // High-density recorded GPS route from Google Timeline
        const latLngs: [number, number][] = seg.path.map(p => [p.lat, p.lng])
        const line = L.polyline(latLngs, {
          color,
          weight: 3.5,
          opacity: 0.85,
          lineJoin: 'round'
        }).addTo(map)
        routePolylines.push(line)
      } else {
        // Real-World Highway Routing via OSRM
        fetchRealRoadRoute(seg.startPoint, seg.endPoint, seg.activityType).then(roadPoints => {
          if (!map) return
          const latLngs: [number, number][] = roadPoints.map(p => [p.lat, p.lng])
          const line = L.polyline(latLngs, {
            color,
            weight: 3.5,
            opacity: 0.85,
            lineJoin: 'round'
          }).addTo(map)
          routePolylines.push(line)
          seg.path = roadPoints // Store enriched real road path
        })
      }
    }
  }
}

function updateVehicleMarker() {
  if (!map) return
  const state = timelineStore.activeJourneyState
  if (!state.currentPosition) {
    if (activeVehicleMarker) {
      map.removeLayer(activeVehicleMarker)
      activeVehicleMarker = null
    }
    return
  }

  const { lat, lng } = state.currentPosition
  const mode = state.currentSegment?.activityType
  const emoji = EMOJI_MAP[mode || 'UNKNOWN'] || '📍'

  const vehicleHtml = `
    <div class="vehicle-marker-pulse">
      <div class="pulse-ring"></div>
      <div class="vehicle-badge">
        <span class="vehicle-emoji">${emoji}</span>
      </div>
    </div>
  `

  const vehicleIcon = L.divIcon({
    html: vehicleHtml,
    className: 'custom-vehicle-icon',
    iconSize: [44, 44],
    iconAnchor: [22, 22]
  })

  if (!activeVehicleMarker) {
    activeVehicleMarker = L.marker([lat, lng], { icon: vehicleIcon, zIndexOffset: 1000 }).addTo(map)
  } else {
    activeVehicleMarker.setLatLng([lat, lng])
    activeVehicleMarker.setIcon(vehicleIcon)
  }
}

watch(
  () => timelineStore.mapLayer,
  (newLayer) => {
    setTileLayer(newLayer)
  }
)

watch(
  () => [timelineStore.filteredSegments, timelineStore.actionFilters.onlyVisitedCities],
  ([newSegs]) => {
    updateMapRoutes(newSegs as TimelineSegment[])
  }
)

watch(
  () => timelineStore.selectedCity,
  (cityName) => {
    if (cityName && map) {
      const city = timelineStore.availableCities.find(c => c.name === cityName)
      if (city && city.coordinates) {
        map.flyTo([city.coordinates.lat, city.coordinates.lng], 11, {
          duration: 1.5
        })
      }
    }
  }
)

defineExpose({
  captureSnapshot: () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1920
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#060812'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  },
  getCanvas: () => {
    return mapContainer.value?.querySelector('canvas') || null
  },
  flyToCity: (lat: number, lng: number, zoom: number = 10) => {
    map?.flyTo([lat, lng], zoom, { duration: 1.5 })
  }
})
</script>

<template>
  <div class="map-viewport-wrapper">
    <div class="map-container" ref="mapContainer"></div>

    <!-- Active Speed & Mode HUD Badge -->
    <div class="map-hud" v-if="timelineStore.activeJourneyState.currentSegment">
      <div class="hud-chip mode-chip">
        <span class="hud-pulse-dot"></span>
        {{ timelineStore.activeJourneyState.currentSegment.activityType || 'JOURNEY' }}
      </div>
      <div class="hud-chip speed-chip" v-if="timelineStore.activeJourneyState.currentSpeedKmh > 0">
        {{ timelineStore.activeJourneyState.currentSpeedKmh }} km/h
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-viewport-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-space);
  z-index: 1;
}

.map-container {
  width: 100%;
  height: 100%;
  background: #04060e;
}

.map-hud {
  position: absolute;
  top: 86px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
  z-index: 1000;
}

.hud-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(13, 17, 28, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.hud-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 8px var(--accent-cyan);
  animation: pulseGlow 1.5s infinite;
}

.speed-chip {
  color: var(--accent-emerald);
  border-color: rgba(0, 255, 157, 0.3);
  font-family: var(--font-mono);
}
</style>

<style>
/* Global Leaflet Marker Styles */
.custom-city-icon {
  background: transparent;
  border: none;
}

.city-map-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.city-map-pin:hover {
  transform: scale(1.15);
  z-index: 1000;
}

.city-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(10, 15, 28, 0.9);
  backdrop-filter: blur(8px);
  border: 1.5px solid var(--accent-cyan);
  border-radius: 9999px;
  box-shadow: 0 4px 16px rgba(0, 240, 255, 0.35);
  color: #ffffff;
}

.city-map-pin.selected .city-badge {
  background: rgba(255, 42, 109, 0.9);
  border-color: #ffffff;
  box-shadow: 0 4px 20px rgba(255, 42, 109, 0.6);
}

.city-pin-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-cyan);
}

.city-map-pin.selected .city-pin-dot {
  background: #ffffff;
}

.city-pin-name {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.city-pin-count {
  font-size: 9px;
  font-family: var(--font-mono);
  background: rgba(0, 240, 255, 0.2);
  color: var(--accent-cyan);
  padding: 1px 4px;
  border-radius: 4px;
}

.custom-vehicle-icon {
  background: transparent;
  border: none;
}

.vehicle-marker-pulse {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-ring {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--accent-cyan);
  animation: pulseGlow 1.2s infinite ease-out;
}

.vehicle-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(10, 15, 28, 0.92);
  border: 2px solid var(--accent-cyan);
  box-shadow: 0 0 16px var(--accent-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.vehicle-emoji {
  font-size: 17px;
}
</style>
