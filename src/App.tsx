import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GlobeVisualizer } from './components/Globe/GlobeVisualizer';
import { GlobeControls } from './components/Globe/GlobeControls';
import { TimelineBar } from './components/Timeline/TimelineBar';
import { TelemetryHUD } from './components/Timeline/TelemetryHUD';
import { DateFramePicker } from './components/Timeline/DateFramePicker';
import { Header } from './components/UI/Header';
import { FileUploadModal } from './components/UI/FileUploadModal';
import { StatsDrawer } from './components/UI/StatsDrawer';
import { StoryExportModal } from './components/StoryExport/StoryExportModal';
import { StoryOverlay } from './components/StoryExport/StoryOverlay';
import { getSampleTimelineData } from './data/sampleData';
import {
  TimelineDataset,
  GlobeTheme,
  LayerVisibility,
  PlaybackState,
  CameraMode,
  StoryExportConfig,
  TripCluster,
} from './types/timeline';

export function App() {
  const initialData = getSampleTimelineData();
  const [data, setData] = useState<TimelineDataset>(initialData);

  // Styling & Layers
  const [theme, setTheme] = useState<GlobeTheme>('dark-neon');
  const [layers, setLayers] = useState<LayerVisibility>({
    arcs: true,
    trails: true,
    heatmap: false,
    markers: true,
    labels: true,
    atmosphere: true,
    clouds: true,
  });

  // Playback state
  const [playback, setPlayback] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: initialData.summary.minTime,
    speedMultiplier: 10,
    loop: true,
    rangeStart: initialData.summary.minTime,
    rangeEnd: initialData.summary.maxTime,
    autoFly: true,
  });

  // Camera & Mode
  const [cameraMode, setCameraMode] = useState<CameraMode>('cinematic');
  const [isStoryMode, setIsStoryMode] = useState<boolean>(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDateFrameOpen, setIsDateFrameOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Canvas ref for video recording
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);

  // Story config
  const [storyConfig, setStoryConfig] = useState<StoryExportConfig>({
    aspectRatio: '9:16',
    title: 'World Travel Chronicles',
    subtitle: `${initialData.summary.countriesCount} Countries • ${initialData.summary.flightCount} Flights`,
    showTelemetry: true,
    showDateBadge: true,
    showMusicSticker: true,
    showProgressBar: true,
    themeColor: '#00f0ff',
    durationSeconds: 10,
    fps: 60,
  });

  // Handle updates to playback state
  const handleUpdatePlayback = useCallback((partial: Partial<PlaybackState>) => {
    setPlayback((prev) => ({ ...prev, ...partial }));
  }, []);

  // Handle layer toggles
  const handleToggleLayer = (layer: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Handle trip selection
  const handleSelectTrip = (trip: TripCluster) => {
    const pad = 24 * 3600 * 1000;
    const start = Math.max(data.summary.minTime, trip.startDate - pad);
    const end = Math.min(data.summary.maxTime, trip.endDate + pad);

    setPlayback((prev) => ({
      ...prev,
      rangeStart: start,
      rangeEnd: end,
      currentTime: trip.startDate,
      isPlaying: true,
    }));
  };

  // Handle new dataset loaded from file upload
  const handleDatasetLoaded = (newDataset: TimelineDataset) => {
    setData(newDataset);
    setPlayback({
      isPlaying: false,
      currentTime: newDataset.summary.minTime,
      speedMultiplier: 10,
      loop: true,
      rangeStart: newDataset.summary.minTime,
      rangeEnd: newDataset.summary.maxTime,
      autoFly: true,
    });
    setStoryConfig((prev) => ({
      ...prev,
      title: 'My Global Timeline',
      subtitle: `${newDataset.summary.countriesCount} Countries • ${Math.round(
        newDataset.summary.totalDistanceKm
      ).toLocaleString()} km`,
    }));
  };

  // Playback animation tick loop
  useEffect(() => {
    if (!playback.isPlaying) return;

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      setPlayback((prev) => {
        if (!prev.isPlaying) return prev;

        const rangeSpan = prev.rangeEnd - prev.rangeStart;
        // Total playback duration of the current range in seconds (scaled by speed multiplier)
        const baseSeconds = 45 / prev.speedMultiplier;
        const advanceMs = (deltaSec / Math.max(1, baseSeconds)) * rangeSpan;

        let nextTime = prev.currentTime + advanceMs;

        if (nextTime >= prev.rangeEnd) {
          if (prev.loop) {
            nextTime = prev.rangeStart;
          } else {
            return { ...prev, isPlaying: false, currentTime: prev.rangeEnd };
          }
        }

        return { ...prev, currentTime: nextTime };
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [playback.isPlaying, playback.speedMultiplier]);

  return (
    <div className="relative w-screen h-screen bg-[#08090d] overflow-hidden select-none">
      {/* Top Navigation Header */}
      <Header
        data={data}
        isStoryMode={isStoryMode}
        onToggleStoryMode={() => setIsStoryMode(!isStoryMode)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenExportModal={() => setIsExportOpen(true)}
        onLoadDemo={() => handleDatasetLoaded(getSampleTimelineData())}
      />

      {/* 3D Globe Visualizer */}
      <main className="w-full h-full flex items-center justify-center">
        {isStoryMode ? (
          <div className="story-viewport-wrapper">
            <div className="story-frame-guide relative">
              <GlobeVisualizer
                data={data}
                theme={theme}
                layers={layers}
                playback={playback}
                cameraMode={cameraMode}
                aspectRatioMode="9:16"
                canvasRefCallback={setCanvasElement}
              />
              <StoryOverlay data={data} playback={playback} config={storyConfig} />
            </div>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <GlobeVisualizer
              data={data}
              theme={theme}
              layers={layers}
              playback={playback}
              cameraMode={cameraMode}
              aspectRatioMode="fullscreen"
              canvasRefCallback={setCanvasElement}
            />
            {/* Live Telemetry HUD */}
            <TelemetryHUD data={data} playback={playback} />
          </div>
        )}
      </main>

      {/* 3D Layers & Style Floating Controls */}
      <GlobeControls
        theme={theme}
        layers={layers}
        cameraMode={cameraMode}
        onThemeChange={setTheme}
        onLayerToggle={handleToggleLayer}
        onCameraModeChange={setCameraMode}
      />

      {/* Bottom Timeline Scrubber & Player */}
      <TimelineBar
        data={data}
        playback={playback}
        onUpdatePlayback={handleUpdatePlayback}
        onSelectTrip={handleSelectTrip}
        onOpenDateFramePicker={() => setIsDateFrameOpen(true)}
      />

      {/* Modals & Drawers */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onDatasetLoaded={handleDatasetLoaded}
      />

      <DateFramePicker
        isOpen={isDateFrameOpen}
        onClose={() => setIsDateFrameOpen(false)}
        data={data}
        playback={playback}
        onSelectRange={(start, end) =>
          handleUpdatePlayback({ rangeStart: start, rangeEnd: end, currentTime: start })
        }
      />

      <StatsDrawer
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        data={data}
      />

      <StoryExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        data={data}
        playback={playback}
        onUpdatePlayback={handleUpdatePlayback}
        canvas={canvasElement}
        storyConfig={storyConfig}
        onUpdateStoryConfig={(p) => setStoryConfig((prev) => ({ ...prev, ...p }))}
      />
    </div>
  );
}
export default App;
