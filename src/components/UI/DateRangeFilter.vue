<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import { Calendar, Compass, X, Check, Globe } from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const availableYears = computed(() => {
  if (timelineStore.years.length > 0) return timelineStore.years
  // Default range 2014 to 2026 if empty
  const list = []
  for (let y = 2026; y >= 2014; y--) {
    list.push({ year: y, totalDistanceKm: 0, segmentCount: 0, flightCount: 0, countriesCount: 0 })
  }
  return list
})

const selectYear = (year: number | null) => {
  timelineStore.setFilterYear(year)
}

const selectCluster = (clusterId: string) => {
  timelineStore.setFilterCluster(clusterId)
}

const clearFilter = () => {
  timelineStore.setFilterYear(null)
  timelineStore.setFilterCluster(null)
  timelineStore.setCustomTimeRange(null)
}
</script>

<template>
  <div class="filter-drawer glass-panel-elevated" v-if="timelineStore.isFilterOpen">
    <div class="filter-header">
      <div class="header-title">
        <Calendar :size="18" class="text-cyan" />
        <h3>Date & Trip Filter</h3>
      </div>
      <button class="close-btn" @click="timelineStore.isFilterOpen = false">
        <X :size="18" />
      </button>
    </div>

    <div class="filter-body">
      <!-- Year Selection Section -->
      <div class="filter-section">
        <div class="section-title">
          <span>Filter by Year</span>
          <button
            class="clear-link"
            v-if="timelineStore.selectedYear || timelineStore.selectedClusterId"
            @click="clearFilter"
          >
            Show All Time
          </button>
        </div>

        <div class="year-grid">
          <button
            class="year-chip"
            :class="{ active: timelineStore.selectedYear === null && timelineStore.selectedClusterId === null }"
            @click="selectYear(null)"
          >
            All Time
          </button>
          <button
            v-for="y in availableYears"
            :key="y.year"
            class="year-chip"
            :class="{ active: timelineStore.selectedYear === y.year }"
            @click="selectYear(y.year)"
          >
            <span class="year-num">{{ y.year }}</span>
            <span class="year-dist" v-if="y.totalDistanceKm > 0">
              {{ Math.round(y.totalDistanceKm).toLocaleString() }} km
            </span>
          </button>
        </div>
      </div>

      <!-- Trip Clusters / Vacations Section -->
      <div class="filter-section" v-if="timelineStore.clusters.length > 0">
        <div class="section-title">
          <span>Detected Trip Journeys</span>
          <span class="badge">{{ timelineStore.clusters.length }}</span>
        </div>

        <div class="cluster-list">
          <div
            v-for="cluster in timelineStore.clusters.slice(0, 12)"
            :key="cluster.id"
            class="cluster-card"
            :class="{ active: timelineStore.selectedClusterId === cluster.id }"
            @click="selectCluster(cluster.id)"
          >
            <div class="cluster-icon">
              <Compass :size="16" />
            </div>
            <div class="cluster-info">
              <div class="cluster-title">{{ cluster.title }}</div>
              <div class="cluster-meta">{{ cluster.subtitle }}</div>
            </div>
            <div class="cluster-check" v-if="timelineStore.selectedClusterId === cluster.id">
              <Check :size="14" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-drawer {
  position: absolute;
  top: 86px;
  left: 20px;
  width: 380px;
  max-height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  z-index: 25;
  border-radius: var(--radius-lg);
  overflow: hidden;
  animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filter-header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-title h3 {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.filter-body {
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.clear-link {
  background: transparent;
  border: none;
  color: var(--accent-cyan);
  font-size: 11px;
  cursor: pointer;
}

.clear-link:hover {
  text-decoration: underline;
}

.badge {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.year-chip {
  padding: 8px 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  transition: var(--transition-smooth);
}

.year-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.year-chip.active {
  background: rgba(0, 240, 255, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
  box-shadow: 0 0 10px var(--accent-cyan-glow);
}

.year-num {
  font-weight: 600;
  font-size: 13px;
}

.year-dist {
  font-size: 9px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.cluster-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.cluster-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.cluster-card:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
}

.cluster-card.active {
  background: rgba(157, 78, 221, 0.15);
  border-color: var(--accent-purple);
}

.cluster-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: rgba(0, 240, 255, 0.1);
  color: var(--accent-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.cluster-info {
  flex: 1;
  min-width: 0;
}

.cluster-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cluster-meta {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cluster-check {
  color: var(--accent-cyan);
}

.text-cyan {
  color: var(--accent-cyan);
}
</style>
