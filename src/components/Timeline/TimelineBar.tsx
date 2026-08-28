import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  SkipBack,
  SkipForward,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { PlaybackState, TimelineDataset, TripCluster } from '../../types/timeline';

interface TimelineBarProps {
  data: TimelineDataset;
  playback: PlaybackState;
  onUpdatePlayback: (partial: Partial<PlaybackState>) => void;
  onSelectTrip: (trip: TripCluster) => void;
  onOpenDateFramePicker: () => void;
}

const SPEED_PRESETS = [
  { label: '1x', multiplier: 1 },
  { label: '10x', multiplier: 10 },
  { label: '100x', multiplier: 100 },
  { label: '500x', multiplier: 500 },
  { label: '2500x', multiplier: 2500 },
];

export const TimelineBar: React.FC<TimelineBarProps> = ({
  data,
  playback,
  onUpdatePlayback,
  onSelectTrip,
  onOpenDateFramePicker,
}) => {
  const { isPlaying, currentTime, speedMultiplier, loop, rangeStart, rangeEnd } = playback;

  const progressPercent = Math.max(
    0,
    Math.min(100, ((currentTime - rangeStart) / (rangeEnd - rangeStart || 1)) * 100)
  );

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const newTime = rangeStart + (val / 100) * (rangeEnd - rangeStart);
    onUpdatePlayback({ currentTime: newTime });
  };

  const togglePlay = () => {
    onUpdatePlayback({ isPlaying: !isPlaying });
  };

  const handleStepBack = () => {
    const step = (rangeEnd - rangeStart) * 0.05;
    onUpdatePlayback({ currentTime: Math.max(rangeStart, currentTime - step) });
  };

  const handleStepForward = () => {
    const step = (rangeEnd - rangeStart) * 0.05;
    onUpdatePlayback({ currentTime: Math.min(rangeEnd, currentTime + step) });
  };

  const handleReset = () => {
    onUpdatePlayback({ currentTime: rangeStart, isPlaying: false });
  };

  const formattedStart = new Date(rangeStart).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedEnd = new Date(rangeEnd).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedCurrent = new Date(currentTime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl select-none">
      <div className="glass-panel p-4 flex flex-col gap-3 border border-cyan-500/20 shadow-2xl backdrop-blur-2xl bg-slate-950/85">
        {/* Top bar: Date frame info + Quick Date Picker Trigger */}
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenDateFramePicker}
              className="glass-button text-cyan-300 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-500/20 flex items-center gap-2 cursor-pointer shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="font-bold">Date Frame: {formattedStart} ➔ {formattedEnd}</span>
            </button>
            <span className="text-slate-400 hidden sm:inline">
              ({data.summary.totalPoints.toLocaleString()} GPS points • {data.summary.totalVisits.toLocaleString()} visits)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {data.trips.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 hidden md:inline">Jump to:</span>
                <select
                  aria-label="Jump to trip preset"
                  className="bg-slate-900 border border-white/15 text-white text-xs rounded-lg px-2 py-1 outline-none cursor-pointer max-w-[200px] truncate"
                  onChange={(e) => {
                    const selected = data.trips.find((t) => t.id === e.target.value);
                    if (selected) onSelectTrip(selected);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Select Journey...</option>
                  {data.trips.slice(0, 15).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.distanceKm} km)
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="text-cyan-400 font-bold bg-cyan-500/15 px-3 py-1 rounded-md border border-cyan-500/30 text-xs">
              {formattedCurrent}
            </div>
          </div>
        </div>

        {/* Timeline Slider with Year Markers */}
        <div className="relative flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max="100"
            step="0.05"
            value={progressPercent}
            onChange={handleSliderChange}
            className="w-full cursor-pointer z-10"
          />

          {/* Timeline progress track glow */}
          <div
            className="absolute top-0 left-0 h-[6px] rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 pointer-events-none opacity-80"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Year milestones */}
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1">
            <span>{new Date(rangeStart).getFullYear()}</span>
            <span className="text-cyan-300 font-bold">{formattedCurrent}</span>
            <span>{new Date(rangeEnd).getFullYear()}</span>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex items-center justify-between pt-1">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              title="Reset to beginning"
              className="glass-button text-slate-400 hover:text-white p-2 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleStepBack}
              title="Step Backward"
              className="glass-button text-slate-300 hover:text-white p-2 rounded-lg cursor-pointer"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Big Neon Play/Pause Button */}
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Pause Animation' : 'Play Animation'}
              className={`p-3 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/40 hover:brightness-110'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/40 hover:scale-105'
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current translate-x-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleStepForward}
              title="Step Forward"
              className="glass-button text-slate-300 hover:text-white p-2 rounded-lg cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onUpdatePlayback({ loop: !loop })}
              className={`glass-button text-xs px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                loop ? 'border-cyan-400 text-cyan-300 bg-cyan-500/15' : 'text-slate-400 border-white/10'
              }`}
            >
              Loop: {loop ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Right: Speed Multiplier Selector */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10">
            <div className="flex items-center gap-1 text-slate-400 px-2 text-xs font-mono">
              <FastForward className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Speed:</span>
            </div>
            {SPEED_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => onUpdatePlayback({ speedMultiplier: preset.multiplier })}
                className={`text-xs px-2.5 py-1 rounded-lg font-mono font-medium transition-all cursor-pointer ${
                  speedMultiplier === preset.multiplier
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
