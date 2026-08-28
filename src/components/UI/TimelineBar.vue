<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  MapPin,
  Plane,
  Car,
  Train,
  Footprints,
  Navigation
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const speeds = [1, 5, 10, 25, 50, 100]

const formattedDate = computed(() => {
  const ts = timelineStore.activeJourneyState.timestamp
  if (!ts) return 'No Active Date'
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})

const currentLocationTitle = computed(() => {
  const seg = timelineStore.activeJourneyState.currentSegment
  if (!seg) return 'Select a trip or play timeline'
  if (seg.city && seg.country && seg.city !== 'Journey') {
    return `${seg.city}, ${seg.country}`
  }
  return seg.placeName || 'Journey in progress'
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

const onScrubberInput = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value)
  timelineStore.seek(val / 100)
}

const jumpPrevious = () => {
  timelineStore.seek(Math.max(0, timelineStore.currentOverallProgress - 0.05))
}

const jumpNext = () => {
  timelineStore.seek(Math.min(0.999, timelineStore.currentOverallProgress + 0.05))
}
</script>

<template>
  <div class="timeline-bar-wrapper">
    <div class="timeline-bar glass-panel">
      <!-- Left: Playback Controls -->
      <div class="controls-left">
        <button
          class="playback-btn play-main"
          :class="{ playing: timelineStore.isPlaying }"
          @click="timelineStore.togglePlay()"
          :title="timelineStore.isPlaying ? 'Pause' : 'Play Timeline'"
        >
          <Pause v-if="timelineStore.isPlaying" :size="20" />
          <Play v-else :size="20" class="play-icon-offset" />
        </button>

        <button class="icon-btn" @click="jumpPrevious" title="Jump Back">
          <SkipBack :size="16" />
        </button>
        <button class="icon-btn" @click="jumpNext" title="Jump Forward">
          <SkipForward :size="16" />
        </button>

        <!-- Speed Selector -->
        <div class="speed-selector">
          <button
            v-for="s in speeds"
            :key="s"
            class="speed-pill"
            :class="{ active: timelineStore.playbackSpeed === s }"
            @click="timelineStore.setSpeed(s)"
          >
            {{ s }}x
          </button>
        </div>
      </div>

      <!-- Center: Scrubber & Progress -->
      <div class="controls-center">
        <div class="track-header">
          <div class="location-pill">
            <component :is="modeIcon" :size="14" class="mode-icon-accent" />
            <span class="location-text">{{ currentLocationTitle }}</span>
          </div>

          <div class="date-badge">
            {{ formattedDate }}
          </div>
        </div>

        <div class="scrubber-container">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="timelineStore.currentOverallProgress * 100"
            @input="onScrubberInput"
            class="timeline-slider"
          />
          <div
            class="slider-fill"
            :style="{ width: `${timelineStore.currentOverallProgress * 100}%` }"
          ></div>
        </div>
      </div>

      <!-- Right: Summary Metric -->
      <div class="controls-right">
        <div class="progress-percent">
          {{ Math.round(timelineStore.currentOverallProgress * 100) }}%
        </div>
        <div class="segment-counter">
          {{ timelineStore.playbackIndex + 1 }} / {{ timelineStore.filteredSegments.length }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-bar-wrapper {
  position: absolute;
  bottom: 24px;
  left: 24px;
  right: 24px;
  display: flex;
  justify-content: center;
  z-index: 20;
}

.timeline-bar {
  width: 100%;
  max-width: 1100px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  border-radius: var(--radius-lg);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.controls-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.playback-btn.play-main {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, #0099ff 100%);
  border: none;
  color: #05070e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 0 20px var(--accent-cyan-glow);
  transition: var(--transition-smooth);
}

.playback-btn.play-main:hover {
  transform: scale(1.08);
  box-shadow: 0 0 28px var(--accent-cyan);
}

.playback-btn.play-main.playing {
  background: linear-gradient(135deg, #ff2a6d 0%, #ff5533 100%);
  color: #ffffff;
  box-shadow: 0 0 20px rgba(255, 42, 109, 0.5);
}

.play-icon-offset {
  margin-left: 2px;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.speed-selector {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  margin-left: 4px;
}

.speed-pill {
  padding: 4px 7px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.speed-pill:hover {
  color: #ffffff;
}

.speed-pill.active {
  background: var(--accent-cyan);
  color: #05070e;
}

.controls-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.location-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.mode-icon-accent {
  color: var(--accent-cyan);
}

.location-text {
  max-width: 380px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-badge {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.scrubber-container {
  position: relative;
  width: 100%;
  height: 8px;
  display: flex;
  align-items: center;
}

.timeline-slider {
  width: 100%;
  height: 6px;
  position: relative;
  z-index: 2;
  background: transparent;
}

.slider-fill {
  position: absolute;
  left: 0;
  top: 1px;
  height: 6px;
  background: linear-gradient(90deg, #00f0ff 0%, #a259ff 100%);
  border-radius: 3px;
  pointer-events: none;
  z-index: 1;
  box-shadow: 0 0 10px var(--accent-cyan-glow);
}

.controls-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 60px;
}

.progress-percent {
  font-size: 15px;
  font-weight: 700;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.segment-counter {
  font-size: 11px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

@media (max-width: 768px) {
  .timeline-bar {
    flex-direction: column;
    padding: 12px;
  }
  .controls-left, .controls-center, .controls-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
