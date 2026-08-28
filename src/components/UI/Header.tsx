import React from 'react';
import {
  Globe2,
  Upload,
  BarChart3,
  Smartphone,
  Video,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { TimelineDataset } from '../../types/timeline';

interface HeaderProps {
  data: TimelineDataset;
  isStoryMode: boolean;
  onToggleStoryMode: () => void;
  onOpenUpload: () => void;
  onOpenStats: () => void;
  onOpenExportModal: () => void;
  onLoadDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  isStoryMode,
  onToggleStoryMode,
  onOpenUpload,
  onOpenStats,
  onOpenExportModal,
  onLoadDemo,
}) => {
  return (
    <header className="absolute top-4 left-6 right-6 z-30 flex items-center justify-between pointer-events-none">
      {/* Brand Logo & Title */}
      <div className="glass-panel px-4 py-2.5 flex items-center gap-3 pointer-events-auto border border-white/10 shadow-xl">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 animate-pulse-glow">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-black text-sm tracking-wide text-white flex items-center gap-2">
            TripChronicle <span className="text-cyan-400 font-mono font-bold text-xs">3D</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
            <span>{data.summary.countriesCount} Countries</span>
            <span>•</span>
            <span>{Math.round(data.summary.totalDistanceKm).toLocaleString()} km</span>
          </p>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {/* Upload JSON Button */}
        <button
          onClick={onOpenUpload}
          className="glass-button text-xs px-3.5 py-2 rounded-xl text-slate-200 hover:text-white border-white/15 hover:border-cyan-400 hover:shadow-cyan-500/20"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span className="font-mono">Import JSON</span>
        </button>

        {/* Load Sample / Demo */}
        <button
          onClick={onLoadDemo}
          title="Load curated sample timeline data"
          className="glass-button text-xs px-3 py-2 rounded-xl text-slate-300 hover:text-white border-white/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono hidden sm:inline">Demo Data</span>
        </button>

        {/* Analytics Drawer Button */}
        <button
          onClick={onOpenStats}
          className="glass-button text-xs px-3.5 py-2 rounded-xl text-slate-200 hover:text-white border-white/15"
        >
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="font-mono hidden md:inline">Travel Stats</span>
        </button>

        {/* Story Mode (9:16 Viewport Toggle) */}
        <button
          onClick={onToggleStoryMode}
          className={`glass-button text-xs px-3 py-2 rounded-xl transition-all border ${
            isStoryMode
              ? 'bg-pink-500/20 border-pink-400 text-pink-300 font-bold shadow-lg shadow-pink-500/30'
              : 'border-white/15 text-slate-300 hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 text-pink-400" />
          <span className="font-mono">9:16 Frame</span>
        </button>

        {/* Export Instagram Story Modal Trigger */}
        <button
          onClick={onOpenExportModal}
          className="glass-button-story text-xs px-4 py-2 rounded-xl font-mono uppercase tracking-wider"
        >
          <Video className="w-4 h-4" />
          <span className="font-bold">Export Story</span>
        </button>
      </div>
    </header>
  );
};
