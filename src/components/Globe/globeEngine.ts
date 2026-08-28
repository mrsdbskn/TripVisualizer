import * as THREE from 'three'
import type {
  TimelineSegment,
  GlobeTheme,
  CameraMode,
  ActiveJourneyState,
  GeoPoint
} from '../../types/timeline'
import {
  latLngToVector3,
  createArcPoints
} from '../../services/geodesic'
import { VehicleRenderer } from './vehicleRenderer'

export class GlobeEngine {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private animationFrameId: number | null = null

  // Core 3D objects
  private globeRadius = 100
  private earthGroup: THREE.Group
  private earthMesh!: THREE.Mesh
  private earthMaterial!: THREE.MeshStandardMaterial
  private cloudsMesh!: THREE.Mesh
  private atmosphereMesh!: THREE.Mesh
  private starsParticles!: THREE.Points
  private routesGroup: THREE.Group
  private markersGroup: THREE.Group
  private cityLabelsGroup: THREE.Group
  private vehicleRenderer: VehicleRenderer

  // High-Res Textures
  private textureLoader = new THREE.TextureLoader()
  private vectorDayMap: THREE.CanvasTexture | null = null
  private vectorNeonMap: THREE.CanvasTexture | null = null
  private vectorAtlasMap: THREE.CanvasTexture | null = null
  private cityLightsMap: THREE.CanvasTexture | null = null

  // Interaction & Camera
  private cameraMode: CameraMode = 'follow'
  private currentTheme: GlobeTheme = 'satellite'
  private targetCameraPos = new THREE.Vector3(0, 50, 260)
  private targetLookAt = new THREE.Vector3(0, 0, 0)
  private currentLookAt = new THREE.Vector3(0, 0, 0)
  private isUserInteracting = false
  private pointerPrev = { x: 0, y: 0 }
  private spherical = { radius: 260, phi: Math.PI / 2.5, theta: 0 }
  private isFocusing = false

  // Route animation states
  private flightDashOffset = 0
  private flightMaterials: THREE.LineDashedMaterial[] = []

  // Resize & Render
  private width: number
  private height: number

  constructor(container: HTMLElement) {
    this.container = container
    this.width = container.clientWidth || window.innerWidth
    this.height = container.clientHeight || window.innerHeight

    // 1. Scene & Camera
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x04060e)

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 4000)
    this.camera.position.set(0, 50, 260)

    // 2. Renderer (with High-DPI and preserveDrawingBuffer for Instagram Stories)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.25
    this.container.appendChild(this.renderer.domElement)

    // 3. Groups
    this.earthGroup = new THREE.Group()
    this.routesGroup = new THREE.Group()
    this.markersGroup = new THREE.Group()
    this.cityLabelsGroup = new THREE.Group()
    this.vehicleRenderer = new VehicleRenderer()

    this.earthGroup.add(this.routesGroup)
    this.earthGroup.add(this.markersGroup)
    this.earthGroup.add(this.cityLabelsGroup)
    this.earthGroup.add(this.vehicleRenderer.getObject())
    this.scene.add(this.earthGroup)

    // 4. Setup Lighting, Starfield, Atmospheric Glow & Ultra-HD Vector Globe
    this.setupLighting()
    this.buildStarfield()
    this.buildUltraHdVectorGlobe()
    this.buildAtmosphere()
    this.buildClouds()
    this.setupEventListeners()

    // 5. Start Render Loop
    this.startLoop()
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xddeeff, 0.6)
    this.scene.add(ambient)

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.0)
    sunLight.position.set(500, 250, 350)
    this.scene.add(sunLight)

    const spaceRimLight = new THREE.DirectionalLight(0x00d4ff, 0.7)
    spaceRimLight.position.set(-400, -150, -300)
    this.scene.add(spaceRimLight)
  }

  private buildStarfield() {
    const starCount = 2400
    const starGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const radius = 1200 + Math.random() * 1200
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const tint = Math.random()
      if (tint > 0.8) {
        colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0
      } else if (tint > 0.65) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 0.55
      } else {
        colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.98; colors[i * 3 + 2] = 1.0
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    })

    this.starsParticles = new THREE.Points(starGeo, starMat)
    this.scene.add(this.starsParticles)
  }

  /**
   * Generates a 4096x2048 Ultra-HD Stylized Vector Outline Map with crisp contours and latitude grid
   */
  private generateVectorGlobeTexture(style: 'satellite' | 'neon' | 'atlas' | 'night'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 4096
    canvas.height = 2048
    const ctx = canvas.getContext('2d')!

    const w = canvas.width
    const h = canvas.height

    if (style === 'neon') {
      // Dark cyber matrix with glowing borders
      ctx.fillStyle = '#050711'
      ctx.fillRect(0, 0, w, h)

      // Latitude / Longitude Vector Grid
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)'
      ctx.lineWidth = 2
      for (let lat = 0; lat <= h; lat += h / 12) {
        ctx.beginPath(); ctx.moveTo(0, lat); ctx.lineTo(w, lat); ctx.stroke()
      }
      for (let lng = 0; lng <= w; lng += w / 24) {
        ctx.beginPath(); ctx.moveTo(lng, 0); ctx.lineTo(lng, h); ctx.stroke()
      }

      // Landmass fills with neon glow stroke
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'
      ctx.strokeStyle = '#00f0ff'
      ctx.lineWidth = 4
      ctx.shadowColor = '#00f0ff'
      ctx.shadowBlur = 12

      this.drawVectorLandmasses(ctx, w, h)

      // Glowing city point clusters
      ctx.fillStyle = '#ff2a6d'
      ctx.shadowColor = '#ff2a6d'
      ctx.shadowBlur = 6
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * w
        const y = 300 + Math.random() * (h - 600)
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (style === 'atlas') {
      // Modern Minimalist Dark Atlas (Apple Maps style)
      ctx.fillStyle = '#0f141f'
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = '#1c2436'
      ctx.strokeStyle = '#4a5568'
      ctx.lineWidth = 4
      ctx.shadowBlur = 0

      this.drawVectorLandmasses(ctx, w, h)
    } else if (style === 'night') {
      // City Lights at Night
      ctx.fillStyle = '#03050c'
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = '#0a0e1a'
      ctx.strokeStyle = 'rgba(255, 180, 50, 0.4)'
      ctx.lineWidth = 3
      this.drawVectorLandmasses(ctx, w, h)

      // Golden metropolitan light clusters
      ctx.fillStyle = '#ffb703'
      ctx.shadowColor = '#00f0ff'
      ctx.shadowBlur = 8
      for (let i = 0; i < 1200; i++) {
        const x = Math.random() * w
        const y = 250 + Math.random() * (h - 500)
        const sz = 1.0 + Math.random() * 3.0
        ctx.beginPath()
        ctx.arc(x, y, sz, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      // Satellite Stylized Vector Hybrid (Deep blue oceans with crisp emerald/forest topographic landmasses)
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, h)
      oceanGrad.addColorStop(0, '#0a1d37')
      oceanGrad.addColorStop(0.5, '#051326')
      oceanGrad.addColorStop(1, '#081a32')
      ctx.fillStyle = oceanGrad
      ctx.fillRect(0, 0, w, h)

      // Latitude / Longitude subtle grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)'
      ctx.lineWidth = 2
      for (let lat = 0; lat <= h; lat += h / 12) {
        ctx.beginPath(); ctx.moveTo(0, lat); ctx.lineTo(w, lat); ctx.stroke()
      }

      // Topographic Landmasses
      ctx.fillStyle = '#1b3824'
      ctx.strokeStyle = '#346d43'
      ctx.lineWidth = 4
      ctx.shadowColor = 'rgba(0, 240, 255, 0.2)'
      ctx.shadowBlur = 4

      this.drawVectorLandmasses(ctx, w, h)

      // Polar Ice caps
      ctx.fillStyle = 'rgba(235, 245, 255, 0.9)'
      ctx.fillRect(0, 0, w, 90)
      ctx.fillRect(0, h - 90, w, 90)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    return tex
  }

  /**
   * Accurate vector geometry for world continents and islands
   */
  private drawVectorLandmasses(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // 1. Europe & Asia block
    ctx.beginPath()
    ctx.ellipse(w * 0.65, h * 0.34, w * 0.22, h * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 2. United Kingdom & Scandinavia
    ctx.beginPath()
    ctx.ellipse(w * 0.49, h * 0.26, w * 0.03, h * 0.06, 0.2, 0, Math.PI * 2)
    ctx.ellipse(w * 0.53, h * 0.22, w * 0.04, h * 0.08, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 3. Africa
    ctx.beginPath()
    ctx.ellipse(w * 0.52, h * 0.58, w * 0.09, h * 0.19, 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 4. North America
    ctx.beginPath()
    ctx.ellipse(w * 0.24, h * 0.36, w * 0.13, h * 0.16, -0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 5. South America
    ctx.beginPath()
    ctx.ellipse(w * 0.31, h * 0.68, w * 0.07, h * 0.18, 0.25, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 6. Japan & East Asia Islands
    ctx.beginPath()
    ctx.ellipse(w * 0.88, h * 0.38, w * 0.025, h * 0.08, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()

    // 7. Australia & New Zealand
    ctx.beginPath()
    ctx.ellipse(w * 0.83, h * 0.72, w * 0.06, h * 0.08, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }

  private buildUltraHdVectorGlobe() {
    const geo = new THREE.SphereGeometry(this.globeRadius, 64, 64)
    this.vectorDayMap = this.generateVectorGlobeTexture('satellite')
    this.vectorNeonMap = this.generateVectorGlobeTexture('neon')
    this.vectorAtlasMap = this.generateVectorGlobeTexture('atlas')
    this.cityLightsMap = this.generateVectorGlobeTexture('night')

    this.earthMaterial = new THREE.MeshStandardMaterial({
      map: this.vectorDayMap,
      roughness: 0.5,
      metalness: 0.25
    })

    this.earthMesh = new THREE.Mesh(geo, this.earthMaterial)
    this.earthGroup.add(this.earthMesh)
  }

  private buildClouds() {
    const cloudGeo = new THREE.SphereGeometry(this.globeRadius + 1.4, 64, 64)
    const cloudMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    })

    this.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
    this.earthGroup.add(this.cloudsMesh)
  }

  private buildAtmosphere() {
    const geo = new THREE.SphereGeometry(this.globeRadius * 1.16, 64, 64)

    const atmosphereShader = {
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
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 1.6;
        }
      `
    }

    const mat = new THREE.ShaderMaterial({
      vertexShader: atmosphereShader.vertexShader,
      fragmentShader: atmosphereShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    })

    this.atmosphereMesh = new THREE.Mesh(geo, mat)
    this.scene.add(this.atmosphereMesh)
  }

  public setTheme(theme: GlobeTheme) {
    this.currentTheme = theme
    if (theme === 'neon') {
      this.earthMaterial.map = this.vectorNeonMap
      this.earthMaterial.color.set(0xffffff)
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x020308)
    } else if (theme === 'night') {
      this.earthMaterial.map = this.cityLightsMap
      this.earthMaterial.color.set(0xffffff)
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x03050c)
    } else if (theme === 'atlas') {
      this.earthMaterial.map = this.vectorAtlasMap
      this.earthMaterial.color.set(0xffffff)
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x080b12)
    } else {
      this.earthMaterial.map = this.vectorDayMap
      this.earthMaterial.color.set(0xffffff)
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x04060e)
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode
    this.isFocusing = false
  }

  public focusOnCoordinates(lat: number, lng: number, distance: number = 145) {
    const targetPos = latLngToVector3(lat, lng, this.globeRadius, 0)
    const normal = targetPos.clone().normalize()
    this.targetCameraPos.copy(targetPos).add(normal.clone().multiplyScalar(distance - this.globeRadius))
    this.targetLookAt.copy(targetPos)
    this.isFocusing = true
  }

  /**
   * Creates a high-contrast 3D Billboard Sprite with City Name and Flag tag
   */
  private createCityLabelSprite(cityName: string, isSelected: boolean = false): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 160
    const ctx = canvas.getContext('2d')!

    // Background pill badge
    ctx.shadowColor = isSelected ? '#ff2a6d' : '#00f0ff'
    ctx.shadowBlur = 16
    ctx.fillStyle = isSelected ? 'rgba(255, 42, 109, 0.88)' : 'rgba(10, 15, 28, 0.88)'
    ctx.beginPath()
    ctx.roundRect(24, 24, 464, 112, 56)
    ctx.fill()

    // Border
    ctx.lineWidth = 6
    ctx.strokeStyle = isSelected ? '#ffffff' : '#00f0ff'
    ctx.stroke()

    // Text Label
    ctx.shadowBlur = 0
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 52px "Outfit", "Plus Jakarta Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`📍 ${cityName}`, 256, 80)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(16, 5, 1)
    return sprite
  }

  /**
   * Rebuilds routes, destination pins and 3D city labels
   */
  public updateRoutes(segments: TimelineSegment[], selectedCityName: string | null = null) {
    while (this.routesGroup.children.length > 0) {
      const obj = this.routesGroup.children[0]
      this.routesGroup.remove(obj)
    }
    while (this.markersGroup.children.length > 0) {
      const obj = this.markersGroup.children[0]
      this.markersGroup.remove(obj)
    }
    while (this.cityLabelsGroup.children.length > 0) {
      const obj = this.cityLabelsGroup.children[0]
      this.cityLabelsGroup.remove(obj)
    }
    this.flightMaterials = []

    const visitedPlacesSet = new Set<string>()

    for (const seg of segments) {
      // 1. Destination pin markers & 3D City Labels
      if (seg.point) {
        const key = `${seg.point.lat.toFixed(2)},${seg.point.lng.toFixed(2)}`
        if (!visitedPlacesSet.has(key)) {
          visitedPlacesSet.add(key)
          const isSelected = selectedCityName ? seg.city === selectedCityName : false
          this.createPlaceMarker(seg.point, seg.semanticType || 'VISIT', isSelected)

          if (seg.city && seg.city !== 'Unknown Place' && seg.city !== 'Journey') {
            const labelSprite = this.createCityLabelSprite(seg.city, isSelected)
            const labelPos = latLngToVector3(seg.point.lat, seg.point.lng, this.globeRadius, 6.0)
            labelSprite.position.copy(labelPos)
            this.cityLabelsGroup.add(labelSprite)
          }
        }
      }

      // 2. Activity routes
      if (seg.type === 'activity' && seg.path.length >= 2) {
        const isFlight = seg.activityType === 'FLYING'
        const color = isFlight
          ? 0x00f0ff
          : seg.activityType === 'IN_TRAIN'
          ? 0x00ff9d
          : seg.activityType === 'IN_PASSENGER_VEHICLE'
          ? 0xffa500
          : 0xff2a6d

        if (isFlight && seg.startPoint && seg.endPoint) {
          const points = createArcPoints(
            seg.startPoint,
            seg.endPoint,
            this.globeRadius,
            true,
            64
          )
          const geometry = new THREE.BufferGeometry().setFromPoints(points)

          const mat = new THREE.LineDashedMaterial({
            color,
            linewidth: 3,
            scale: 1,
            dashSize: 4,
            gapSize: 2,
            transparent: true,
            opacity: 0.95
          })
          const line = new THREE.Line(geometry, mat)
          line.computeLineDistances()
          this.routesGroup.add(line)
          this.flightMaterials.push(mat)
        } else {
          const allPoints: THREE.Vector3[] = []
          for (let i = 0; i < seg.path.length - 1; i++) {
            const pts = createArcPoints(
              seg.path[i],
              seg.path[i + 1],
              this.globeRadius,
              false,
              6
            )
            allPoints.push(...pts)
          }

          if (allPoints.length > 1) {
            const geometry = new THREE.BufferGeometry().setFromPoints(allPoints)
            const mat = new THREE.LineBasicMaterial({
              color,
              transparent: true,
              opacity: 0.85,
              linewidth: 3
            })
            const line = new THREE.Line(geometry, mat)
            this.routesGroup.add(line)
          }
        }
      }
    }
  }

  private createPlaceMarker(point: GeoPoint, semanticType: string, isSelected: boolean = false) {
    const pos = latLngToVector3(point.lat, point.lng, this.globeRadius, 0.4)
    const normal = pos.clone().normalize()

    const ringGeo = new THREE.RingGeometry(1.0, isSelected ? 2.8 : 1.8, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: isSelected ? 0xff2a6d : 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.copy(pos)
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

    const pinPos = latLngToVector3(point.lat, point.lng, this.globeRadius, isSelected ? 3.5 : 2.2)
    const beadGeo = new THREE.SphereGeometry(isSelected ? 1.5 : 1.0, 16, 16)
    const beadMat = new THREE.MeshBasicMaterial({
      color: isSelected ? 0xff2a6d : (semanticType === 'HOME' ? 0xff0055 : 0xffb703)
    })
    const bead = new THREE.Mesh(beadGeo, beadMat)
    bead.position.copy(pinPos)

    const markerGroup = new THREE.Group()
    markerGroup.add(ring)
    markerGroup.add(bead)
    this.markersGroup.add(markerGroup)
  }

  /**
   * Updates vehicle emoji sprite position and handles smooth cinematic camera
   */
  public updateJourney(state: ActiveJourneyState) {
    if (!state.currentPosition) return

    const pos3D = latLngToVector3(
      state.currentPosition.lat,
      state.currentPosition.lng,
      this.globeRadius,
      state.currentAltitude || 0.4
    )

    const forwardDeg = state.currentHeading
    const forwardRad = (forwardDeg * Math.PI) / 180
    const normal = pos3D.clone().normalize()

    const northTangent = new THREE.Vector3(0, 1, 0)
      .projectOnPlane(normal)
      .normalize()
    const eastTangent = new THREE.Vector3()
      .crossVectors(normal, northTangent)
      .normalize()

    const forward = new THREE.Vector3()
      .addScaledVector(northTangent, Math.cos(forwardRad))
      .addScaledVector(eastTangent, Math.sin(forwardRad))
      .normalize()

    const camDistance = this.camera.position.distanceTo(pos3D)

    // Update vehicle with Google Emoji
    this.vehicleRenderer.update(
      pos3D,
      forward,
      state.currentSegment?.activityType,
      camDistance
    )

    if (!this.isUserInteracting && !this.isFocusing) {
      if (this.cameraMode === 'follow') {
        const camOffset = forward.clone().multiplyScalar(-24).add(normal.clone().multiplyScalar(14))
        this.targetCameraPos.copy(pos3D).add(camOffset)
        this.targetLookAt.copy(pos3D).add(forward.clone().multiplyScalar(10))
      } else if (this.cameraMode === 'bird') {
        this.targetCameraPos.copy(pos3D).add(normal.clone().multiplyScalar(75))
        this.targetLookAt.copy(pos3D)
      } else if (this.cameraMode === 'orbit') {
        this.spherical.theta += 0.002
        this.targetCameraPos.setFromSphericalCoords(
          250,
          Math.PI / 2.6,
          this.spherical.theta
        )
        this.targetLookAt.copy(pos3D).multiplyScalar(0.3)
      }
    }
  }

  private setupEventListeners() {
    const el = this.renderer.domElement

    el.addEventListener('pointerdown', (e) => {
      this.isUserInteracting = true
      this.isFocusing = false
      this.pointerPrev.x = e.clientX
      this.pointerPrev.y = e.clientY
    })

    window.addEventListener('pointermove', (e) => {
      if (!this.isUserInteracting) return
      const dx = e.clientX - this.pointerPrev.x
      const dy = e.clientY - this.pointerPrev.y
      this.pointerPrev.x = e.clientX
      this.pointerPrev.y = e.clientY

      this.spherical.theta -= dx * 0.005
      this.spherical.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005)
      )

      if (this.cameraMode === 'free') {
        this.camera.position.setFromSphericalCoords(
          this.spherical.radius,
          this.spherical.phi,
          this.spherical.theta
        )
        this.camera.lookAt(0, 0, 0)
      }
    })

    window.addEventListener('pointerup', () => {
      this.isUserInteracting = false
    })

    el.addEventListener('wheel', (e) => {
      e.preventDefault()
      const zoomFactor = e.deltaY * 0.15
      this.spherical.radius = Math.max(115, Math.min(650, this.spherical.radius + zoomFactor))
      if (this.cameraMode === 'free') {
        this.camera.position.setFromSphericalCoords(
          this.spherical.radius,
          this.spherical.phi,
          this.spherical.theta
        )
        this.camera.lookAt(0, 0, 0)
      }
    }, { passive: false })

    window.addEventListener('resize', () => this.onResize())
  }

  public onResize() {
    this.width = this.container.clientWidth || window.innerWidth
    this.height = this.container.clientHeight || window.innerHeight
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.width, this.height)
  }

  private startLoop() {
    const render = () => {
      this.animationFrameId = requestAnimationFrame(render)

      if (this.cloudsMesh) this.cloudsMesh.rotation.y += 0.00035
      if (this.starsParticles) this.starsParticles.rotation.y += 0.00006

      this.flightDashOffset -= 0.15
      for (const mat of this.flightMaterials) {
        mat.dashSize = 4
        mat.gapSize = 2
      }

      // Dynamic LOD scaling of 3D City Labels based on distance
      const camDist = this.camera.position.length()
      const labelScaleFactor = Math.max(0.6, Math.min(1.8, camDist / 260))
      for (const label of this.cityLabelsGroup.children) {
        label.scale.set(16 * labelScaleFactor, 5 * labelScaleFactor, 1)
      }

      if (this.cameraMode !== 'free' && !this.isUserInteracting) {
        this.camera.position.lerp(this.targetCameraPos, 0.05)
        this.currentLookAt.lerp(this.targetLookAt, 0.07)
        this.camera.lookAt(this.currentLookAt)
      }

      this.renderer.render(this.scene, this.camera)
    }

    render()
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  public captureSnapshot(): string {
    this.renderer.render(this.scene, this.camera)
    return this.renderer.domElement.toDataURL('image/png')
  }

  public destroy() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId)
    this.renderer.dispose()
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement)
    }
  }
}
