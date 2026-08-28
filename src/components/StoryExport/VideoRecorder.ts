/**
 * VideoRecorder helper using HTML5 Canvas captureStream and MediaRecorder API
 */
export interface VideoRecorderOptions {
  canvas: HTMLCanvasElement;
  durationMs: number;
  fps?: number;
  onProgress?: (progressPercent: number, remainingSeconds: number) => void;
  onComplete?: (blob: Blob, downloadUrl: string) => void;
  onError?: (error: Error) => void;
}

export class CanvasVideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private timer: number | null = null;

  public async record(options: VideoRecorderOptions): Promise<Blob> {
    const { canvas, durationMs, fps = 60, onProgress, onComplete, onError } = options;

    return new Promise((resolve, reject) => {
      try {
        const stream = canvas.captureStream(fps);
        this.recordedChunks = [];

        // Check best supported mime type
        let mimeType = 'video/webm;codecs=vp9';
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
          mimeType = 'video/mp4;codecs=avc1';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          mimeType = 'video/webm;codecs=vp8';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        }

        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: 8000000, // 8 Mbps high quality
        });

        this.mediaRecorder = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        const startTime = Date.now();

        const updateInterval = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(100, (elapsed / durationMs) * 100);
          const remaining = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
          onProgress?.(progress, remaining);

          if (elapsed >= durationMs) {
            window.clearInterval(updateInterval);
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          }
        }, 100);

        recorder.onstop = () => {
          window.clearInterval(updateInterval);
          const blob = new Blob(this.recordedChunks, { type: mimeType.split(';')[0] });
          const url = URL.createObjectURL(blob);
          onComplete?.(blob, url);
          resolve(blob);
        };

        recorder.start(100);
      } catch (err: any) {
        onError?.(err);
        reject(err);
      }
    });
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    if (this.timer) {
      window.clearInterval(this.timer);
    }
  }
}
