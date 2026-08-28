<script setup lang="ts">
import { computed } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import confetti from 'canvas-confetti'
import {
  BarChart3,
  X,
  Plane,
  Car,
  Train,
  Footprints,
  Globe2,
  MapPin,
  Flame,
  Award,
  Sparkles
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()

const stats = computed(() => timelineStore.filteredStats)

const earthLaps = computed(() => {
  const km = stats.value.totalDistanceKm
  return (km / 40075).toFixed(1)
})

const moonPercent = computed(() => {
  const km = stats.value.totalDistanceKm
  return ((km / 384400) * 100).toFixed(1)
})

const triggerCelebration = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  })
}
</script>

<template>
  <div class="stats-drawer glass-panel-elevated" v-if="timelineStore.isStatsOpen">
    <div class="stats-header">
      <div class="header-title">
        <BarChart3 :size="18" class="text-cyan" />
        <h3>Travel Analytics</h3>
      </div>
      <button class="close-btn" @click="timelineStore.isStatsOpen = false">
        <X :size="18" />
      </button>
    </div>

    <div class="stats-body">
      <!-- Main Metric Hero Card -->
      <div class="hero-metric-card">
        <div class="metric-label">TOTAL DISTANCE TRAVELED</div>
        <div class="metric-value-huge">
          {{ stats.totalDistanceKm.toLocaleString() }} <span class="metric-unit">km</span>
        </div>
        <div class="metric-subtext">
          <Globe2 :size="14" class="text-cyan" />
          <span>Equivalent to <strong>{{ earthLaps }}x</strong> around the Earth</span>
        </div>
        <div class="metric-subtext">
          <Sparkles :size="14" class="text-purple" />
          <span><strong>{{ moonPercent }}%</strong> of the way to the Moon!</span>
        </div>
      </div>

      <!-- Mode Breakdown Grid -->
      <div class="section-title">Mode Breakdown</div>
      <div class="mode-grid">
        <div class="mode-card flight">
          <div class="mode-icon-box">
            <Plane :size="18" />
          </div>
          <div class="mode-info">
            <div class="mode-name">Flights</div>
            <div class="mode-km">{{ stats.flightKm.toLocaleString() }} km</div>
            <div class="mode-meta">{{ stats.flightCount }} flights (Longest: {{ stats.longestFlightKm.toLocaleString() }} km)</div>
          </div>
        </div>

        <div class="mode-card drive">
          <div class="mode-icon-box">
            <Car :size="18" />
          </div>
          <div class="mode-info">
            <div class="mode-name">Road Trips</div>
            <div class="mode-km">{{ stats.driveKm.toLocaleString() }} km</div>
            <div class="mode-meta">{{ stats.driveCount }} journeys</div>
          </div>
        </div>

        <div class="mode-card train">
          <div class="mode-icon-box">
            <Train :size="18" />
          </div>
          <div class="mode-info">
            <div class="mode-name">Rail & Transit</div>
            <div class="mode-km">{{ stats.trainKm.toLocaleString() }} km</div>
            <div class="mode-meta">{{ stats.trainCount }} trips</div>
          </div>
        </div>

        <div class="mode-card walk">
          <div class="mode-icon-box">
            <Footprints :size="18" />
          </div>
          <div class="mode-info">
            <div class="mode-name">Walking & Hikes</div>
            <div class="mode-km">{{ stats.walkKm.toLocaleString() }} km</div>
            <div class="mode-meta">{{ stats.walkCount }} walks</div>
          </div>
        </div>
      </div>

      <!-- Countries Visited -->
      <div class="section-title">
        <span>Countries & Regions Visited</span>
        <span class="count-badge">{{ stats.countries.length }}</span>
      </div>
      <div class="country-pill-list">
        <div v-for="c in stats.countries" :key="c" class="country-pill">
          <span class="pill-dot"></span>
          <span>{{ c }}</span>
        </div>
        <div v-if="stats.countries.length === 0" class="empty-hint">
          Upload JSON or load demo to discover visited countries!
        </div>
      </div>

      <!-- Cities Visited -->
      <div class="section-title">
        <span>Major Cities & Stops</span>
        <span class="count-badge">{{ stats.cities.length }}</span>
      </div>
      <div class="city-pill-list">
        <div v-for="city in stats.cities.slice(0, 20)" :key="city" class="city-pill">
          <MapPin :size="12" />
          <span>{{ city }}</span>
        </div>
      </div>

      <!-- Celebrate Button -->
      <div class="celebrate-wrapper">
        <button class="celebrate-btn" @click="triggerCelebration">
          <Award :size="18" />
          <span>Celebrate Milestones 🎉</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-drawer {
  position: absolute;
  top: 86px;
  right: 20px;
  width: 400px;
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

.stats-header {
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

.stats-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-metric-card {
  padding: 18px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(157, 78, 221, 0.15) 100%);
  border: 1px solid var(--border-active);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.metric-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--accent-cyan);
}

.metric-value-huge {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  color: #ffffff;
  margin: 6px 0 10px;
}

.metric-unit {
  font-size: 18px;
  font-weight: 500;
  color: var(--text-muted);
}

.metric-subtext {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-main);
  margin-top: 4px;
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

.count-badge {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
}

.mode-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.mode-card {
  padding: 12px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-card.flight .mode-icon-box {
  background: rgba(0, 240, 255, 0.15);
  color: var(--accent-cyan);
}
.mode-card.drive .mode-icon-box {
  background: rgba(255, 107, 53, 0.15);
  color: var(--accent-orange);
}
.mode-card.train .mode-icon-box {
  background: rgba(0, 255, 157, 0.15);
  color: var(--accent-emerald);
}
.mode-card.walk .mode-icon-box {
  background: rgba(255, 42, 109, 0.15);
  color: var(--accent-rose);
}

.mode-icon-box {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mode-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.mode-km {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  font-family: var(--font-display);
}

.mode-meta {
  font-size: 10px;
  color: var(--text-dim);
}

.country-pill-list, .city-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.country-pill, .city-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  font-size: 12px;
  color: var(--text-main);
}

.pill-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-cyan);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-dim);
  font-style: italic;
}

.celebrate-wrapper {
  margin-top: 10px;
}

.celebrate-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: linear-gradient(135deg, #ffd700 0%, #ff6b35 100%);
  border: none;
  color: #060810;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.3);
  transition: var(--transition-smooth);
}

.celebrate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(255, 215, 0, 0.5);
}

.text-cyan {
  color: var(--accent-cyan);
}
.text-purple {
  color: var(--accent-purple);
}
</style>
