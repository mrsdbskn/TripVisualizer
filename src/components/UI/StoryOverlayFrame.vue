<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import { useExportStore } from '../../stores/exportStore'
import {
  Compass,
  Plane,
  Car,
  Train,
  Footprints,
  Navigation,
  MapPin,
  Calendar,
  Gauge
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()
const exportStore = useExportStore()

const formattedDate = computed(() => {
  const ts = timelineStore.activeJourneyState.timestamp
  if (!ts) return new Date().toLocaleDateString()
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

const currentLocation = computed(() => {
  const seg = timelineStore.activeJourneyState.currentSegment
  if (!seg) return 'World Tour'
  return seg.city ? `${seg.city}, ${seg.country}` : seg.placeName || 'Journey'
})

const modeIcon = computed(() => {
  const mode = timelineStore.activeJourneyState.currentSegment?.activityType
  switch (mode) {
    case 'FLYING': return Plane
    case 'IN_PASSENGER_VEHICLE':
    case 'IN_VEHICLE': return Car
    case 'IN_TRAIN':
    case 'IN_TRAM':
    case 'IN_SUBWAY': return Train
    case 'WALKING':
    case 'RUNNING': return Footprints
    default: return Navigation
  }
})
</script>

<template>
  <div class="story-overlay-container">
    <!-- Top Story Header -->
    <div class="story-top" v-if="exportStore.showTitleOverlay">
      <div class="story-branding">
        <div class="story-icon">
          <Compass :size="16" />
        </div>
        <div class="story-titles">
          <h2 class="story-main-title">{{ exportStore.storyTitle || 'My Journey' }}</h2>
          <span class="story-subtitle">{{ exportStore.customSubtitle || 'Google Location Story' }}</span>
        </div>
      </div>

      <!-- Date Badge -->
      <div class="story-date-badge" v-if="exportStore.showDateOverlay">
        <Calendar :size="12" />
        <span>{{ formattedDate }}</span>
      </div>
    </div>

    <!-- Center Floating Badges (Speedometer & Mode) -->
    <div class="story-center-widgets">
      <div class="story-pill mode-pill" v-if="exportStore.showTransportIcon">
        <component :is="modeIcon" :size="16" class="text-cyan" />
        <span>{{ timelineStore.activeJourneyState.currentSegment?.activityType || 'EXPLORING' }}</span>
      </div>

      <div class="story-pill speed-pill" v-if="exportStore.showSpeedometer && timelineStore.activeJourneyState.currentSpeedKmh > 0">
        <Gauge :size="14" class="text-emerald" />
        <span>{{ timelineStore.activeJourneyState.currentSpeedKmh }} km/h</span>
      </div>
    </div>

    <!-- Bottom HUD Info -->
    <div class="story-bottom">
      <div class="story-location-card" v-if="exportStore.showCountryPill">
        <div class="loc-header">
          <MapPin :size="14" class="text-rose" />
          <span class="loc-title">{{ currentLocation }}</span>
        </div>
        <div class="loc-dist" v-if="exportStore.showDistanceTracker">
          Total Traveled: <strong>{{ timelineStore.filteredStats.totalDistanceKm.toLocaleString() }} km</strong>
        </div>
      </div>

      <!-- Instagram Story Top/Bottom Progress Bars -->
      <div class="story-progress-bar" v-if="exportStore.showProgressBar">
        <div
          class="story-progress-fill"
          :style="{ width: `${timelineStore.currentOverallProgress * 100}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.story-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 32px 24px;
  box-sizing: border-box;
  z-index: 10;
}

.story-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.story-branding {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(13, 17, 28, 0.7);
  backdrop-filter: blur(12px);
  padding: 8px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.story-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, #9d4edd 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #060810;
}

.story-titles {
  display: flex;
  flex-direction: column;
}

.story-main-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.story-subtitle {
  font-size: 10px;
  color: var(--accent-cyan);
}

.story-date-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(13, 17, 28, 0.7);
  backdrop-filter: blur(12px);
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 600;
  color: #ffffff;
  font-family: var(--font-mono);
}

.story-center-widgets {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

.story-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(13, 17, 28, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.story-bottom {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.story-location-card {
  background: rgba(13, 17, 28, 0.85);
  backdrop-filter: blur(16px);
  padding: 14px 18px;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.loc-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loc-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.loc-dist {
  font-size: 11px;
  color: var(--text-muted);
}

.story-progress-bar {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.story-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00f0ff 0%, #a259ff 50%, #ff2a6d 100%);
}

.text-cyan { color: var(--accent-cyan); }
.text-emerald { color: var(--accent-emerald); }
.text-rose { color: var(--accent-rose); }
</style>
