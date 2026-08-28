import { defineStore } from 'pinia'
import type { AspectRatioType } from '../types/timeline'

export const useExportStore = defineStore('export', {
  state: () => ({
    aspectRatio: '9:16' as AspectRatioType,
    durationSeconds: 10,
    videoQuality: 'high' as 'standard' | 'high' | 'ultra',
    
    // Overlay customizers
    storyTitle: 'My Journey',
    customSubtitle: 'Google Location Story',
    showTitleOverlay: true,
    showDateOverlay: true,
    showSpeedometer: true,
    showTransportIcon: true,
    showDistanceTracker: true,
    showCountryPill: true,
    showProgressBar: true,

    // Recording process state
    isRecording: false,
    recordProgress: 0,
    recordingCountdown: 0,
    recordedVideoUrl: null as string | null,
    recordedBlob: null as Blob | null
  }),

  actions: {
    setAspectRatio(ratio: AspectRatioType) {
      this.aspectRatio = ratio
    },

    setDuration(seconds: number) {
      this.durationSeconds = seconds
    },

    setRecordedVideo(blob: Blob) {
      this.recordedBlob = blob
      if (this.recordedVideoUrl) {
        URL.revokeObjectURL(this.recordedVideoUrl)
      }
      this.recordedVideoUrl = URL.createObjectURL(blob)
    },

    clearRecordedVideo() {
      if (this.recordedVideoUrl) {
        URL.revokeObjectURL(this.recordedVideoUrl)
        this.recordedVideoUrl = null
      }
      this.recordedBlob = null
    }
  }
})
