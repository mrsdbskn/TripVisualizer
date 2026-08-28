<script setup lang="ts">
import { ref } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import type { GlobeTheme, CameraMode } from '../../types/timeline'
import {
  Compass,
  UploadCloud,
  Sparkles,
  BarChart3,
  Calendar,
  Share2,
  Globe,
  Video,
  Layers
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const themes: { id: GlobeTheme; label: string; icon: string }[] = [
  { id: 'satellite', label: 'Photoreal Satellite', icon: '🛰️' },
  { id: 'neon', label: 'Cyber Neon', icon: '🌙' },
  { id: 'atlas', label: 'Atlas Minimal', icon: '🗺️' },
  { id: 'night', label: 'City Lights', icon: '🌆' }
]

const cameraModes: { id: CameraMode; label: string; icon: string }[] = [
  { id: 'follow', label: 'Follow Cam', icon: '🎥' },
  { id: 'bird', label: "Bird's Eye", icon: '🦅' },
  { id: 'orbit', label: 'Cinematic Orbit', icon: '🔄' },
  { id: 'free', label: 'Free Orbit', icon: '🌐' }
]

const isThemeMenuOpen = ref(false)
const isCameraMenuOpen = ref(false)

const selectTheme = (theme: GlobeTheme) => {
  timelineStore.setTheme(theme)
  isThemeMenuOpen.value = false
}

const selectCamera = (mode: CameraMode) => {
  timelineStore.setCameraMode(mode)
  isCameraMenuOpen.value = false
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
          <span class="brand-badge">3D GLOBE</span>
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
      <!-- Theme Switcher Dropdown -->
      <div class="dropdown-wrapper">
        <button
          class="glass-btn"
          @click="isThemeMenuOpen = !isThemeMenuOpen; isCameraMenuOpen = false"
        >
          <Globe :size="16" />
          <span>{{ themes.find(t => t.id === timelineStore.globeTheme)?.label }}</span>
        </button>

        <div class="dropdown-menu glass-panel-elevated" v-if="isThemeMenuOpen">
          <div
            v-for="t in themes"
            :key="t.id"
            class="dropdown-item"
            :class="{ active: timelineStore.globeTheme === t.id }"
            @click="selectTheme(t.id)"
          >
            <span>{{ t.icon }}</span>
            <span>{{ t.label }}</span>
          </div>
        </div>
      </div>

      <!-- Camera Mode Dropdown -->
      <div class="dropdown-wrapper">
        <button
          class="glass-btn"
          @click="isCameraMenuOpen = !isCameraMenuOpen; isThemeMenuOpen = false"
        >
          <Video :size="16" />
          <span>{{ cameraModes.find(c => c.id === timelineStore.cameraMode)?.label }}</span>
        </button>

        <div class="dropdown-menu glass-panel-elevated" v-if="isCameraMenuOpen">
          <div
            v-for="c in cameraModes"
            :key="c.id"
            class="dropdown-item"
            :class="{ active: timelineStore.cameraMode === c.id }"
            @click="selectCamera(c.id)"
          >
            <span>{{ c.icon }}</span>
            <span>{{ c.label }}</span>
          </div>
        </div>
      </div>

      <!-- Filter Toggle -->
      <button
        class="glass-btn"
        :class="{ active: timelineStore.isFilterOpen }"
        @click="timelineStore.isFilterOpen = !timelineStore.isFilterOpen"
        title="Filter by Year or Trip Cluster"
      >
        <Calendar :size="16" />
        <span>Dates</span>
      </button>

      <!-- Stats Toggle -->
      <button
        class="glass-btn"
        :class="{ active: timelineStore.isStatsOpen }"
        @click="timelineStore.isStatsOpen = !timelineStore.isStatsOpen"
        title="View Travel Analytics & Metrics"
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
  z-index: 20;
  border-radius: var(--radius-lg);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  min-width: 190px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 50;
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

.text-amber {
  color: var(--accent-amber);
}

@media (max-width: 900px) {
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
