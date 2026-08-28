<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTimelineStore } from './stores/timelineStore'
import GlobeCanvas from './components/Globe/GlobeCanvas.vue'
import AppHeader from './components/UI/AppHeader.vue'
import TimelineBar from './components/UI/TimelineBar.vue'
import DateRangeFilter from './components/UI/DateRangeFilter.vue'
import StatsDrawer from './components/UI/StatsDrawer.vue'
import FileUploadModal from './components/UI/FileUploadModal.vue'
import StoryExportModal from './components/UI/StoryExportModal.vue'

const timelineStore = useTimelineStore()
const globeCanvasRef = ref<InstanceType<typeof GlobeCanvas> | null>(null)

onMounted(() => {
  // Load rich multi-continent demo on initial load so the globe is instantly alive
  timelineStore.loadSample()
  timelineStore.play()

  // Setup keyboard shortcuts
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
  // Ignore if typing in inputs
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

  if (e.code === 'Space') {
    e.preventDefault()
    timelineStore.togglePlay()
  } else if (e.code === 'ArrowRight') {
    e.preventDefault()
    timelineStore.seek(Math.min(0.999, timelineStore.currentOverallProgress + 0.05))
  } else if (e.code === 'ArrowLeft') {
    e.preventDefault()
    timelineStore.seek(Math.max(0, timelineStore.currentOverallProgress - 0.05))
  } else if (e.key === 'c' || e.key === 'C') {
    // Cycle camera
    const modes = ['follow', 'bird', 'orbit', 'free'] as const
    const nextIdx = (modes.indexOf(timelineStore.cameraMode as any) + 1) % modes.length
    timelineStore.setCameraMode(modes[nextIdx])
  } else if (e.key === 't' || e.key === 'T') {
    // Cycle theme
    const themes = ['satellite', 'neon', 'atlas', 'night'] as const
    const nextIdx = (themes.indexOf(timelineStore.globeTheme as any) + 1) % themes.length
    timelineStore.setTheme(themes[nextIdx])
  }
}
</script>

<template>
  <div class="app-root">
    <!-- 3D WebGL Globe Viewport -->
    <GlobeCanvas ref="globeCanvasRef" />

    <!-- Top Floating Header -->
    <AppHeader />

    <!-- Date / Cluster Range Filter Drawer -->
    <DateRangeFilter />

    <!-- Travel Stats Drawer -->
    <StatsDrawer />

    <!-- Bottom Playback Timeline Bar -->
    <TimelineBar />

    <!-- Upload JSON Modal -->
    <FileUploadModal />

    <!-- Instagram Story & Social Video Studio Modal -->
    <StoryExportModal
      :capture-snapshot="() => globeCanvasRef?.captureSnapshot() || ''"
      :get-canvas="() => globeCanvasRef?.getCanvas() || null"
    />
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-space);
}
</style>
