import React from 'react';
import {
  Layers,
  Palette,
  Eye,
  Camera,
  Flame,
  Plane,
  MapPin,
  Tag,
  Sparkles,
  Compass,
} from 'lucide-react';
import { GlobeTheme, LayerVisibility, CameraMode } from '../../types/timeline';

interface GlobeControlsProps {
  theme: GlobeTheme;
  layers: LayerVisibility;
  cameraMode: CameraMode;
  onThemeChange: (theme: GlobeTheme) => void;
  onLayerToggle: (layer: keyof LayerVisibility) => void;
  onCameraModeChange: (mode: CameraMode) => void;
}

const THEMES: Array<{ id: GlobeTheme; label: string; icon: string }> = [
  { id: 'dark-neon', label: 'Dark Neon', icon: '⚡' },
  { id: 'midnight-blue', label: 'Midnight Blue', icon: '🌌' },
  { id: 'realistic-earth', label: 'Realistic Earth', icon: '🌍' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🟣' },
  { id: 'topographic', label: 'Topographic', icon: '🗺️' },
];

export const GlobeControls: React.FC<GlobeControlsProps> = ({
  theme,
  layers,
  cameraMode,
  onThemeChange,
  onLayerToggle,
  onCameraModeChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="absolute top-20 right-6 z-30 flex flex-col items-end gap-2">
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-button bg-slate-900/80 border border-white/15 px-3 py-2 text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-2 shadow-xl"
      >
        <Layers className="w-4 h-4 text-cyan-400" />
        <span>3D Layers & Style</span>
      </button>

      {/* Expanded Control Box */}
      {isOpen && (
        <div className="glass-panel p-4 max-w-xs w-72 flex flex-col gap-4 border border-cyan-500/20 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Globe Style */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 mb-2">
              <Palette className="w-3.5 h-3.5 text-cyan-400" />
              <span>Globe Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onThemeChange(t.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg text-left flex items-center gap-1.5 transition-all border ${
                    theme === t.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-semibold'
                      : 'border-white/5 text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Layer Toggles */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 mb-2">
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span>Visualization Layers</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => onLayerToggle('arcs')}
                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  layers.arcs
                    ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                    : 'border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-sky-400" />
                  <span>3D Flight & Trip Arcs</span>
                </div>
                <span className="font-mono text-[10px]">{layers.arcs ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => onLayerToggle('markers')}
                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  layers.markers
                    ? 'bg-pink-500/15 border-pink-400 text-pink-300'
                    : 'border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-pink-400" />
                  <span>Pulse Markers & Rings</span>
                </div>
                <span className="font-mono text-[10px]">{layers.markers ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => onLayerToggle('heatmap')}
                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  layers.heatmap
                    ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300'
                    : 'border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Hex Density Heatmap</span>
                </div>
                <span className="font-mono text-[10px]">{layers.heatmap ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => onLayerToggle('labels')}
                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  layers.labels
                    ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                    : 'border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>City & Place Labels</span>
                </div>
                <span className="font-mono text-[10px]">{layers.labels ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => onLayerToggle('atmosphere')}
                className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                  layers.atmosphere
                    ? 'bg-indigo-500/15 border-indigo-400 text-indigo-300'
                    : 'border-white/5 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Atmospheric Glow</span>
                </div>
                <span className="font-mono text-[10px]">{layers.atmosphere ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Camera Mode */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-slate-400 mb-2">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Camera Director</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => onCameraModeChange('free')}
                className={`text-[11px] py-1.5 rounded-lg font-mono transition-all border ${
                  cameraMode === 'free'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold'
                    : 'border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Free
              </button>
              <button
                onClick={() => onCameraModeChange('cinematic')}
                className={`text-[11px] py-1.5 rounded-lg font-mono transition-all border ${
                  cameraMode === 'cinematic'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold'
                    : 'border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Fly-To
              </button>
              <button
                onClick={() => onCameraModeChange('orbit')}
                className={`text-[11px] py-1.5 rounded-lg font-mono transition-all border ${
                  cameraMode === 'orbit'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 font-bold'
                    : 'border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Orbit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
