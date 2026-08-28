<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  X,
  Play,
  ArrowLeft,
  Navigation,
  Footprints,
  Car,
  Plane,
  Train
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const city = computed(() => timelineStore.selectedCityDetail)

const closeCityDrawer = () => {
  timelineStore.selectCity(null)
}

const playCityTimeline = () => {
  timelineStore.play()
}

const formatDate = (ts: number) => {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (mins: number) => {
  if (mins >= 1440) {
    const days = (mins / 1440).toFixed(1)
    return `${days} days`
  }
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${h}h ${m}m`
  }
  return `${mins} mins`
}

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

const getEmoji = (type?: string) => {
  return EMOJI_MAP[type || 'UNKNOWN'] || '📍'
}

const openEditModal = (seg: any) => {
  timelineStore.openSegmentEditor(seg)
}
</script>

<template>
  <div class="city-drawer glass-panel-elevated" v-if="city && timelineStore.isCityDrawerOpen">
    <div class="city-header">
      <button class="back-btn" @click="closeCityDrawer" title="Back to World View">
        <ArrowLeft :size="16" />
      </button>

      <div class="city-header-titles">
        <div class="city-title-row">
          <Building2 :size="18" class="text-cyan" />
          <h2 class="city-name">{{ city.name }}</h2>
        </div>
        <span class="city-country">{{ city.country }}</span>
      </div>

      <button class="close-btn" @click="closeCityDrawer">
        <X :size="18" />
      </button>
    </div>

    <div class="city-body">
      <!-- Quick Stats Card -->
      <div class="city-stats-card">
        <div class="stat-col">
          <span class="stat-num">{{ city.visitCount }}</span>
          <span class="stat-lbl">Visits</span>
        </div>
        <div class="stat-col">
          <span class="stat-num">{{ (city.totalStayHours / 24).toFixed(1) }}</span>
          <span class="stat-lbl">Days Spent</span>
        </div>
        <div class="stat-col">
          <span class="stat-num">{{ city.segments.length }}</span>
          <span class="stat-lbl">Events</span>
        </div>
      </div>

      <!-- Play Button -->
      <button class="play-city-btn" @click="playCityTimeline">
        <Play :size="15" />
        <span>Play {{ city.name }} Journey</span>
      </button>

      <!-- Top Visited Places in this City -->
      <div class="city-section" v-if="city.topPlaces.length > 0">
        <div class="section-title">
          <span>Top Places & Stops</span>
        </div>
        <div class="places-list">
          <div v-for="place in city.topPlaces.slice(0, 5)" :key="place.name" class="place-pill">
            <MapPin :size="12" class="text-rose" />
            <span class="place-name">{{ place.name }}</span>
            <span class="place-count">{{ place.count }}x</span>
          </div>
        </div>
      </div>

      <!-- Chronological Detailed Timeline -->
      <div class="city-section">
        <div class="section-title">
          <span>Chronological Timeline</span>
          <span class="badge">{{ city.segments.length }} events</span>
        </div>

        <div class="timeline-feed">
          <div
            v-for="seg in city.segments.slice(0, 50)"
            :key="seg.id"
            class="feed-card"
            :class="seg.type"
          >
            <div class="feed-icon-box">
              <span class="feed-emoji">{{ getEmoji(seg.activityType) }}</span>
            </div>

            <div class="feed-content">
              <div class="feed-top">
                <span class="feed-title">
                  {{ seg.type === 'visit' ? (seg.placeName || 'Stay') : (seg.activityType || 'Activity') }}
                </span>
                <div class="feed-right-actions">
                  <span class="feed-duration">{{ formatDuration(seg.durationMinutes) }}</span>
                  <button class="feed-edit-btn" @click="openEditModal(seg)" title="Correct Travel Method">
                    ✏️
                  </button>
                </div>
              </div>

              <div class="feed-meta">
                <Calendar :size="11" />
                <span>{{ formatDate(seg.startTime) }}</span>
                <Clock :size="11" class="clock-margin" />
                <span>{{ formatTime(seg.startTime) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.city-drawer {
  position: absolute;
  top: 86px;
  right: 20px;
  width: 420px;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  z-index: 25;
  border-radius: var(--radius-lg);
  overflow: hidden;
  animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.city-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border-subtle);
}

.back-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: 6px;
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.city-header-titles {
  flex: 1;
  min-width: 0;
}

.city-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.city-name {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.city-country {
  font-size: 12px;
  color: var(--accent-cyan);
  margin-left: 26px;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: #ffffff;
}

.city-body {
  padding: 18px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.city-stats-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 12px;
  background: rgba(0, 240, 255, 0.05);
  border: 1px solid rgba(0, 240, 255, 0.2);
  border-radius: var(--radius-md);
  text-align: center;
}

.stat-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.stat-lbl {
  font-size: 10px;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.play-city-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(157, 78, 221, 0.3) 100%);
  border: 1px solid var(--accent-cyan);
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 0 16px var(--accent-cyan-glow);
  transition: var(--transition-smooth);
}

.play-city-btn:hover {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.4) 0%, rgba(157, 78, 221, 0.45) 100%);
  transform: translateY(-1px);
}

.city-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.badge {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.place-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 12px;
}

.place-name {
  flex: 1;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.place-count {
  font-size: 11px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.timeline-feed {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.feed-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.feed-card.visit .feed-icon-box {
  background: rgba(255, 42, 109, 0.15);
  color: var(--accent-rose);
}

.feed-card.activity .feed-icon-box {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
}

.feed-icon-box {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.feed-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.feed-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.feed-title {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.feed-right-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.feed-edit-btn {
  background: transparent;
  border: none;
  font-size: 11px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease, transform 0.2s ease;
  padding: 2px;
}

.feed-edit-btn:hover {
  opacity: 1;
  transform: scale(1.2);
}

.feed-emoji {
  font-size: 15px;
}

.feed-duration {
  font-size: 11px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
}

.feed-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-dim);
}

.clock-margin {
  margin-left: 6px;
}

.text-cyan { color: var(--accent-cyan); }
.text-rose { color: var(--accent-rose); }
</style>
