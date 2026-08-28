import React, { useState } from 'react';
import { X, Calendar, Check, Plane, Globe2, Sparkles, Filter } from 'lucide-react';
import { TimelineDataset, PlaybackState } from '../../types/timeline';

interface DateFramePickerProps {
  isOpen: boolean;
  onClose: () => void;
  data: TimelineDataset;
  playback: PlaybackState;
  onSelectRange: (start: number, end: number) => void;
}

export const DateFramePicker: React.FC<DateFramePickerProps> = ({
  isOpen,
  onClose,
  data,
  playback,
  onSelectRange,
}) => {
  if (!isOpen) return null;

  const { minTime, maxTime, yearSpan } = data.summary;
  const [customStart, setCustomStart] = useState<string>(
    new Date(playback.rangeStart).toISOString().slice(0, 10)
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date(playback.rangeEnd).toISOString().slice(0, 10)
  );

  const handleApplyCustom = () => {
    const s = new Date(customStart).getTime();
    const e = new Date(customEnd).getTime() + 24 * 3600 * 1000 - 1;
    if (s < e) {
      onSelectRange(s, e);
      onClose();
    }
  };

  const handleSelectYear = (year: number) => {
    const s = new Date(`${year}-01-01T00:00:00Z`).getTime();
    const e = new Date(`${year}-12-31T23:59:59Z`).getTime();
    onSelectRange(Math.max(minTime, s), Math.min(maxTime, e));
    onClose();
  };

  const handleSelectAllTime = () => {
    onSelectRange(minTime, maxTime);
    onClose();
  };

  const handleSelectFlightsOnly = () => {
    if (data.arcs.length > 0) {
      const flightTimes = data.arcs
        .filter((a) => a.type === 'FLYING')
        .map((a) => [a.startTime, a.endTime])
        .flat();
      if (flightTimes.length > 0) {
        onSelectRange(Math.min(...flightTimes), Math.max(...flightTimes));
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-panel p-6 max-w-lg w-full border border-cyan-500/30 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-white">Date Frame Setter</h3>
              <p className="text-xs text-slate-400 font-mono">
                Scope 3D globe animation across timeline windows
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Grid */}
        <div className="py-4 space-y-4">
          <div>
            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSelectAllTime}
                className="glass-button text-xs py-2.5 px-3 rounded-xl border border-white/10 hover:border-cyan-400 text-left flex items-center gap-2.5"
              >
                <Globe2 className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="font-bold text-white">All Time</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {new Date(minTime).getFullYear()} – {new Date(maxTime).getFullYear()}
                  </div>
                </div>
              </button>

              <button
                onClick={handleSelectFlightsOnly}
                className="glass-button text-xs py-2.5 px-3 rounded-xl border border-white/10 hover:border-sky-400 text-left flex items-center gap-2.5"
              >
                <Plane className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="font-bold text-white">Flight Journeys</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {data.summary.flightCount} Flights Filtered
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Year selector buttons */}
          {yearSpan && yearSpan.length > 0 && (
            <div>
              <label className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
                <Filter className="w-3.5 h-3.5 text-purple-400" />
                Filter By Year
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                {yearSpan.map((year) => {
                  const s = new Date(`${year}-01-01T00:00:00Z`).getTime();
                  const e = new Date(`${year}-12-31T23:59:59Z`).getTime();
                  const isSelected =
                    playback.rangeStart >= s - 86400000 && playback.rangeEnd <= e + 86400000;

                  return (
                    <button
                      key={year}
                      onClick={() => handleSelectYear(year)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-mono font-semibold transition-all border ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/30'
                          : 'glass-button border-white/10 text-slate-300 hover:text-white'
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Date Range inputs */}
          <div className="pt-2 border-t border-white/10">
            <label className="text-xs font-mono uppercase text-slate-400 tracking-wider block mb-2">
              Custom Date Range
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">Start Date</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">End Date</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-slate-900/90 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleApplyCustom}
              className="w-full glass-button-primary justify-center py-2.5 text-xs uppercase font-mono tracking-wider"
            >
              <Check className="w-4 h-4" />
              Apply Custom Range
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
