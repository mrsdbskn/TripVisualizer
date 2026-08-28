import React, { useEffect, useRef, useMemo } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import {
  TimelineDataset,
  GlobeTheme,
  LayerVisibility,
  PlaybackState,
  CameraMode,
  TripArc,
  TimelineVisit,
} from '../../types/timeline';
import { getActivityColor } from '../../services/geoUtils';

// Ensure global THREE exists for globe.gl submodules
if (typeof window !== 'undefined') {
  (window as any).THREE = THREE;
}

interface GlobeVisualizerProps {
  data: TimelineDataset;
  theme: GlobeTheme;
  layers: LayerVisibility;
  playback: PlaybackState;
  cameraMode: CameraMode;
  onHoverItem?: (item: any | null, mouseEvent?: MouseEvent) => void;
  onSelectVisit?: (visit: TimelineVisit) => void;
  aspectRatioMode?: 'fullscreen' | '9:16' | '1:1' | '16:9';
  canvasRefCallback?: (canvas: HTMLCanvasElement | null) => void;
}

export const GlobeVisualizer: React.FC<GlobeVisualizerProps> = ({
  data,
  theme,
  layers,
  playback,
  cameraMode,
  onHoverItem,
  onSelectVisit,
  aspectRatioMode = 'fullscreen',
  canvasRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<any>(null);
  const lastTargetCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Determine globe imagery textures based on theme
  const globeTextures = useMemo(() => {
    switch (theme) {
      case 'realistic-earth':
        return {
          globe: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
          bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
          night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
          atmosphere: '#38bdf8',
          bg: '#020617',
        };
      case 'dark-neon':
        return {
          globe: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
          bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
          night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
          atmosphere: '#00f0ff',
          bg: '#08090d',
        };
      case 'cyberpunk':
        return {
          globe: 'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
          bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
          night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
          atmosphere: '#f43f5e',
          bg: '#050508',
        };
      case 'topographic':
        return {
          globe: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
          bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
          night: null,
          atmosphere: '#818cf8',
          bg: '#090d16',
        };
      case 'midnight-blue':
      default:
        return {
          globe: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
          bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
          night: 'https://unpkg.com/three-globe/example/img/earth-night.jpg',
          atmosphere: '#38bdf8',
          bg: '#030712',
        };
    }
  }, [theme]);

  // Filter active arcs within current range or up to current playback time
  const visibleArcs = useMemo(() => {
    if (!layers.arcs) return [];
    const { rangeStart, rangeEnd, currentTime, isPlaying } = playback;

    return data.arcs.filter((arc) => {
      if (isPlaying) {
        return arc.startTime <= currentTime && arc.endTime >= rangeStart;
      }
      return arc.startTime <= rangeEnd && arc.endTime >= rangeStart;
    });
  }, [data.arcs, layers.arcs, playback.rangeStart, playback.rangeEnd, playback.currentTime, playback.isPlaying]);

  // Filter active visits for pulse rings & markers
  const visibleVisits = useMemo(() => {
    if (!layers.markers) return [];
    const { rangeStart, rangeEnd, currentTime, isPlaying } = playback;

    return data.visits.filter((v) => {
      if (isPlaying) {
        return v.startTime <= currentTime && v.endTime >= rangeStart;
      }
      return v.startTime <= rangeEnd && v.endTime >= rangeStart;
    });
  }, [data.visits, layers.markers, playback.rangeStart, playback.rangeEnd, playback.currentTime, playback.isPlaying]);

  // Hexbin / Heatmap points
  const heatmapPoints = useMemo(() => {
    if (!layers.heatmap) return [];
    const { rangeStart, rangeEnd } = playback;
    return data.points
      .filter((p) => p.time >= rangeStart && p.time <= rangeEnd)
      .map((p) => ({
        lat: p.lat,
        lng: p.lng,
        weight: 1,
      }));
  }, [data.points, layers.heatmap, playback.rangeStart, playback.rangeEnd]);

  // Initial Globe Mount
  useEffect(() => {
    if (!containerRef.current) return;

    // Get Globe constructor safely across bundlers
    const GlobeConstructor: any = typeof Globe === 'function' ? Globe : (Globe as any).default || Globe;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // Create Globe instance
    const globe = GlobeConstructor()(containerRef.current)
      .width(width)
      .height(height)
      .globeImageUrl(globeTextures.globe)
      .bumpImageUrl(globeTextures.bump)
      .backgroundColor(globeTextures.bg)
      .showAtmosphere(layers.atmosphere)
      .atmosphereColor(globeTextures.atmosphere)
      .atmosphereAltitude(0.22)
      .enablePointerInteraction(true);

    globeInstanceRef.current = globe;

    // Configure Controls
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = cameraMode === 'orbit';
      controls.autoRotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 120;
      controls.maxDistance = 500;
    }

    // Pass canvas reference back for video recording / screenshots
    const canvas = containerRef.current.querySelector('canvas');
    if (canvas && canvasRefCallback) {
      canvasRefCallback(canvas);
    }

    // Set initial position (Zurich, Switzerland default altitude)
    globe.pointOfView({ lat: 47.3769, lng: 8.5417, altitude: 2.2 }, 1200);

    // Add Starfield & Ambient Lighting to Three.js Scene
    const scene = globe.scene();
    if (scene) {
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
      dirLight.position.set(100, 100, 100);
      scene.add(dirLight);

      // Starfield particles
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1500;
      const starPositions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i += 3) {
        starPositions[i] = (Math.random() - 0.5) * 2000;
        starPositions[i + 1] = (Math.random() - 0.5) * 2000;
        starPositions[i + 2] = (Math.random() - 0.5) * 2000;
      }
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.8,
      });
      const starField = new THREE.Points(starGeometry, starMaterial);
      scene.add(starField);
    }

    // Resize Observer
    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        if (w > 0 && h > 0) {
          globeInstanceRef.current.width(w).height(h);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (globeInstanceRef.current) {
        globeInstanceRef.current._destructor?.();
      }
    };
  }, []);

  // Update Textures & Theme
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe
      .globeImageUrl(globeTextures.globe)
      .bumpImageUrl(globeTextures.bump)
      .backgroundColor(globeTextures.bg)
      .showAtmosphere(layers.atmosphere)
      .atmosphereColor(globeTextures.atmosphere);
  }, [globeTextures, layers.atmosphere]);

  // Update Arcs
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe
      .arcsData(visibleArcs)
      .arcStartLat((d: TripArc) => d.startLat)
      .arcStartLng((d: TripArc) => d.startLng)
      .arcEndLat((d: TripArc) => d.endLat)
      .arcEndLng((d: TripArc) => d.endLng)
      .arcColor((d: TripArc) => [d.color || '#38bdf8', '#ff007f'])
      .arcAltitude((d: TripArc) => d.altitude || 0.25)
      .arcStroke(1.5)
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashInitialGap(() => Math.random())
      .arcDashAnimateTime(1800)
      .arcLabel((d: TripArc) => `
        <div style="background: rgba(15, 23, 42, 0.9); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 240, 255, 0.4); color: #fff; font-family: sans-serif; font-size: 12px;">
          <div style="font-weight: bold; color: ${d.color};">${d.type}</div>
          <div>${d.label || `${d.distanceKm} km`}</div>
          <div style="color: #94a3b8; font-size: 11px;">${new Date(d.startTime).toLocaleDateString()}</div>
        </div>
      `)
      .onArcHover((arc: any) => {
        if (onHoverItem) onHoverItem(arc);
      });
  }, [visibleArcs]);

  // Update Rings & Pulse Markers for Visits
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    const ringsData = visibleVisits.slice(-30).map((v) => ({
      lat: v.lat,
      lng: v.lng,
      maxR: 3.5,
      propagationSpeed: 1.5,
      repeatPeriod: 1200,
      color: v.semanticType === 'HOME' ? '#ec4899' : '#00f0ff',
    }));

    globe
      .ringsData(ringsData)
      .ringColor((d: any) => (t: number) => `rgba(${d.color === '#ec4899' ? '236, 72, 153' : '0, 240, 255'}, ${1 - t})`)
      .ringMaxRadius('maxR')
      .ringPropagationSpeed('propagationSpeed')
      .ringRepeatPeriod('repeatPeriod');

    // Labels data for major cities
    if (layers.labels) {
      const labelsData = visibleVisits
        .filter((v, idx, arr) => arr.findIndex((x) => x.name === v.name) === idx)
        .slice(-25)
        .map((v) => ({
          lat: v.lat,
          lng: v.lng,
          text: v.name?.split(',')[0] || 'Visit',
          color: v.semanticType === 'HOME' ? '#f43f5e' : '#38bdf8',
          size: 1.1,
          visit: v,
        }));

      globe
        .labelsData(labelsData)
        .labelLat('lat')
        .labelLng('lng')
        .labelText('text')
        .labelSize('size')
        .labelDotRadius(0.5)
        .labelColor('color')
        .labelResolution(3)
        .onLabelClick((label: any) => {
          if (onSelectVisit && label.visit) onSelectVisit(label.visit);
        });
    } else {
      globe.labelsData([]);
    }
  }, [visibleVisits, layers.labels]);

  // Update Heatmap / Hexbin Layer
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    if (layers.heatmap && heatmapPoints.length > 0) {
      globe
        .hexBinPointsData(heatmapPoints)
        .hexBinPointLat('lat')
        .hexBinPointLng('lng')
        .hexBinPointWeight('weight')
        .hexBinResolution(4)
        .hexMargin(0.2)
        .hexTopColor(() => '#00f0ff')
        .hexSideColor(() => 'rgba(0, 240, 255, 0.3)')
        .hexAltitude((d: any) => Math.min(0.3, d.sumWeight * 0.02));
    } else {
      globe.hexBinPointsData([]);
    }
  }, [heatmapPoints, layers.heatmap]);

  // Auto-Camera Director: Follow playback location & Smooth Fly-To
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || cameraMode === 'free') return;

    if (cameraMode === 'orbit') {
      const controls = globe.controls();
      if (controls) controls.autoRotate = true;
      return;
    }

    if (playback.isPlaying || cameraMode === 'cinematic') {
      const activeArc = visibleArcs[visibleArcs.length - 1];
      const activeVisit = visibleVisits[visibleVisits.length - 1];

      let targetLat = 47.3769;
      let targetLng = 8.5417;

      if (activeArc) {
        targetLat = activeArc.endLat;
        targetLng = activeArc.endLng;
      } else if (activeVisit) {
        targetLat = activeVisit.lat;
        targetLng = activeVisit.lng;
      }

      const last = lastTargetCoordsRef.current;
      if (!last || Math.abs(last.lat - targetLat) > 0.5 || Math.abs(last.lng - targetLng) > 0.5) {
        lastTargetCoordsRef.current = { lat: targetLat, lng: targetLng };
        globe.pointOfView({ lat: targetLat, lng: targetLng, altitude: 1.8 }, 1400);
      }
    }
  }, [playback.currentTime, playback.isPlaying, cameraMode, visibleArcs, visibleVisits]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden transition-all duration-300 ${
        aspectRatioMode === '9:16'
          ? 'story-frame-guide'
          : aspectRatioMode === '1:1'
          ? 'aspect-square max-h-[85vh] rounded-3xl border border-white/20 shadow-2xl'
          : ''
      }`}
      style={{ minWidth: '100%', minHeight: '100%' }}
    >
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      />
    </div>
  );
};
