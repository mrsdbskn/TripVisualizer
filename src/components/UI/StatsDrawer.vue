<script setup lang="ts">
import { ref, computed } from 'vue'
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
  Sparkles,
  Building2,
  Clock,
  ArrowRight
} from 'lucide-vue-next'

const timelineStore = useTimelineStore()
const activeTab = ref<'overall' | 'cities'>('overall')

const stats = computed(() => timelineStore.filteredStats)
const cities = computed(() => timelineStore.availableCities)

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
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 }
  })
}

const focusCity = (cityName: string) => {
  timelineStore.selectCity(cityName)
}
</script>

<template>
  <div class="stats-drawer glass-panel-elevated" v-if="timelineStore.isStatsOpen">
    <div class="stats-header">
      <div class="header-title">
        <BarChart3 :size="18" class="text-cyan" />
        <h3>Travel Analytics & Stats</h3>
      </div>
      <button class="close-btn" @click="timelineStore.isStatsOpen = false">
        <X :size="18" />
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="stats-tabs">
      <button
        class="stats-tab-btn"
        :class="{ active: activeTab === 'overall' }"
        @click="activeTab = 'overall'"
      >
        <Globe2 :size="14" />
        <span>Overall Metrics</span>
      </button>
      <button
        class="stats-tab-btn"
        :class="{ active: activeTab === 'cities' }"
        @click="activeTab = 'cities'"
      >
        <Building2 :size="14" />
        <span>City Stats ({{ cities.length }})</span>
      </button>
    </div>

    <!-- Overall Metrics Tab -->
    <div class="stats-body" v-if="activeTab === 'overall'">
      <!-- Hero Metric -->
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
        <span>Countries Visited</span>
        <span class="count-badge">{{ stats.countries.length }}</span>
      </div>
      <div class="country-pill-list">
        <div v-for="c in stats.countries" :key="c" class="country-pill">
          <span class="pill-dot"></span>
          <span>{{ c }}</span>
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

    <!-- City Stats Matrix Tab -->
    <div class="stats-body" v-else>
      <div class="cities-grid">
        <div
          v-for="city in cities"
          :key="city.name"
          class="city-stat-card"
        >
          <div class="city-card-header">
            <div class="city-card-titles">
              <div class="city-name-row">
                <Building2 :size="15" class="text-cyan" />
                <span class="city-name">{{ city.name }}</span>
              </div>
              <span class="city-country-tag">{{ city.country }}</span>
            </div>

            <button class="city-focus-btn" @click="focusCity(city.name)">
              <span>Explore</span>
              <ArrowRight :size="12" />
            </button>
          </div>

          <!-- City Metric Columns -->
          <div class="city-metrics-row">
            <div class="c-metric">
              <span class="c-val">{{ (city.totalStayHours / 24).toFixed(1) }}</span>
              <span class="c-lbl">Days Stayed</span>
            </div>
            <div class="c-metric">
              <span class="c-val">{{ city.visitCount }}</span>
              <span class="c-lbl">Visits</span>
            </div>
            <div class="c-metric" v-if="city.localDistanceKm > 0">
              <span class="c-val">{{ city.localDistanceKm }}</span>
              <span class="c-lbl">Local km</span>
            </div>
          </div>

          <!-- Top Places in City -->
          <div class="city-places-preview" v-if="city.topPlaces.length > 0">
            <span class="places-lbl">Top Locations:</span>
            <div class="places-chips">
              <span v-for="p in city.topPlaces.slice(0, 3)" :key="p.name" class="p-chip">
                {{ p.name }} ({{ p.count }}x)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-drawer {
  position: absolute;
  top: 86px;
  right: 20px;
  width: 440px;
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

.stats-tabs {
  display: flex;
  padding: 8px 16px;
  gap: 8px;
  border-bottom: 1px solid var(--border-subtle);
}

.stats-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.stats-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.08);
}

.stats-tab-btn.active {
  background: rgba(0, 240, 255, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.stats-body {
  padding: 18px 20px;
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

.country-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.country-pill {
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

.celebrate-wrapper {
  margin-top: 6px;
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

/* City Stats Matrix */
.cities-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.city-stat-card {
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: var(--transition-smooth);
}

.city-stat-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(0, 240, 255, 0.3);
}

.city-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.city-card-titles {
  display: flex;
  flex-direction: column;
}

.city-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.city-name {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.city-country-tag {
  font-size: 11px;
  color: var(--text-dim);
  margin-left: 21px;
}

.city-focus-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  background: rgba(0, 240, 255, 0.12);
  border: 1px solid var(--accent-cyan);
  border-radius: 9999px;
  color: var(--accent-cyan);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.city-focus-btn:hover {
  background: var(--accent-cyan);
  color: #060810;
}

.city-metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: var(--radius-sm);
  text-align: center;
}

.c-metric {
  display: flex;
  flex-direction: column;
}

.c-val {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.c-lbl {
  font-size: 9px;
  color: var(--text-dim);
  text-transform: uppercase;
}

.city-places-preview {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.places-lbl {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
}

.places-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.p-chip {
  font-size: 10px;
  background: rgba(255, 255, 255, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--text-main);
}

.text-cyan { color: var(--accent-cyan); }
.text-purple { color: var(--accent-purple); }
</style>
