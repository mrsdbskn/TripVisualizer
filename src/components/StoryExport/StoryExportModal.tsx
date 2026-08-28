import React, { useState, useRef } from 'react';
import {
  X,
  Video,
  Camera,
  Download,
  Check,
  Smartphone,
  Sparkles,
  Play,
  Settings,
  Music,
  Gauge,
  Calendar,
} from 'lucide-react';
import { TimelineDataset, PlaybackState, StoryExportConfig } from '../../types/timeline';
import { CanvasVideoRecorder } from './VideoRecorder';

interface StoryExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TimelineDataset;
  playback: PlaybackState;
  onUpdatePlayback: (partial: Partial<PlaybackState>) => void;
  canvas: HTMLCanvasElement | null;
  storyConfig: StoryExportConfig;
  onUpdateStoryConfig: (partial: Partial<StoryExportConfig>) => void;
}

export const StoryExportModal: React.FC<StoryExportModalProps> = ({
  isOpen,
  onClose,
  data,
  playback,
  onUpdatePlayback,
  canvas,
  storyConfig,
  onUpdateStoryConfig,
}) => {
  if (!isOpen) return null;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const recorderRef = useRef<CanvasVideoRecorder | null>(null);

  const handleStartRecording = async () => {
    if (!canvas) {
      alert('3D Canvas is not ready. Please wait a moment.');
      return;
    }

    setDownloadUrl(null);
    setIsRecording(true);
    setRecordingProgress(0);

    // Auto-play timeline during recording
    onUpdatePlayback({ isPlaying: true });

    const recorder = new CanvasVideoRecorder();
    recorderRef.current = recorder;

    try {
      await recorder.record({
        canvas,
        durationMs: storyConfig.durationSeconds * 1000,
        fps: storyConfig.fps,
        onProgress: (progress, remaining) => {
          setRecordingProgress(progress);
          setRemainingSeconds(remaining);
        },
        onComplete: (blob, url) => {
          setIsRecording(false);
          setDownloadUrl(url);
        },
        onError: (err) => {
          setIsRecording(false);
          alert('Recording failed: ' + err.message);
        },
      });
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleTakeSnapshot = () => {
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setSnapshotUrl(dataUrl);

      // Trigger automatic download
      const link = document.createElement('a');
      link.download = `story-snapshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err: any) {
      alert('Snapshot failed: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-lg">
      <div className="glass-panel p-6 max-w-xl w-full border border-pink-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-pink-500 to-amber-500 text-white shadow-lg shadow-pink-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">
                Instagram Stories Studio (9:16)
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Export 60fps vertical video & HD story snapshots
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration settings */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Story Title
              </label>
              <input
                type="text"
                value={storyConfig.title}
                onChange={(e) => onUpdateStoryConfig({ title: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-400 font-mono"
                placeholder="e.g. Switzerland & Japan 2024"
              />
            </div>
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                Subtitle
              </label>
              <input
                type="text"
                value={storyConfig.subtitle}
                onChange={(e) => onUpdateStoryConfig({ subtitle: e.target.value })}
                className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-400 font-mono"
                placeholder="e.g. 12,000 km Journey"
              />
            </div>
          </div>

          {/* Stickers & Badges Toggles */}
          <div>
            <label className="text-xs font-mono uppercase text-slate-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Overlays & Stickers</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onUpdateStoryConfig({ showDateBadge: !storyConfig.showDateBadge })
                }
                className={`glass-button text-xs py-2 px-3 justify-between ${
                  storyConfig.showDateBadge
                    ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                    : 'text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Date Stamp</span>
                </div>
                <span className="font-mono text-[10px]">
                  {storyConfig.showDateBadge ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() =>
                  onUpdateStoryConfig({ showTelemetry: !storyConfig.showTelemetry })
                }
                className={`glass-button text-xs py-2 px-3 justify-between ${
                  storyConfig.showTelemetry
                    ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                    : 'text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Distance HUD</span>
                </div>
                <span className="font-mono text-[10px]">
                  {storyConfig.showTelemetry ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() =>
                  onUpdateStoryConfig({ showMusicSticker: !storyConfig.showMusicSticker })
                }
                className={`glass-button text-xs py-2 px-3 justify-between ${
                  storyConfig.showMusicSticker
                    ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                    : 'text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio Pill</span>
                </div>
                <span className="font-mono text-[10px]">
                  {storyConfig.showMusicSticker ? 'ON' : 'OFF'}
                </span>
              </button>

              <button
                onClick={() =>
                  onUpdateStoryConfig({ showProgressBar: !storyConfig.showProgressBar })
                }
                className={`glass-button text-xs py-2 px-3 justify-between ${
                  storyConfig.showProgressBar
                    ? 'border-pink-400 text-pink-300 bg-pink-500/10'
                    : 'text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5" />
                  <span>Progress Bar</span>
                </div>
                <span className="font-mono text-[10px]">
                  {storyConfig.showProgressBar ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Video Duration Selector */}
          <div>
            <label className="text-xs font-mono uppercase text-slate-400 block mb-1.5">
              Recording Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => onUpdateStoryConfig({ durationSeconds: sec })}
                  className={`text-xs py-2 rounded-lg font-mono font-bold transition-all border ${
                    storyConfig.durationSeconds === sec
                      ? 'bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/30'
                      : 'glass-button border-white/10 text-slate-300'
                  }`}
                >
                  {sec} Seconds
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Recording Progress Indicator */}
        {isRecording && (
          <div className="glass-panel p-4 border border-pink-500/50 bg-pink-950/20 flex flex-col gap-2 animate-pulse">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-pink-300 font-bold flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                RECORDING STORY VIDEO (60 FPS)...
              </span>
              <span className="text-white font-bold">{remainingSeconds}s remaining</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-amber-400 rounded-full transition-all duration-100"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download Link if Ready */}
        {downloadUrl && (
          <div className="glass-panel p-4 border border-emerald-500/50 bg-emerald-950/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Story Video Rendered Successfully!</span>
            </div>
            <a
              href={downloadUrl}
              download={`story-travel-${Date.now()}.mp4`}
              className="glass-button bg-emerald-500 text-slate-950 font-bold text-xs py-1.5 px-3 rounded-lg hover:bg-emerald-400 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
          <button
            onClick={handleTakeSnapshot}
            className="glass-button justify-center py-2.5 text-xs uppercase font-mono tracking-wider text-slate-200 border-white/20 hover:border-white"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>HD Story Snapshot</span>
          </button>

          <button
            onClick={handleStartRecording}
            disabled={isRecording}
            className="glass-button-story justify-center py-2.5 text-xs uppercase font-mono tracking-wider disabled:opacity-50"
          >
            <Video className="w-4 h-4" />
            <span>{isRecording ? 'Recording...' : 'Record Story Video'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
