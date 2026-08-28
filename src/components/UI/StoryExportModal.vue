<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import { useExportStore } from '../../stores/exportStore'
import StoryOverlayFrame from './StoryOverlayFrame.vue'
import type { AspectRatioType } from '../../types/timeline'
import {
  Share2,
  Video,
  Camera,
  X,
  Smartphone,
  Square,
  Monitor,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  Check
} from 'lucide-vue-next'

const props = defineProps<{
  captureSnapshot: () => string
  getCanvas: () => HTMLCanvasElement | null
}>()

const timelineStore = useTimelineStore()
const exportStore = useExportStore()

const isRecording = ref(false)
const recordingTimeLeft = ref(0)
let mediaRecorder: MediaRecorder | null = null
let recordedChunks: Blob[] = []
let recordInterval: number | null = null

const aspectRatios: { id: AspectRatioType; label: string; icon: any }[] = [
  { id: '9:16', label: 'Story (9:16)', icon: Smartphone },
  { id: '1:1', label: 'Square (1:1)', icon: Square },
  { id: '16:9', label: 'Cinema (16:9)', icon: Monitor }
]

const durations = [5, 10, 15]

const downloadSnapshot = () => {
  const dataUrl = props.captureSnapshot()
  if (!dataUrl) return
  const link = document.createElement('a')
  link.download = `trip-story-${Date.now()}.png`
  link.href = dataUrl
  link.click()
}

const startVideoRecording = () => {
  const canvas = props.getCanvas()
  if (!canvas) return

  exportStore.clearRecordedVideo()
  recordedChunks = []
  isRecording.value = true
  recordingTimeLeft.value = exportStore.durationSeconds

  // Play timeline
  timelineStore.play()

  // Capture canvas stream
  const stream = canvas.captureStream(30)
  
  // Prefer mp4 if supported, fallback to webm
  const mimeType = MediaRecorder.isTypeSupported('video/mp4; codecs=avc1')
    ? 'video/mp4; codecs=avc1'
    : 'video/webm; codecs=vp9'

  mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 })

  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data)
    }
  }

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType.split(';')[0] })
    exportStore.setRecordedVideo(blob)
    isRecording.value = false
    timelineStore.pause()
    if (recordInterval) clearInterval(recordInterval)
  }

  mediaRecorder.start(100)

  // Countdown timer
  recordInterval = window.setInterval(() => {
    recordingTimeLeft.value--
    if (recordingTimeLeft.value <= 0) {
      stopVideoRecording()
    }
  }, 1000)
}

const stopVideoRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

const downloadRecordedVideo = () => {
  if (!exportStore.recordedVideoUrl) return
  const ext = exportStore.recordedBlob?.type.includes('mp4') ? 'mp4' : 'webm'
  const link = document.createElement('a')
  link.download = `trip-story-video-${Date.now()}.${ext}`
  link.href = exportStore.recordedVideoUrl
  link.click()
}

onUnmounted(() => {
  if (recordInterval) clearInterval(recordInterval)
})
</script>

<template>
  <div class="modal-backdrop" v-if="timelineStore.isExportOpen" @click.self="timelineStore.isExportOpen = false">
    <div class="export-modal glass-panel-elevated">
      <div class="modal-header">
        <div class="header-title">
          <Share2 :size="20" class="text-rose" />
          <h3>Instagram Stories & Social Studio</h3>
        </div>
        <button class="modal-close" @click="timelineStore.isExportOpen = false" :disabled="isRecording">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-grid">
        <!-- Left: Live 9:16 Preview Box -->
        <div class="preview-column">
          <div
            class="mockup-frame"
            :class="[`ratio-${exportStore.aspectRatio.replace(':', '-')}`]"
          >
            <div class="mockup-inner">
              <!-- Overlay graphics preview -->
              <StoryOverlayFrame />
              <div class="preview-tag">LIVE PREVIEW</div>
            </div>
          </div>
        </div>

        <!-- Right: Studio Controls -->
        <div class="controls-column">
          <!-- Aspect Ratio Switcher -->
          <div class="control-group">
            <label class="control-label">Aspect Ratio</label>
            <div class="ratio-tabs">
              <button
                v-for="r in aspectRatios"
                :key="r.id"
                class="ratio-btn"
                :class="{ active: exportStore.aspectRatio === r.id }"
                @click="exportStore.setAspectRatio(r.id)"
              >
                <component :is="r.icon" :size="14" />
                <span>{{ r.label }}</span>
              </button>
            </div>
          </div>

          <!-- Title Customizer -->
          <div class="control-group">
            <label class="control-label">Story Title</label>
            <input
              type="text"
              v-model="exportStore.storyTitle"
              placeholder="e.g. My Euro Tour 2024"
              class="glass-input"
            />
          </div>

          <!-- Video Duration -->
          <div class="control-group">
            <label class="control-label">Story Video Length</label>
            <div class="duration-tabs">
              <button
                v-for="d in durations"
                :key="d"
                class="duration-btn"
                :class="{ active: exportStore.durationSeconds === d }"
                @click="exportStore.setDuration(d)"
              >
                {{ d }} Seconds
              </button>
            </div>
          </div>

          <!-- Overlay Toggle Checkboxes -->
          <div class="control-group">
            <label class="control-label">Overlays & Badges</label>
            <div class="toggles-grid">
              <label class="toggle-item">
                <input type="checkbox" v-model="exportStore.showDateOverlay" />
                <span>Date Badge</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="exportStore.showSpeedometer" />
                <span>Speedometer</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="exportStore.showTransportIcon" />
                <span>Transport Icon</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="exportStore.showDistanceTracker" />
                <span>Distance Tracker</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="exportStore.showCountryPill" />
                <span>Location Tag</span>
              </label>
              <label class="toggle-item">
                <input type="checkbox" v-model="exportStore.showProgressBar" />
                <span>Progress Bar</span>
              </label>
            </div>
          </div>

          <!-- Export Action Buttons -->
          <div class="export-actions">
            <!-- Snapshot Button -->
            <button class="action-btn snapshot-btn" @click="downloadSnapshot" :disabled="isRecording">
              <Camera :size="16" />
              <span>Download Story Photo (PNG)</span>
            </button>

            <!-- Video Recording Controls -->
            <div v-if="!isRecording && !exportStore.recordedVideoUrl">
              <button class="action-btn record-btn" @click="startVideoRecording">
                <Video :size="16" />
                <span>Record {{ exportStore.durationSeconds }}s Story Video (Reel)</span>
              </button>
            </div>

            <!-- In-progress recording banner -->
            <div v-else-if="isRecording" class="recording-banner">
              <div class="rec-dot"></div>
              <span>Recording Video... <strong>{{ recordingTimeLeft }}s</strong> remaining</span>
              <button class="stop-btn" @click="stopVideoRecording">Stop</button>
            </div>

            <!-- Download recorded video player -->
            <div v-else-if="exportStore.recordedVideoUrl" class="recorded-preview-box">
              <video :src="exportStore.recordedVideoUrl" controls autoplay loop class="video-preview-player"></video>
              <div class="video-action-row">
                <button class="action-btn download-video-btn" @click="downloadRecordedVideo">
                  <Download :size="16" />
                  <span>Download Video Reel</span>
                </button>
                <button class="action-btn retake-btn" @click="exportStore.clearRecordedVideo()">
                  <RotateCcw :size="14" />
                  <span>Retake</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(4, 6, 12, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.export-modal {
  width: 92%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), var(--glass-glow);
}

.modal-header {
  padding: 16px 24px;
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
  font-size: 17px;
  font-weight: 600;
  color: #ffffff;
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px;
}

.modal-close:hover {
  color: #ffffff;
}

.modal-grid {
  display: grid;
  grid-template-columns: 320px 1fr;
  padding: 24px;
  gap: 24px;
  overflow-y: auto;
}

.preview-column {
  display: flex;
  justify-content: center;
  align-items: center;
}

.mockup-frame {
  position: relative;
  background: #000000;
  border: 4px solid #1a2233;
  border-radius: 28px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 240, 255, 0.2);
  overflow: hidden;
}

.mockup-frame.ratio-9-16 {
  width: 250px;
  height: 444px;
}

.mockup-frame.ratio-1-1 {
  width: 280px;
  height: 280px;
}

.mockup-frame.ratio-16-9 {
  width: 290px;
  height: 163px;
}

.mockup-inner {
  position: relative;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #090e1c 0%, #060810 100%);
}

.preview-tag {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  letter-spacing: 1px;
  background: rgba(0, 240, 255, 0.2);
  color: var(--accent-cyan);
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}

.controls-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}

.ratio-tabs, .duration-tabs {
  display: flex;
  gap: 8px;
}

.ratio-btn, .duration-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-main);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.ratio-btn.active, .duration-btn.active {
  background: rgba(0, 240, 255, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.glass-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 13px;
  outline: none;
}

.glass-input:focus {
  border-color: var(--accent-cyan);
}

.toggles-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-main);
  cursor: pointer;
}

.export-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.action-btn {
  width: 100%;
  padding: 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: var(--transition-smooth);
  border: none;
}

.snapshot-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.snapshot-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.record-btn {
  background: linear-gradient(135deg, #ff2a6d 0%, #ff6b35 100%);
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(255, 42, 109, 0.4);
}

.record-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(255, 42, 109, 0.6);
}

.recording-banner {
  padding: 12px;
  background: rgba(255, 42, 109, 0.2);
  border: 1px solid var(--accent-rose);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: #ffffff;
}

.rec-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent-rose);
  animation: pulseGlow 1s infinite;
}

.stop-btn {
  padding: 4px 10px;
  background: var(--accent-rose);
  border: none;
  border-radius: 4px;
  color: #ffffff;
  font-weight: 600;
  cursor: pointer;
}

.recorded-preview-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.video-preview-player {
  width: 100%;
  max-height: 150px;
  border-radius: var(--radius-sm);
  background: #000;
}

.video-action-row {
  display: flex;
  gap: 8px;
}

.download-video-btn {
  flex: 2;
  background: linear-gradient(135deg, var(--accent-cyan) 0%, #00ff9d 100%);
  color: #060810;
  font-weight: 700;
}

.retake-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.text-rose { color: var(--accent-rose); }

@media (max-width: 768px) {
  .modal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
