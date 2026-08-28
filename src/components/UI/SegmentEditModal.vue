<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import type { ActivityType } from '../../types/timeline'
import {
  Sparkles,
  X,
  Plane,
  Car,
  Train,
  Bus,
  Footprints,
  Navigation,
  MapPin,
  Check
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const seg = computed(() => timelineStore.editingSegment)

const transportOptions: { type: ActivityType; label: string; emoji: string; desc: string }[] = [
  { type: 'FLYING', label: 'Flight', emoji: '✈️', desc: '3D curved flight arc' },
  { type: 'IN_PASSENGER_VEHICLE', label: 'Car / Drive', emoji: '🚗', desc: 'Road trip surface route' },
  { type: 'IN_TRAIN', label: 'Train / Rail', emoji: '🚆', desc: 'High-speed railway path' },
  { type: 'IN_BUS', label: 'Bus', emoji: '🚌', desc: 'Bus / coach route' },
  { type: 'WALKING', label: 'Walk', emoji: '🚶', desc: 'Pedestrian walk / steps' },
  { type: 'RUNNING', label: 'Run', emoji: '🏃', desc: 'Running / Jogging' },
  { type: 'CYCLING', label: 'Bicycle', emoji: '🚴', desc: 'Cycling ride' },
  { type: 'IN_FERRY', label: 'Ferry / Boat', emoji: '⛴️', desc: 'Maritime travel' }
]

const selectTransport = (type: ActivityType) => {
  if (seg.value) {
    timelineStore.overrideSegmentActivity(seg.value.id, type)
  }
}
</script>

<template>
  <div class="modal-backdrop" v-if="timelineStore.isSegmentEditOpen && seg" @click.self="timelineStore.isSegmentEditOpen = false">
    <div class="edit-modal glass-panel-elevated">
      <div class="modal-header">
        <div class="modal-title-group">
          <Sparkles :size="18" class="text-cyan" />
          <h3>Correct Travel Method</h3>
        </div>
        <button class="modal-close" @click="timelineStore.isSegmentEditOpen = false">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-body">
        <div class="seg-summary-card">
          <div class="seg-loc">{{ seg.city ? `${seg.city}, ${seg.country}` : (seg.placeName || 'Journey Segment') }}</div>
          <div class="seg-meta">
            <span>{{ new Date(seg.startTime).toLocaleDateString() }}</span>
            <span v-if="seg.distanceMeters"> • {{ (seg.distanceMeters / 1000).toFixed(1) }} km</span>
            <span v-if="seg.durationMinutes"> • {{ seg.durationMinutes }} mins</span>
          </div>
        </div>

        <div class="section-label">Select Correct Transport:</div>

        <div class="options-grid">
          <button
            v-for="opt in transportOptions"
            :key="opt.type"
            class="transport-card"
            :class="{ active: seg.activityType === opt.type }"
            @click="selectTransport(opt.type)"
          >
            <span class="opt-emoji">{{ opt.emoji }}</span>
            <div class="opt-text">
              <div class="opt-label">{{ opt.label }}</div>
              <div class="opt-desc">{{ opt.desc }}</div>
            </div>
            <Check v-if="seg.activityType === opt.type" :size="16" class="check-icon" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(4, 6, 12, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
}

.edit-modal {
  width: 90%;
  max-width: 480px;
  background: var(--bg-surface-elevated);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), var(--glass-glow);
}

.modal-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-group h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: #ffffff;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.seg-summary-card {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.seg-loc {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.seg-meta {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.transport-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: var(--transition-smooth);
}

.transport-card:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.transport-card.active {
  background: rgba(0, 240, 255, 0.15);
  border-color: var(--accent-cyan);
}

.opt-emoji {
  font-size: 24px;
}

.opt-text {
  flex: 1;
  min-width: 0;
}

.opt-label {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.opt-desc {
  font-size: 10px;
  color: var(--text-dim);
}

.check-icon {
  color: var(--accent-cyan);
}

.text-cyan { color: var(--accent-cyan); }
</style>
