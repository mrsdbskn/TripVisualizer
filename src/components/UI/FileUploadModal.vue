<script setup lang="ts">
import { ref } from 'vue'
import { useTimelineStore } from '../../stores/timelineStore'
import { parseTimelineFile } from '../../services/timelineParser'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, Sparkles, HelpCircle } from 'lucide-vue-next'

const timelineStore = useTimelineStore()
const isDragging = ref(false)
const isParsing = ref(false)
const parseProgress = ref(0)
const parseMessage = ref('')
const parseError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    await processFile(target.files[0])
  }
}

const handleDrop = async (e: DragEvent) => {
  isDragging.value = false
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    await processFile(e.dataTransfer.files[0])
  }
}

const processFile = async (file: File) => {
  if (!file.name.endsWith('.json')) {
    parseError.value = 'Please select a valid .json file (e.g. Timeline.json or location-history.json)'
    return
  }

  try {
    isParsing.value = true
    parseError.value = null
    parseProgress.value = 5
    parseMessage.value = 'Initializing high-speed parser...'

    const result = await parseTimelineFile(file, (percent, msg) => {
      parseProgress.value = percent
      parseMessage.value = msg
    })

    timelineStore.loadData(result)
    isParsing.value = false
    timelineStore.isUploadOpen = false
  } catch (err: any) {
    isParsing.value = false
    parseError.value = err?.message || 'Failed to parse Google Location JSON file.'
  }
}
</script>

<template>
  <div class="modal-backdrop" v-if="timelineStore.isUploadOpen" @click.self="timelineStore.isUploadOpen = false">
    <div class="modal-card glass-panel-elevated">
      <div class="modal-header">
        <div class="modal-title-group">
          <UploadCloud :size="20" class="text-cyan" />
          <h3>Import Location History</h3>
        </div>
        <button class="modal-close" @click="timelineStore.isUploadOpen = false" :disabled="isParsing">
          <X :size="18" />
        </button>
      </div>

      <div class="modal-content">
        <!-- Drag & Drop Dropzone -->
        <div
          class="dropzone"
          :class="{ dragging: isDragging, parsing: isParsing }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          @click="!isParsing && triggerFileInput()"
        >
          <input
            type="file"
            ref="fileInput"
            accept=".json"
            class="hidden-input"
            @change="handleFileSelect"
          />

          <div v-if="!isParsing" class="dropzone-inner">
            <div class="drop-icon-wrapper">
              <UploadCloud :size="32" class="drop-icon" />
            </div>
            <div class="drop-text">
              <strong>Drop your Timeline.json here</strong> or <span class="browse-link">browse device</span>
            </div>
            <div class="drop-hint">
              Supports Google Location History / Timeline JSON exports (up to 200MB+)
            </div>
          </div>

          <!-- Parsing Progress State -->
          <div v-else class="parsing-state">
            <div class="progress-spinner-wrapper">
              <div class="progress-bar-container">
                <div class="progress-bar-fill" :style="{ width: `${parseProgress}%` }"></div>
              </div>
            </div>
            <div class="parsing-text">{{ parseMessage }}</div>
            <div class="parsing-percent">{{ parseProgress }}%</div>
          </div>
        </div>

        <!-- Error notification -->
        <div v-if="parseError" class="error-banner">
          <AlertCircle :size="16" />
          <span>{{ parseError }}</span>
        </div>

        <!-- Quick Demo Alternative -->
        <div class="sample-alt">
          <span>Don't have a file ready right now?</span>
          <button
            class="sample-btn"
            @click="timelineStore.loadSample(); timelineStore.isUploadOpen = false"
          >
            <Sparkles :size="14" />
            Load Sample World Tour
          </button>
        </div>

        <!-- Google Takeout Info Accordion -->
        <div class="takeout-guide">
          <div class="guide-header">
            <HelpCircle :size="14" class="text-cyan" />
            <span>How to get your Google Location JSON:</span>
          </div>
          <ol class="guide-steps">
            <li>Visit <strong>takeout.google.com</strong></li>
            <li>Select <strong>Location History (Timeline)</strong></li>
            <li>Choose <strong>JSON format</strong> and download your archive</li>
            <li>Extract and upload <strong>Timeline.json</strong></li>
          </ol>
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
  background: rgba(4, 6, 12, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  width: 90%;
  max-width: 520px;
  background: var(--bg-surface-elevated);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), var(--glass-glow);
}

.modal-header {
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
}

.modal-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-title-group h3 {
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
  border-radius: 6px;
}

.modal-close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.modal-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.dropzone {
  border: 2px dashed rgba(0, 240, 255, 0.3);
  border-radius: var(--radius-md);
  padding: 32px 20px;
  text-align: center;
  background: rgba(0, 240, 255, 0.03);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.dropzone:hover, .dropzone.dragging {
  border-color: var(--accent-cyan);
  background: rgba(0, 240, 255, 0.08);
  box-shadow: 0 0 24px var(--accent-cyan-glow);
}

.dropzone.parsing {
  cursor: default;
  border-color: var(--accent-purple);
  background: rgba(157, 78, 221, 0.05);
}

.hidden-input {
  display: none;
}

.dropzone-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.drop-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(0, 240, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-cyan);
}

.drop-text {
  font-size: 14px;
  color: #ffffff;
}

.browse-link {
  color: var(--accent-cyan);
  text-decoration: underline;
}

.drop-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.parsing-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.progress-bar-container {
  width: 100%;
  max-width: 300px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00f0ff 0%, #a259ff 100%);
  transition: width 0.2s ease;
}

.parsing-text {
  font-size: 13px;
  color: var(--text-main);
}

.parsing-percent {
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--accent-cyan);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 42, 109, 0.15);
  border: 1px solid var(--accent-rose);
  border-radius: var(--radius-sm);
  color: #ffffff;
  font-size: 12px;
}

.sample-alt {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-muted);
}

.sample-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 183, 3, 0.15);
  border: 1px solid rgba(255, 183, 3, 0.4);
  border-radius: var(--radius-sm);
  color: var(--accent-amber);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.sample-btn:hover {
  background: rgba(255, 183, 3, 0.25);
}

.takeout-guide {
  padding: 14px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8px;
}

.guide-steps {
  margin-left: 20px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
}

.text-cyan {
  color: var(--accent-cyan);
}
</style>
