<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import {
  Compass,
  X,
  Search,
  Pencil,
  MapPin,
  Calendar,
  Clock,
  Navigation,
  ArrowRight,
  Filter
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()
const searchQuery = ref('')

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

const filteredTripSegments = computed(() => {
  let list = timelineStore.filteredSegments
  if (!searchQuery.value.trim()) return list

  const q = searchQuery.value.toLowerCase().trim()
  return list.filter(s =>
    (s.city && s.city.toLowerCase().includes(q)) ||
    (s.country && s.country.toLowerCase().includes(q)) ||
    (s.placeName && s.placeName.toLowerCase().includes(q)) ||
    (s.activityType && s.activityType.toLowerCase().includes(q))
  )
})

const onEditSegment = (seg: any) => {
  timelineStore.openSegmentEditor(seg)
}

const onFocusSegment = (seg: any, index: number) => {
  timelineStore.playbackIndex = index
  timelineStore.playbackSegmentProgress = 0
  timelineStore.updateActiveJourneyState()
}

const formatDistance = (meters: number) => {
  const km = meters / 1000
  if (km >= 1) return `${km.toFixed(1)} km`
  return `${Math.round(meters)} m`
}

const formatDuration = (mins: number) => {
  if (mins >= 1440) return `${(mins / 1440).toFixed(1)} days`
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`
  return `${mins} mins`
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
</script>

<template>
  <div class="overview-drawer glass-panel-elevated" v-if="timelineStore.isOverviewOpen">
    <div class="overview-header">
      <div class="header-titles">
        <div class="title-row">
          <Compass :size="18" class="text-cyan" />
          <h3>Trip Overview & Itinerary</h3>
        </div>
        <span class="header-sub">
          {{ timelineStore.filteredStats.totalDistanceKm.toLocaleString() }} km • {{ filteredTripSegments.length }} segments
        </span>
      </div>

      <button class="close-btn" @click="timelineStore.isOverviewOpen = false">
        <X :size="18" />
      </button>
    </div>

    <!-- Search / Filter Bar -->
    <div class="search-box">
      <Search :size="14" class="search-icon" />
      <input
        type="text"
        v-model="searchQuery"
        placeholder="Filter by city, country or transport..."
        class="search-input"
      />
      <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
        <X :size="12" />
      </button>
    </div>

    <!-- Chronological Segment Cards List -->
    <div class="overview-feed">
      <div
        v-for="(seg, idx) in filteredTripSegments"
        :key="seg.id"
        class="itinerary-card"
        :class="{ active: timelineStore.playbackIndex === idx }"
      >
        <!-- Emoji Badge -->
        <div class="card-emoji-box">
          <span class="card-emoji">{{ getEmoji(seg.activityType) }}</span>
        </div>

        <!-- Main Itinerary Content -->
        <div class="card-body" @click="onFocusSegment(seg, idx)">
          <div class="card-top">
            <span class="card-title">
              {{ seg.type === 'visit' ? (seg.placeName || 'Stay') : (seg.activityType || 'Travel Activity') }}
            </span>
            <span class="card-distance" v-if="seg.distanceMeters">
              {{ formatDistance(seg.distanceMeters) }}
            </span>
          </div>

          <div class="card-location">
            <MapPin :size="11" class="text-rose" />
            <span>{{ seg.city ? `${seg.city}, ${seg.country}` : 'Location' }}</span>
          </div>

          <div class="card-meta">
            <div class="meta-item">
              <Calendar :size="11" />
              <span>{{ formatDate(seg.startTime) }}</span>
            </div>
            <div class="meta-item">
              <Clock :size="11" />
              <span>{{ formatTime(seg.startTime) }} ({{ formatDuration(seg.durationMinutes) }})</span>
            </div>
          </div>
        </div>

        <!-- Inline Quick Edit Button -->
        <div class="card-actions">
          <button
            class="edit-btn"
            @click="onEditSegment(seg)"
            title="Correct / Change Travel Method"
          >
            <Pencil :size="13" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <div v-if="filteredTripSegments.length === 0" class="empty-state">
        No segments found matching your search.
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-drawer {
  position: absolute;
  top: 86px;
  left: 20px;
  width: 440px;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  z-index: 30;
  border-radius: var(--radius-lg);
  overflow: hidden;
  animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.overview-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-row h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
}

.header-sub {
  font-size: 11px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
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

.search-box {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 32px;
  color: var(--text-dim);
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 34px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 12px;
  outline: none;
  transition: var(--transition-smooth);
}

.search-input:focus {
  border-color: var(--accent-cyan);
}

.clear-search {
  position: absolute;
  right: 30px;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
}

.overview-feed {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.itinerary-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  transition: var(--transition-smooth);
}

.itinerary-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}

.itinerary-card.active {
  background: rgba(0, 240, 255, 0.12);
  border-color: var(--accent-cyan);
}

.card-emoji-box {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(0, 240, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-emoji {
  font-size: 18px;
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.card-distance {
  font-size: 11px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-weight: 600;
}

.card-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 10px;
  color: var(--text-dim);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-actions {
  display: flex;
  align-items: center;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  color: var(--text-main);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.edit-btn:hover {
  background: rgba(0, 240, 255, 0.2);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.empty-state {
  text-align: center;
  padding: 30px 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.text-cyan { color: var(--accent-cyan); }
.text-rose { color: var(--accent-rose); }
</style>
