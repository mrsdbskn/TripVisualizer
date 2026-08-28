<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import { GlobeEngine } from './globeEngine'

const timelineStore = useTimelineStore()
const globeContainer = ref<HTMLElement | null>(null)
let engine: GlobeEngine | null = null
let playbackRaf: number | null = null
let lastTime = performance.now()

onMounted(() => {
  if (globeContainer.value) {
    engine = new GlobeEngine(globeContainer.value)
    engine.setTheme(timelineStore.globeTheme)
    engine.setCameraMode(timelineStore.cameraMode)

    if (timelineStore.filteredSegments.length > 0) {
      engine.updateRoutes(timelineStore.filteredSegments, timelineStore.selectedCity)
    }

    const tick = (now: number) => {
      playbackRaf = requestAnimationFrame(tick)
      const deltaSec = (now - lastTime) / 1000
      lastTime = now

      if (timelineStore.isPlaying) {
        timelineStore.advancePlayback(deltaSec)
      }

      if (engine && timelineStore.activeJourneyState.currentPosition) {
        engine.updateJourney(timelineStore.activeJourneyState)
      }
    }

    lastTime = performance.now()
    playbackRaf = requestAnimationFrame(tick)
  }
})

onUnmounted(() => {
  if (playbackRaf) cancelAnimationFrame(playbackRaf)
  if (engine) engine.destroy()
})

watch(
  () => timelineStore.filteredSegments,
  (newSegments) => {
    if (engine) {
      engine.updateRoutes(newSegments, timelineStore.selectedCity)
      if (newSegments.length > 0 && timelineStore.activeJourneyState.currentPosition) {
        engine.updateJourney(timelineStore.activeJourneyState)
      }
    }
  },
  { deep: false }
)

watch(
  () => timelineStore.selectedCity,
  (city) => {
    if (engine) {
      engine.updateRoutes(timelineStore.filteredSegments, city)
      if (city) {
        const detail = timelineStore.selectedCityDetail
        if (detail && detail.coordinates) {
          engine.focusOnCoordinates(detail.coordinates.lat, detail.coordinates.lng, 145)
        }
      }
    }
  }
)

watch(
  () => timelineStore.globeTheme,
  (theme) => {
    if (engine) engine.setTheme(theme)
  }
)

watch(
  () => timelineStore.cameraMode,
  (mode) => {
    if (engine) engine.setCameraMode(mode)
  }
)

defineExpose({
  captureSnapshot: () => engine?.captureSnapshot() || '',
  getCanvas: () => engine?.getCanvas() || null,
  focusOnCoordinates: (lat: number, lng: number, distance: number = 145) => {
    engine?.focusOnCoordinates(lat, lng, distance)
  }
})
</script>

<template>
  <div class="globe-viewport" ref="globeContainer">
    <!-- Viewport HUD Overlay info -->
    <div class="hud-status" v-if="timelineStore.activeJourneyState.currentSegment">
      <div class="hud-badge mode-badge">
        <span class="hud-dot"></span>
        {{ timelineStore.activeJourneyState.currentSegment.activityType || timelineStore.activeJourneyState.currentSegment.type }}
      </div>
      <div class="hud-badge speed-badge" v-if="timelineStore.activeJourneyState.currentSpeedKmh > 0">
        {{ timelineStore.activeJourneyState.currentSpeedKmh }} km/h
      </div>
    </div>
  </div>
</template>

<style scoped>
.globe-viewport {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-space);
  z-index: 1;
}

.hud-status {
  position: absolute;
  top: 86px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  pointer-events: none;
  z-index: 10;
}

.hud-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(13, 17, 28, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.hud-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 8px var(--accent-cyan);
  animation: pulseGlow 1.5s infinite;
}

.speed-badge {
  color: var(--accent-emerald);
  border-color: rgba(0, 255, 157, 0.3);
  font-family: var(--font-mono);
}
</style>
