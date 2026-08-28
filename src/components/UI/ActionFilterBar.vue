<script setup lang="ts">
import { useTimelineStore } from '../../stores/timelineStore'
import {
  Plane,
  Car,
  Train,
  Footprints,
  MapPin,
  Building2,
  SlidersHorizontal
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()
</script>

<template>
  <div class="action-filter-bar glass-panel">
    <div class="filter-label">
      <SlidersHorizontal :size="13" class="text-cyan" />
      <span>Visibility</span>
    </div>

    <div class="filter-chips">
      <!-- Only Visited Cities Mode -->
      <button
        class="filter-chip special"
        :class="{ active: timelineStore.actionFilters.onlyVisitedCities }"
        @click="timelineStore.toggleActionFilter('onlyVisitedCities')"
        title="Only show visited cities & major inter-city travel"
      >
        <Building2 :size="13" />
        <span>Only Cities</span>
      </button>

      <div class="divider"></div>

      <!-- Flights Toggle -->
      <button
        class="filter-chip"
        :class="{ active: timelineStore.actionFilters.showFlights }"
        @click="timelineStore.toggleActionFilter('showFlights')"
        title="Toggle Flights"
      >
        <Plane :size="13" />
        <span>Flights</span>
      </button>

      <!-- Drives Toggle -->
      <button
        class="filter-chip"
        :class="{ active: timelineStore.actionFilters.showDrives }"
        @click="timelineStore.toggleActionFilter('showDrives')"
        title="Toggle Road Trips & Car Rides"
      >
        <Car :size="13" />
        <span>Drives</span>
      </button>

      <!-- Trains Toggle -->
      <button
        class="filter-chip"
        :class="{ active: timelineStore.actionFilters.showTrains }"
        @click="timelineStore.toggleActionFilter('showTrains')"
        title="Toggle Trains & Subway"
      >
        <Train :size="13" />
        <span>Trains</span>
      </button>

      <!-- Walks Toggle -->
      <button
        class="filter-chip"
        :class="{ active: timelineStore.actionFilters.showWalks }"
        @click="timelineStore.toggleActionFilter('showWalks')"
        title="Toggle Walking & Hikes"
      >
        <Footprints :size="13" />
        <span>Walks</span>
      </button>

      <!-- Visited Places Toggle -->
      <button
        class="filter-chip"
        :class="{ active: timelineStore.actionFilters.showVisits }"
        @click="timelineStore.toggleActionFilter('showVisits')"
        title="Toggle Visited Places"
      >
        <MapPin :size="13" />
        <span>Stays</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.action-filter-bar {
  position: absolute;
  top: 86px;
  left: 20px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 15;
  border-radius: var(--radius-full);
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}

.divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  margin: 0 2px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.filter-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.filter-chip.active {
  background: rgba(0, 240, 255, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.filter-chip.special.active {
  background: linear-gradient(135deg, rgba(255, 42, 109, 0.25) 0%, rgba(157, 78, 221, 0.3) 100%);
  border-color: var(--accent-rose);
  color: #ffffff;
  box-shadow: 0 0 12px rgba(255, 42, 109, 0.4);
}

.text-cyan {
  color: var(--accent-cyan);
}

@media (max-width: 900px) {
  .action-filter-bar {
    top: 140px;
    flex-wrap: wrap;
  }
}
</style>
