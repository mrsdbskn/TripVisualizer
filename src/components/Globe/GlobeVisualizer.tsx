import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

const GLOBE_RADIUS = 100;

// Convert geographic Lat/Lng into 3D Cartesian coordinates
function latLngToVector3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Generate procedural high-tech canvas Earth texture (100% offline & instant)
function createProceduralEarthTexture(theme: GlobeTheme): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const isDark = theme === 'dark-neon' || theme === 'midnight-blue' || theme === 'cyberpunk';
  const oceanColor = theme === 'cyberpunk' ? '#07050e' : theme === 'dark-neon' ? '#060810' : '#040d1a';
  const landColor = theme === 'cyberpunk' ? '#1f1338' : theme === 'dark-neon' ? '#111827' : '#0f233d';
  const gridColor = theme === 'cyberpunk' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(0, 240, 255, 0.2)';

  // Ocean fill
  ctx.fillStyle = oceanColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Lat/Lng grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;

  // Parallels (Latitude)
  for (let lat = -80; lat <= 80; lat += 20) {
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Meridians (Longitude)
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * canvas.width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // Draw Continents Approximation
  ctx.fillStyle = landColor;
  ctx.strokeStyle = theme === 'cyberpunk' ? '#ff007f' : '#00f0ff';
  ctx.lineWidth = 1.5;

  const continents = [
    // Europe
    [[0, 45], [10, 60], [30, 70], [45, 60], [35, 40], [20, 35], [-10, 35], [-10, 45]],
    // Asia
    [[45, 60], [70, 75], [140, 70], [145, 45], [120, 25], [100, 10], [75, 10], [60, 25], [40, 35]],
    // North America
    [[-160, 70], [-120, 75], [-60, 65], [-75, 40], [-80, 25], [-100, 20], [-120, 35], [-165, 60]],
    // South America
    [[-80, 10], [-50, -5], [-35, -5], [-40, -25], [-70, -55], [-75, -45], [-80, -10]],
    // Africa
    [[-15, 30], [30, 30], [50, 10], [40, -10], [30, -35], [15, -35], [10, 5], [-15, 15]],
    // Australia
    [[115, -20], [150, -15], [150, -35], [135, -38], [115, -35]],
  ];

  continents.forEach((poly) => {
    ctx.beginPath();
    poly.forEach(([lng, lat], idx) => {
      const x = ((lng + 180) / 360) * canvas.width;
      const y = ((90 - lat) / 180) * canvas.height;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  });

  // City Lights & Star Clusters on land
  ctx.fillStyle = theme === 'cyberpunk' ? '#ff77aa' : '#7dd3fc';
  const majorHubs = [
    [8.54, 47.37], [139.65, 35.67], [-74.0, 40.71], [-122.41, 37.77],
    [2.35, 48.85], [-0.12, 51.5], [9.19, 45.46], [12.49, 41.9],
    [30.71, 36.89], [55.27, 25.2], [103.81, 1.35], [13.4, 52.52]
  ];

  majorHubs.forEach(([lng, lat]) => {
    const x = ((lng + 180) / 360) * canvas.width;
    const y = ((90 - lat) / 180) * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const animatedPhotonsRef = useRef<Array<{ mesh: THREE.Mesh; curve: THREE.Curve<THREE.Vector3>; speed: number; progress: number }>>([]);
  const targetCameraPosRef = useRef<{ pos: THREE.Vector3; lookAt: THREE.Vector3 } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
    camera.position.set(0, 80, 260);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    rendererRef.current = renderer;

    containerRef.current.replaceChildren(renderer.domElement);

    if (canvasRefCallback) {
      canvasRefCallback(renderer.domElement);
    }

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 120;
    controls.maxDistance = 600;
    controls.autoRotate = cameraMode === 'orbit';
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight1.position.set(200, 200, 200);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 1.0);
    dirLight2.position.set(-200, -100, -200);
    scene.add(dirLight2);

    // 6. Earth Sphere with Procedural Texture
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const texture = createProceduralEarthTexture(theme);
    const earthMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.1,
    });
    const globeMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(globeMesh);
    globeMeshRef.current = globeMesh;

    // Try loading external NASA texture in background without blocking
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-dark.jpg',
      (loadedTex) => {
        if (globeMeshRef.current) {
          loadedTex.wrapS = THREE.RepeatWrapping;
          (globeMeshRef.current.material as THREE.MeshStandardMaterial).map = loadedTex;
          (globeMeshRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
        }
      },
      undefined,
      () => {
        // Fallback procedural texture already loaded seamlessly
      }
    );

    // 7. Glowing Atmosphere Halo
    const atmosphereGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.03, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.0, 0.94, 1.0, 1.0) * intensity;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 8. Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 2000;
      starPositions[i + 1] = (Math.random() - 0.5) * 2000;
      starPositions[i + 2] = (Math.random() - 0.5) * 2000;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Groups for Arcs & Markers
    const arcsGroup = new THREE.Group();
    scene.add(arcsGroup);
    arcsGroupRef.current = arcsGroup;

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Render Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Animate photon particles along flight arcs
      animatedPhotonsRef.current.forEach((item) => {
        item.progress = (item.progress + delta * item.speed) % 1.0;
        const pt = item.curve.getPoint(item.progress);
        item.mesh.position.copy(pt);
      });

      // Animate pulsing rings
      if (markersGroupRef.current) {
        markersGroupRef.current.children.forEach((child) => {
          if (child.userData.isRing) {
            child.userData.phase = (child.userData.phase + delta * 1.5) % 1.0;
            const scale = 1.0 + child.userData.phase * 1.5;
            child.scale.set(scale, scale, scale);
            if ((child as THREE.Mesh).material) {
              ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 1.0 - child.userData.phase;
            }
          }
        });
      }

      // Smooth Camera Fly-To easing
      if (targetCameraPosRef.current && cameraRef.current && controlsRef.current) {
        const { pos, lookAt } = targetCameraPosRef.current;
        cameraRef.current.position.lerp(pos, 0.05);
        controlsRef.current.target.lerp(lookAt, 0.05);
        if (cameraRef.current.position.distanceTo(pos) < 1.0) {
          targetCameraPosRef.current = null;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Update Earth Texture when Theme changes
  useEffect(() => {
    if (globeMeshRef.current) {
      const tex = createProceduralEarthTexture(theme);
      (globeMeshRef.current.material as THREE.MeshStandardMaterial).map = tex;
      (globeMeshRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }
  }, [theme]);

  // Update Arcs & Flight Trajectories
  useEffect(() => {
    if (!arcsGroupRef.current) return;
    const arcsGroup = arcsGroupRef.current;

    // Clear previous arcs
    while (arcsGroup.children.length > 0) {
      const obj = arcsGroup.children[0];
      arcsGroup.remove(obj);
    }
    animatedPhotonsRef.current = [];

    if (!layers.arcs) return;

    const visibleArcs = data.arcs.filter((arc) => {
      if (playback.isPlaying) {
        return arc.startTime <= playback.currentTime && arc.endTime >= playback.rangeStart;
      }
      return arc.startTime <= playback.rangeEnd && arc.endTime >= playback.rangeStart;
    });

    visibleArcs.forEach((arc) => {
      const p1 = latLngToVector3(arc.startLat, arc.startLng);
      const p2 = latLngToVector3(arc.endLat, arc.endLng);

      // Midpoint elevated in altitude
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dist = p1.distanceTo(p2);
      const altitude = Math.max(15, (dist / (2 * GLOBE_RADIUS)) * 65);
      mid.setLength(GLOBE_RADIUS + altitude);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const points = curve.getPoints(50);
      const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

      const hexColor = getActivityColor(arc.type);
      const curveMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(hexColor),
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });

      const line = new THREE.Line(curveGeo, curveMat);
      arcsGroup.add(line);

      // Animated Photon Light particle
      const photonGeo = new THREE.SphereGeometry(1.4, 16, 16);
      const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const photonMesh = new THREE.Mesh(photonGeo, photonMat);
      arcsGroup.add(photonMesh);

      animatedPhotonsRef.current.push({
        mesh: photonMesh,
        curve,
        speed: 0.35,
        progress: Math.random(),
      });
    });
  }, [data.arcs, layers.arcs, playback.currentTime, playback.isPlaying, playback.rangeStart, playback.rangeEnd]);

  // Update Visits & 3D Radar Rings
  useEffect(() => {
    if (!markersGroupRef.current) return;
    const markersGroup = markersGroupRef.current;

    while (markersGroup.children.length > 0) {
      const obj = markersGroup.children[0];
      markersGroup.remove(obj);
    }

    if (!layers.markers) return;

    const visibleVisits = data.visits.filter((v) => {
      if (playback.isPlaying) {
        return v.startTime <= playback.currentTime && v.endTime >= playback.rangeStart;
      }
      return v.startTime <= playback.rangeEnd && v.endTime >= playback.rangeStart;
    });

    visibleVisits.slice(-35).forEach((v) => {
      const pos = latLngToVector3(v.lat, v.lng, GLOBE_RADIUS + 0.5);

      // Base Pin Sphere
      const pinGeo = new THREE.SphereGeometry(1.8, 16, 16);
      const isHome = v.semanticType === 'HOME';
      const pinMat = new THREE.MeshBasicMaterial({ color: isHome ? 0xf43f5e : 0x00f0ff });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.copy(pos);
      markersGroup.add(pin);

      // Concentric Pulsing Ring
      const ringGeo = new THREE.RingGeometry(1.8, 2.6, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isHome ? 0xf43f5e : 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
      ringMesh.userData = { isRing: true, phase: Math.random() };
      markersGroup.add(ringMesh);
    });
  }, [data.visits, layers.markers, playback.currentTime, playback.isPlaying, playback.rangeStart, playback.rangeEnd]);

  // Camera Fly-To when trip changes
  useEffect(() => {
    if (cameraMode === 'cinematic' || cameraMode === 'follow-trip') {
      const activeArc = data.arcs.find((a) => a.startTime <= playback.currentTime && a.endTime >= playback.currentTime);
      const activeVisit = data.visits.find((v) => v.startTime <= playback.currentTime && v.endTime >= playback.currentTime);

      let targetLat = 47.3769;
      let targetLng = 8.5417;

      if (activeArc) {
        targetLat = (activeArc.startLat + activeArc.endLat) / 2;
        targetLng = (activeArc.startLng + activeArc.endLng) / 2;
      } else if (activeVisit) {
        targetLat = activeVisit.lat;
        targetLng = activeVisit.lng;
      }

      const surfacePos = latLngToVector3(targetLat, targetLng, GLOBE_RADIUS);
      const cameraPos = latLngToVector3(targetLat, targetLng, GLOBE_RADIUS + 160);

      targetCameraPosRef.current = {
        pos: cameraPos,
        lookAt: surfacePos,
      };
    }
  }, [playback.currentTime, cameraMode, data.arcs, data.visits]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${
        aspectRatioMode === '9:16'
          ? 'story-frame-guide'
          : aspectRatioMode === '1:1'
          ? 'aspect-square max-h-[82vh] rounded-3xl border border-white/20 shadow-2xl'
          : ''
      }`}
      style={{ width: '100%', height: '100%' }}
    >
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
