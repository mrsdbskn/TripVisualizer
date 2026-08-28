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
  createArcPoints,
  interpolateGreatCircle
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
  private vehicleRenderer: VehicleRenderer

  // Interaction & Camera
  private cameraMode: CameraMode = 'follow'
  private currentTheme: GlobeTheme = 'satellite'
  private targetCameraPos = new THREE.Vector3(0, 50, 260)
  private targetLookAt = new THREE.Vector3(0, 0, 0)
  private currentLookAt = new THREE.Vector3(0, 0, 0)
  private isUserInteracting = false
  private pointerPrev = { x: 0, y: 0 }
  private spherical = { radius: 260, phi: Math.PI / 2.5, theta: 0 }
  private orbitSpeed = 0.0008

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
    this.scene.background = new THREE.Color(0x060810)

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 3000)
    this.camera.position.set(0, 50, 260)

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true // Required for Instagram Story snapshot & recording!
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.container.appendChild(this.renderer.domElement)

    // 3. Groups
    this.earthGroup = new THREE.Group()
    this.routesGroup = new THREE.Group()
    this.markersGroup = new THREE.Group()
    this.vehicleRenderer = new VehicleRenderer()

    this.earthGroup.add(this.routesGroup)
    this.earthGroup.add(this.markersGroup)
    this.earthGroup.add(this.vehicleRenderer.getObject())
    this.scene.add(this.earthGroup)

    // 4. Build Components
    this.setupLighting()
    this.buildStarfield()
    this.buildEarthSphere()
    this.buildAtmosphere()
    this.buildClouds()
    this.setupEventListeners()

    // 5. Start Render Loop
    this.startLoop()
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45)
    this.scene.add(ambient)

    // Sun directional light
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8)
    sunLight.position.set(400, 200, 300)
    this.scene.add(sunLight)

    // Subtle blue rim light from opposite side
    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.6)
    rimLight.position.set(-300, -100, -200)
    this.scene.add(rimLight)
  }

  private buildStarfield() {
    const starCount = 1800
    const starGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const radius = 1000 + Math.random() * 800
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      // Varied star tints (white, cyan, gold)
      const tint = Math.random()
      if (tint > 0.8) {
        colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 1.0 // cyan
      } else if (tint > 0.6) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.5 // warm gold
      } else {
        colors[i * 3] = 0.9; colors[i * 3 + 1] = 0.95; colors[i * 3 + 2] = 1.0 // diamond white
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    })

    this.starsParticles = new THREE.Points(starGeo, starMat)
    this.scene.add(this.starsParticles)
  }

  /**
   * Generates procedural photoreal Earth texture map with continents, oceans, and night lights
   */
  private generateEarthTexture(isNight: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!

    if (isNight) {
      // Dark space background with glowing city lights
      ctx.fillStyle = '#05070e'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw glowing continent city clusters
      ctx.fillStyle = '#ffaa33'
      ctx.shadowColor = '#00f0ff'
      ctx.shadowBlur = 4
      for (let i = 0; i < 600; i++) {
        const x = Math.random() * canvas.width
        const y = 200 + Math.random() * (canvas.height - 400)
        const size = Math.random() * 2.5
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      // Realistic Ocean Gradient
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height)
      oceanGrad.addColorStop(0, '#0a2342')
      oceanGrad.addColorStop(0.5, '#001a33')
      oceanGrad.addColorStop(1, '#05192d')
      ctx.fillStyle = oceanGrad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Continents procedural landmasses
      ctx.fillStyle = '#1e3f20'
      ctx.strokeStyle = '#2d5a30'
      ctx.lineWidth = 2

      // Europe & Asia land block
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.65, canvas.height * 0.35, 340, 180, 0, 0, Math.PI * 2)
      ctx.fill()

      // Africa
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.52, canvas.height * 0.58, 140, 200, 0.2, 0, Math.PI * 2)
      ctx.fill()

      // Americas
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.25, canvas.height * 0.38, 160, 160, -0.2, 0, Math.PI * 2)
      ctx.ellipse(canvas.width * 0.32, canvas.height * 0.68, 110, 180, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Australia
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.82, canvas.height * 0.72, 80, 60, 0, 0, Math.PI * 2)
      ctx.fill()

      // Polar ice caps
      ctx.fillStyle = 'rgba(230, 245, 255, 0.85)'
      ctx.fillRect(0, 0, canvas.width, 45)
      ctx.fillRect(0, canvas.height - 45, canvas.width, 45)
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    return texture
  }

  private buildEarthSphere() {
    const geo = new THREE.SphereGeometry(this.globeRadius, 64, 64)
    const dayTexture = this.generateEarthTexture(false)

    this.earthMaterial = new THREE.MeshStandardMaterial({
      map: dayTexture,
      roughness: 0.65,
      metalness: 0.15
    })

    this.earthMesh = new THREE.Mesh(geo, this.earthMaterial)
    this.earthGroup.add(this.earthMesh)
  }

  private buildClouds() {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 512
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = 'transparent'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Swirly cloud puffs
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * canvas.width
      const y = Math.random() * canvas.height
      const r = 25 + Math.random() * 65
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    const cloudTex = new THREE.CanvasTexture(canvas)
    const cloudGeo = new THREE.SphereGeometry(this.globeRadius + 1.2, 48, 48)
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    })

    this.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
    this.earthGroup.add(this.cloudsMesh)
  }

  private buildAtmosphere() {
    const geo = new THREE.SphereGeometry(this.globeRadius * 1.15, 48, 48)

    // Custom Rayleigh Atmosphere Fresnel Glow Shader
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
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 1.4;
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
      this.earthMaterial.color.set(0x060b18)
      this.earthMaterial.roughness = 0.2
      this.earthMaterial.metalness = 0.8
      this.scene.background = new THREE.Color(0x03040a)
    } else if (theme === 'night') {
      this.earthMaterial.map = this.generateEarthTexture(true)
      this.earthMaterial.needsUpdate = true
      this.earthMaterial.color.set(0xffffff)
    } else if (theme === 'atlas') {
      this.earthMaterial.color.set(0x1a2130)
      this.earthMaterial.roughness = 0.9
      this.earthMaterial.metalness = 0.0
      this.scene.background = new THREE.Color(0x0d111a)
    } else {
      // Satellite photoreal
      this.earthMaterial.map = this.generateEarthTexture(false)
      this.earthMaterial.needsUpdate = true
      this.earthMaterial.color.set(0xffffff)
      this.scene.background = new THREE.Color(0x060810)
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode
  }

  /**
   * Rebuilds routes and destination pins for active timeline segments
   */
  public updateRoutes(segments: TimelineSegment[]) {
    // Clear previous
    while (this.routesGroup.children.length > 0) {
      const obj = this.routesGroup.children[0]
      this.routesGroup.remove(obj)
    }
    while (this.markersGroup.children.length > 0) {
      const obj = this.markersGroup.children[0]
      this.markersGroup.remove(obj)
    }
    this.flightMaterials = []

    const visitedPlacesSet = new Set<string>()

    for (const seg of segments) {
      // 1. Destination pin markers
      if (seg.point) {
        const key = `${seg.point.lat.toFixed(2)},${seg.point.lng.toFixed(2)}`
        if (!visitedPlacesSet.has(key)) {
          visitedPlacesSet.add(key)
          this.createPlaceMarker(seg.point, seg.semanticType || 'VISIT')
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
          // 3D Elevated Flight Arc
          const points = createArcPoints(
            seg.startPoint,
            seg.endPoint,
            this.globeRadius,
            true,
            64
          )
          const geometry = new THREE.BufferGeometry().setFromPoints(points)

          // Glowing Dashed Flight Material
          const mat = new THREE.LineDashedMaterial({
            color,
            linewidth: 2,
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
          // Ground Route (curved along surface)
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
              opacity: 0.75,
              linewidth: 2
            })
            const line = new THREE.Line(geometry, mat)
            this.routesGroup.add(line)
          }
        }
      }
    }
  }

  private createPlaceMarker(point: GeoPoint, semanticType: string) {
    const pos = latLngToVector3(point.lat, point.lng, this.globeRadius, 0.4)
    const normal = pos.clone().normalize()

    // 1. Pulsing base ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.3, 24)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.copy(pos)
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

    // 2. Pin stem & bead
    const pinPos = latLngToVector3(point.lat, point.lng, this.globeRadius, 2.5)
    const beadGeo = new THREE.SphereGeometry(0.9, 12, 12)
    const beadMat = new THREE.MeshBasicMaterial({
      color: semanticType === 'HOME' ? 0xff2a6d : 0xffb703
    })
    const bead = new THREE.Mesh(beadGeo, beadMat)
    bead.position.copy(pinPos)

    const markerGroup = new THREE.Group()
    markerGroup.add(ring)
    markerGroup.add(bead)
    this.markersGroup.add(markerGroup)
  }

  /**
   * Updates vehicle position and handles smooth cinematic camera movements
   */
  public updateJourney(state: ActiveJourneyState) {
    if (!state.currentPosition) return

    const pos3D = latLngToVector3(
      state.currentPosition.lat,
      state.currentPosition.lng,
      this.globeRadius,
      state.currentAltitude || 0.4
    )

    // Calculate forward movement direction
    const forwardDeg = state.currentHeading
    const forwardRad = (forwardDeg * Math.PI) / 180
    const normal = pos3D.clone().normalize()

    // Tangent direction vectors on sphere
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

    // Update vehicle mesh
    this.vehicleRenderer.update(
      pos3D,
      forward,
      state.currentSegment?.activityType,
      0
    )

    // Camera Mode Handling
    if (!this.isUserInteracting) {
      if (this.cameraMode === 'follow') {
        // Smooth 3rd Person Follow Cam: behind and slightly above
        const camOffset = forward.clone().multiplyScalar(-24).add(normal.clone().multiplyScalar(14))
        this.targetCameraPos.copy(pos3D).add(camOffset)
        this.targetLookAt.copy(pos3D).add(forward.clone().multiplyScalar(10))
      } else if (this.cameraMode === 'bird') {
        // High altitude Bird's eye
        this.targetCameraPos.copy(pos3D).add(normal.clone().multiplyScalar(75))
        this.targetLookAt.copy(pos3D)
      } else if (this.cameraMode === 'orbit') {
        // Orbiting around globe with smooth altitude
        this.spherical.theta += 0.003
        this.targetCameraPos.setFromSphericalCoords(
          240,
          Math.PI / 2.8,
          this.spherical.theta
        )
        this.targetLookAt.copy(pos3D).multiplyScalar(0.4)
      }
    }
  }

  private setupEventListeners() {
    const el = this.renderer.domElement

    el.addEventListener('pointerdown', (e) => {
      this.isUserInteracting = true
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
      this.spherical.radius = Math.max(120, Math.min(600, this.spherical.radius + zoomFactor))
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

      // 1. Subtle Cloud & Starfield Rotation
      if (this.cloudsMesh) this.cloudsMesh.rotation.y += 0.0003
      if (this.starsParticles) this.starsParticles.rotation.y += 0.00005

      // 2. Animate Flight Dashes
      this.flightDashOffset -= 0.15
      for (const mat of this.flightMaterials) {
        mat.dashSize = 4
        mat.gapSize = 2
      }

      // 3. Smooth Camera Interpolation (Damping)
      if (this.cameraMode !== 'free' && !this.isUserInteracting) {
        this.camera.position.lerp(this.targetCameraPos, 0.06)
        this.currentLookAt.lerp(this.targetLookAt, 0.08)
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
