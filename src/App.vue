<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useTimelineStore } from './stores/timelineStore'
import MapView from './components/Map/MapView.vue'
import AppHeader from './components/UI/AppHeader.vue'
import ActionFilterBar from './components/UI/ActionFilterBar.vue'
import TimelineBar from './components/UI/TimelineBar.vue'
import DateRangeFilter from './components/UI/DateRangeFilter.vue'
import TripOverviewDrawer from './components/UI/TripOverviewDrawer.vue'
import CityDetailDrawer from './components/UI/CityDetailDrawer.vue'
import StatsDrawer from './components/UI/StatsDrawer.vue'
import FileUploadModal from './components/UI/FileUploadModal.vue'
import StoryExportModal from './components/UI/StoryExportModal.vue'
import SegmentEditModal from './components/UI/SegmentEditModal.vue'

const timelineStore = useTimelineStore()
const mapViewRef = ref<InstanceType<typeof MapView> | null>(null)

onMounted(() => {
  timelineStore.loadSample()
  timelineStore.play()

  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const handleKeydown = (e: KeyboardEvent) => {
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
  } else if (e.key === 'o' || e.key === 'O') {
    timelineStore.toggleOverview()
  }
}
</script>

<template>
  <div class="app-root">
    <!-- Interactive 2D World Map (Satellite & Basemap Layers) -->
    <MapView ref="mapViewRef" />

    <!-- Top Floating Header -->
    <AppHeader />

    <!-- Quick Action / Transport Visibility Filters Bar -->
    <ActionFilterBar />

    <!-- Date Range & Frame Setter Drawer -->
    <DateRangeFilter />

    <!-- Trip Overview & Itinerary Drawer with Inline Edit Controls -->
    <TripOverviewDrawer />

    <!-- City Detailed Timeline Drilldown Drawer -->
    <CityDetailDrawer />

    <!-- Travel Stats Analytics & City Metrics Drawer -->
    <StatsDrawer />

    <!-- Bottom Playback Timeline Bar -->
    <TimelineBar />

    <!-- Upload JSON Modal -->
    <FileUploadModal />

    <!-- Instagram Story & Social Video Studio Modal -->
    <StoryExportModal
      :capture-snapshot="() => mapViewRef?.captureSnapshot() || ''"
      :get-canvas="() => mapViewRef?.getCanvas() || null"
    />

    <!-- Segment Activity / Transport Method Correction Modal -->
    <SegmentEditModal />
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
