import React from 'react';
import { Plane, MapPin, Gauge, Music, Sparkles, Navigation } from 'lucide-react';
import { TimelineDataset, PlaybackState, StoryExportConfig } from '../../types/timeline';
import { findNearestRegion } from '../../services/geoUtils';

interface StoryOverlayProps {
  data: TimelineDataset;
  playback: PlaybackState;
  config: StoryExportConfig;
}

export const StoryOverlay: React.FC<StoryOverlayProps> = ({ data, playback, config }) => {
  const { currentTime } = playback;
  const { minTime, maxTime } = data.summary;

  const dateStr = new Date(currentTime).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const cumulativeKm = data.activities
    .filter((a) => a.startTime <= currentTime)
    .reduce((sum, a) => sum + (a.distanceMeters > 0 ? a.distanceMeters / 1000 : 0), 0);

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-40">
      {/* Top Header: Story Title & Date */}
      <div className="flex flex-col gap-2 pt-4">
        {config.showProgressBar && (
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full"
              style={{
                width: `${Math.min(
                  100,
                  ((currentTime - playback.rangeStart) /
                    (playback.rangeEnd - playback.rangeStart || 1)) *
                    100
                )}%`,
              }}
            />
          </div>
        )}

        <div className="glass-panel p-4 border border-white/20 bg-black/40 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>EXPEDITION CHRONICLE</span>
              </div>
              <h2 className="text-xl font-display font-extrabold text-white leading-tight">
                {config.title || 'World Journey'}
              </h2>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                {config.subtitle || `${data.summary.countriesCount} Countries • ${data.summary.flightCount} Flights`}
              </p>
            </div>
            {config.showDateBadge && (
              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/40 rounded-xl p-2.5 text-center">
                <div className="text-[9px] uppercase font-mono text-pink-300 font-bold">DATE</div>
                <div className="text-sm font-bold text-white font-mono">{dateStr}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Footer: Telemetry Stickers & Audio Tag */}
      <div className="flex flex-col gap-3 pb-6">
        {/* Soundtrack / Music Pill */}
        {config.showMusicSticker && (
          <div className="self-start glass-panel px-3 py-1.5 border border-white/20 bg-black/40 flex items-center gap-2 text-xs font-mono text-white">
            <Music className="w-3.5 h-3.5 text-pink-400 animate-spin" />
            <span>Synthwave Odyssey • Travel Theme</span>
          </div>
        )}

        {/* Telemetry Stats Bar */}
        {config.showTelemetry && (
          <div className="glass-panel p-3 border border-white/20 bg-black/50 backdrop-blur-xl grid grid-cols-3 gap-2 text-center font-mono">
            <div className="border-r border-white/10 pr-2">
              <div className="text-[9px] text-slate-400 uppercase">Distance</div>
              <div className="text-xs font-bold text-cyan-400">
                {Math.round(cumulativeKm || data.summary.totalDistanceKm).toLocaleString()} km
              </div>
            </div>
            <div className="border-r border-white/10 pr-2">
              <div className="text-[9px] text-slate-400 uppercase">Countries</div>
              <div className="text-xs font-bold text-pink-400">
                {data.summary.countriesCount} Visited
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-400 uppercase">Flights</div>
              <div className="text-xs font-bold text-amber-400">
                {data.summary.flightCount} Arcs
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
