import React, { useRef } from 'react';
import {
  Globe2,
  Upload,
  BarChart3,
  Smartphone,
  Video,
  Sparkles,
  X,
  FileJson,
  Zap,
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
  onFileDirectSelected?: (file: File) => void;
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
  onFileDirectSelected,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileDirectSelected?.(e.target.files[0]);
    }
  };

  return (
    <header className="fixed top-4 left-6 right-6 z-[60] flex items-center justify-between pointer-events-auto select-none">
      {/* Hidden File Input for direct OS file chooser */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Brand Logo & Live Stats Pill */}
      <div className="glass-panel px-4 py-2.5 flex items-center gap-3 border border-cyan-500/30 shadow-2xl bg-slate-950/90 backdrop-blur-xl">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 animate-pulse-glow">
          <Globe2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-black text-sm tracking-wide text-white flex items-center gap-2">
            TripChronicle <span className="text-cyan-400 font-mono font-bold text-xs">3D</span>
          </h1>
          <div className="text-[11px] text-cyan-300 font-mono flex items-center gap-1.5 font-semibold">
            <span>🌍 {data.summary.countriesCount} Countries</span>
            <span className="text-slate-500">•</span>
            <span>✈️ {data.summary.flightCount} Flights</span>
            <span className="text-slate-500">•</span>
            <span>🛣️ {Math.round(data.summary.totalDistanceKm).toLocaleString()} km</span>
          </div>
        </div>
      </div>

      {/* Action Buttons Toolbar */}
      <div className="flex items-center gap-2 bg-slate-950/90 glass-panel p-1.5 border border-white/15 shadow-2xl backdrop-blur-xl">
        {/* Direct 1-Click Load Timeline.json */}
        {onLoadTimelineJsonDirect && (
          <button
            type="button"
            onClick={onLoadTimelineJsonDirect}
            title="1-Click Load Timeline.json from workspace (99.9 MB)"
            className="glass-button text-xs px-3.5 py-2 rounded-xl text-amber-300 hover:text-white border border-amber-500/50 bg-amber-500/15 hover:bg-amber-500/25 cursor-pointer shadow-md shadow-amber-500/10 flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400/30" />
            <span className="font-mono font-bold">Timeline.json (100MB)</span>
          </button>
        )}

        {/* Upload Custom JSON Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Browse and import any Timeline.json or Records.json from your device"
          className="glass-button text-xs px-3.5 py-2 rounded-xl text-cyan-300 hover:text-white border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer shadow-sm transition-all"
        >
          <Upload className="w-4 h-4 text-cyan-400" />
          <span className="font-mono font-bold">Import JSON</span>
        </button>

        {/* Load Sample / Demo */}
        <button
          type="button"
          onClick={onLoadDemo}
          title="Load curated sample timeline journey"
          className="glass-button text-xs px-3 py-2 rounded-xl text-slate-200 hover:text-white border-white/10 hover:border-white/25 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono hidden sm:inline">Demo Journey</span>
        </button>

        {/* Analytics Drawer Button */}
        <button
          type="button"
          onClick={onOpenStats}
          title="Open lifetime travel analytics drawer"
          className="glass-button text-xs px-3.5 py-2 rounded-xl text-purple-300 hover:text-white border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 cursor-pointer"
        >
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="font-mono hidden md:inline font-bold">Travel Stats</span>
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
              <span className="font-mono font-bold">Exit 9:16</span>
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
          className="glass-button-story text-xs px-4 py-2 rounded-xl font-mono uppercase tracking-wider cursor-pointer font-bold"
        >
          <Video className="w-4 h-4" />
          <span>Export Story</span>
        </button>
      </div>
    </header>
  );
};
