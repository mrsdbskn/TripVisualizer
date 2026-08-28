import React from 'react';
import {
  Globe2,
  Upload,
  BarChart3,
  Smartphone,
  Video,
  Sparkles,
  X,
  FileJson,
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
  onLoadTimelineJsonDirect?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  data,
  isStoryMode,
  onToggleStoryMode,
  onOpenUpload,
  onOpenStats,
  onOpenExportModal,
  onLoadDemo,
  onLoadTimelineJsonDirect,
}) => {
  return (
    <header className="fixed top-4 left-6 right-6 z-[60] flex items-center justify-between pointer-events-auto select-none">
      {/* Brand Logo & Title */}
      <div className="glass-panel px-4 py-2 flex items-center gap-3 border border-white/10 shadow-2xl bg-slate-950/80 backdrop-blur-xl">
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
            <span>•</span>
            <span>{data.summary.flightCount} Flights</span>
          </p>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2 bg-slate-950/80 glass-panel p-1.5 border border-white/10 shadow-2xl backdrop-blur-xl">
        {/* Upload JSON Button */}
        <button
          type="button"
          onClick={onOpenUpload}
          className="glass-button text-xs px-3.5 py-2 rounded-xl text-cyan-300 hover:text-white border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/10 cursor-pointer shadow-sm transition-all"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold">Import JSON</span>
        </button>

        {/* 1-Click Load Timeline.json if direct loader is available */}
        {onLoadTimelineJsonDirect && (
          <button
            type="button"
            onClick={onLoadTimelineJsonDirect}
            title="1-Click Load Timeline.json from workspace"
            className="glass-button text-xs px-3 py-2 rounded-xl text-amber-300 hover:text-white border border-amber-500/30 hover:border-amber-400 hover:bg-amber-500/10 cursor-pointer"
          >
            <FileJson className="w-4 h-4 text-amber-400" />
            <span className="font-mono font-bold hidden md:inline">Timeline.json (100MB)</span>
          </button>
        )}

        {/* Load Sample / Demo */}
        <button
          type="button"
          onClick={onLoadDemo}
          title="Load curated sample timeline journey"
          className="glass-button text-xs px-3 py-2 rounded-xl text-slate-200 hover:text-white border-white/10 hover:border-white/20 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono hidden sm:inline">Demo Journey</span>
        </button>

        {/* Analytics Drawer Button */}
        <button
          type="button"
          onClick={onOpenStats}
          title="Open lifetime travel analytics"
          className="glass-button text-xs px-3.5 py-2 rounded-xl text-slate-200 hover:text-white border-white/10 hover:border-purple-400/40 cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="font-mono hidden md:inline">Travel Stats</span>
        </button>

        {/* Story Mode (9:16 Viewport Toggle) */}
        <button
          type="button"
          onClick={onToggleStoryMode}
          title={isStoryMode ? 'Exit 9:16 Story Mode' : 'Enter 9:16 Story Mode'}
          className={`glass-button text-xs px-3 py-2 rounded-xl transition-all cursor-pointer border ${
            isStoryMode
              ? 'bg-pink-500/30 border-pink-400 text-pink-200 font-bold shadow-lg shadow-pink-500/40'
              : 'border-white/10 text-slate-300 hover:text-white hover:border-pink-400/40'
          }`}
        >
          {isStoryMode ? (
            <>
              <X className="w-4 h-4 text-pink-300" />
              <span className="font-mono">Exit 9:16</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4 text-pink-400" />
              <span className="font-mono">9:16 Frame</span>
            </>
          )}
        </button>

        {/* Export Instagram Story Modal Trigger */}
        <button
          type="button"
          onClick={onOpenExportModal}
          title="Record or export 9:16 Instagram Story video & snapshots"
          className="glass-button-story text-xs px-4 py-2 rounded-xl font-mono uppercase tracking-wider cursor-pointer"
        >
          <Video className="w-4 h-4" />
          <span className="font-bold">Export Story</span>
        </button>
      </div>
    </header>
  );
};
