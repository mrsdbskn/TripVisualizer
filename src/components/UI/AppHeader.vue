<script setup lang="ts">
import { ref } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import type { MapLayerType } from '../../types/timeline'
import {
  Compass,
  UploadCloud,
  Sparkles,
  BarChart3,
  Calendar,
  Share2,
  Globe,
  Building2,
  MapPin,
  ListOrdered,
  Layers,
  Map
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const mapLayers: { id: MapLayerType; label: string; icon: string }[] = [
  { id: 'satellite', label: 'Satellite Map', icon: '🛰️' },
  { id: 'dark', label: 'Dark Basemap', icon: '🌙' },
  { id: 'light', label: 'Light Basemap', icon: '🗺️' },
  { id: 'topo', label: 'Topographic', icon: '🏔️' }
]

const isLayerMenuOpen = ref(false)
const isCityMenuOpen = ref(false)

const selectLayer = (layer: MapLayerType) => {
  timelineStore.setMapLayer(layer)
  isLayerMenuOpen.value = false
}

const selectCity = (cityName: string | null) => {
  timelineStore.selectCity(cityName)
  isCityMenuOpen.value = false
}
</script>

<template>
  <header class="app-header glass-panel">
    <div class="header-left">
      <div class="brand">
        <div class="brand-icon-wrapper">
          <Compass class="brand-icon" />
        </div>
        <div class="brand-text">
          <h1 class="brand-title">Trip<span class="brand-highlight">Visualizer</span></h1>
          <span class="brand-badge">WORLD MAP</span>
        </div>
      </div>

      <div class="header-actions">
        <button
          class="glass-btn primary"
          @click="timelineStore.isUploadOpen = true"
          title="Upload Google Location History Timeline JSON"
        >
          <UploadCloud :size="16" />
          <span>Import JSON</span>
        </button>

        <button
          class="glass-btn"
          @click="timelineStore.loadSample()"
          title="Load curated multi-continent demo tour"
        >
          <Sparkles :size="16" class="text-amber" />
          <span>Load Demo</span>
        </button>
      </div>
    </div>

    <div class="header-right">
      <!-- Trip Overview Itinerary Button -->
      <button
        class="glass-btn"
        :class="{ active: timelineStore.isOverviewOpen }"
        @click="timelineStore.toggleOverview()"
        title="Open Full Trip Overview Itinerary with Edit Controls"
      >
        <ListOrdered :size="16" />
        <span>Trip Overview</span>
      </button>

      <!-- City Drilldown Dropdown Selector -->
      <div class="dropdown-wrapper" v-if="timelineStore.availableCities.length > 0">
        <button
          class="glass-btn"
          :class="{ active: timelineStore.selectedCity !== null }"
          @click="isCityMenuOpen = !isCityMenuOpen; isLayerMenuOpen = false"
        >
          <Building2 :size="16" />
          <span>{{ timelineStore.selectedCity || 'Explore City' }}</span>
        </button>

        <div class="dropdown-menu glass-panel-elevated city-dropdown-scroll" v-if="isCityMenuOpen">
          <div
            class="dropdown-item"
            :class="{ active: timelineStore.selectedCity === null }"
            @click="selectCity(null)"
          >
            <Globe :size="14" />
            <span>All World / Full Map</span>
          </div>

          <div
            v-for="c in timelineStore.availableCities.slice(0, 25)"
            :key="c.name"
            class="dropdown-item"
            :class="{ active: timelineStore.selectedCity === c.name }"
            @click="selectCity(c.name)"
          >
            <MapPin :size="14" class="text-rose" />
            <div class="city-opt">
              <span class="city-opt-name">{{ c.name }}</span>
              <span class="city-opt-country">{{ c.country }} ({{ c.visitCount }} visits)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Basemap / Satellite Switcher Dropdown -->
      <div class="dropdown-wrapper">
        <button
          class="glass-btn"
          @click="isLayerMenuOpen = !isLayerMenuOpen; isCityMenuOpen = false"
        >
          <Layers :size="16" />
          <span>{{ mapLayers.find(l => l.id === timelineStore.mapLayer)?.label }}</span>
        </button>

        <div class="dropdown-menu glass-panel-elevated" v-if="isLayerMenuOpen">
          <div
            v-for="l in mapLayers"
            :key="l.id"
            class="dropdown-item"
            :class="{ active: timelineStore.mapLayer === l.id }"
            @click="selectLayer(l.id)"
          >
            <span>{{ l.icon }}</span>
            <span>{{ l.label }}</span>
          </div>
        </div>
      </div>

      <!-- Date Frame Setter Toggle -->
      <button
        class="glass-btn"
        :class="{ active: timelineStore.isFilterOpen }"
        @click="timelineStore.isFilterOpen = !timelineStore.isFilterOpen"
        title="Set Exact Date Ranges & Timeline Window"
      >
        <Calendar :size="16" />
        <span>Dates</span>
      </button>

      <!-- Stats Toggle -->
      <button
        class="glass-btn"
        :class="{ active: timelineStore.isStatsOpen }"
        @click="timelineStore.isStatsOpen = !timelineStore.isStatsOpen"
        title="View Travel Analytics & City Metrics"
      >
        <BarChart3 :size="16" />
        <span>Stats</span>
      </button>

      <!-- Instagram Story Studio -->
      <button
        class="glass-btn story-export-btn"
        @click="timelineStore.isExportOpen = true"
        title="Export 9:16 Instagram Story Video & Snapshots"
      >
        <Share2 :size="16" />
        <span>Story Studio</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: absolute;
  top: 16px;
  left: 20px;
  right: 20px;
  height: 60px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1000;
  border-radius: var(--radius-lg);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 12px;
}

.brand-icon-wrapper {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(157, 78, 221, 0.3) 100%);
  border: 1px solid var(--border-active);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 16px var(--accent-cyan-glow);
}

.brand-icon {
  color: var(--accent-cyan);
}

.brand-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #ffffff;
}

.brand-highlight {
  background: linear-gradient(135deg, var(--accent-cyan) 0%, #c77dff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-badge {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 1px;
  padding: 2px 6px;
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdown-wrapper {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 200px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 1050;
}

.city-dropdown-scroll {
  max-height: 280px;
  overflow-y: auto;
  min-width: 240px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.dropdown-item.active {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
}

.city-opt {
  display: flex;
  flex-direction: column;
}

.city-opt-name {
  font-weight: 600;
}

.city-opt-country {
  font-size: 10px;
  color: var(--text-dim);
}

.story-export-btn {
  background: linear-gradient(135deg, rgba(255, 42, 109, 0.25) 0%, rgba(255, 107, 53, 0.25) 100%);
  border-color: rgba(255, 42, 109, 0.4);
  color: #ffffff;
}

.story-export-btn:hover {
  background: linear-gradient(135deg, rgba(255, 42, 109, 0.4) 0%, rgba(255, 107, 53, 0.4) 100%);
  border-color: var(--accent-rose);
  box-shadow: 0 0 16px rgba(255, 42, 109, 0.4);
}

.text-amber { color: var(--accent-amber); }
.text-rose { color: var(--accent-rose); }

@media (max-width: 1100px) {
  .app-header {
    height: auto;
    padding: 12px;
    flex-wrap: wrap;
  }
  .header-left, .header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
