import React from 'react';
import {
  X,
  Plane,
  Compass,
  MapPin,
  Globe2,
  Calendar,
  Sparkles,
  TrendingUp,
  Award,
} from 'lucide-react';
import { TimelineDataset } from '../../types/timeline';
import { formatActivityType } from '../../services/geoUtils';

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  data: TimelineDataset;
}

export const StatsDrawer: React.FC<StatsDrawerProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  const { summary, trips, activities, visits } = data;
  const earthCircumferenceKm = 40075;
  const earthLaps = (summary.totalDistanceKm / earthCircumferenceKm).toFixed(1);

  // Group activities by transport
  const transportStats = activities.reduce((acc, act) => {
    acc[act.type] = (acc[act.type] || 0) + (act.distanceMeters > 0 ? act.distanceMeters / 1000 : 0);
    return acc;
  }, {} as Record<string, number>);

  const sortedTransport = Object.entries(transportStats).sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-md h-full rounded-none border-l border-white/15 bg-slate-950/90 p-6 flex flex-col gap-5 overflow-y-auto animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-black text-lg text-white">Travel Analytics</h2>
              <p className="text-xs text-slate-400 font-mono">Lifetime Location Telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Highlight Banner */}
        <div className="glass-panel p-4 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-purple-950/30 flex flex-col gap-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GLOBAL DISTANCE BADGE</span>
          </div>
          <div className="text-2xl font-display font-extrabold text-white">
            {Math.round(summary.totalDistanceKm).toLocaleString()} km
          </div>
          <p className="text-xs text-slate-300 font-mono">
            Equivalent to <span className="text-cyan-400 font-bold">{earthLaps}x</span> around the
            entire Earth! 🌍
          </p>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel p-3.5 border border-white/10 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Countries</span>
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300">
              {summary.countriesCount}
            </div>
          </div>

          <div className="glass-panel p-3.5 border border-white/10 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Plane className="w-3.5 h-3.5 text-sky-400" />
              <span>Flights</span>
            </div>
            <div className="text-xl font-bold font-mono text-sky-300">
              {summary.flightCount} Arcs
            </div>
          </div>

          <div className="glass-panel p-3.5 border border-white/10 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <MapPin className="w-3.5 h-3.5 text-pink-400" />
              <span>Visited Spots</span>
            </div>
            <div className="text-xl font-bold font-mono text-pink-300">
              {summary.totalVisits.toLocaleString()}
            </div>
          </div>

          <div className="glass-panel p-3.5 border border-white/10 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Timespan</span>
            </div>
            <div className="text-sm font-bold font-mono text-purple-300 mt-1">
              {new Date(summary.minTime).getFullYear()} – {new Date(summary.maxTime).getFullYear()}
            </div>
          </div>
        </div>

        {/* Transport Breakdown */}
        <div>
          <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transport Modes (km)</span>
          </h3>
          <div className="flex flex-col gap-2">
            {sortedTransport.slice(0, 6).map(([type, dist]) => {
              const pct = Math.min(100, (dist / (summary.totalDistanceKm || 1)) * 100);
              return (
                <div key={type} className="glass-panel p-2.5 border border-white/5">
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-slate-200">{formatActivityType(type)}</span>
                    <span className="text-cyan-400 font-bold">
                      {Math.round(dist).toLocaleString()} km ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Journeys & Expeditions */}
        {trips.length > 0 && (
          <div>
            <h3 className="text-xs font-mono uppercase text-slate-400 tracking-wider mb-2.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Memorable Journeys</span>
            </h3>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {trips.slice(0, 10).map((t) => (
                <div
                  key={t.id}
                  className="glass-panel p-3 border border-white/5 hover:border-cyan-500/30 transition-all text-xs font-mono"
                >
                  <div className="font-bold text-white truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{t.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
