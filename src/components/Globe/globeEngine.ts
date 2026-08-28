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

  // High-Res Satellite Texture references
  private textureLoader = new THREE.TextureLoader()
  private satelliteDayMap: THREE.Texture | null = null
  private nightLightsMap: THREE.Texture | null = null
  private specularMap: THREE.Texture | null = null
  private bumpMap: THREE.Texture | null = null
  private cloudsMap: THREE.Texture | null = null

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
    this.scene.background = new THREE.Color(0x04060c)

    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 4000)
    this.camera.position.set(0, 50, 260)

    // 2. Renderer
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
    this.vehicleRenderer = new VehicleRenderer()

    this.earthGroup.add(this.routesGroup)
    this.earthGroup.add(this.markersGroup)
    this.earthGroup.add(this.vehicleRenderer.getObject())
    this.scene.add(this.earthGroup)

    // 4. Setup Lighting, Starfield, Atmospheric Glow & Globe
    this.setupLighting()
    this.buildStarfield()
    this.buildEarthSphere()
    this.buildAtmosphere()
    this.buildClouds()
    this.setupEventListeners()

    // 5. Load High-Definition Satellite Textures Asynchronously
    this.loadHighResSatelliteTextures()

    // 6. Start Render Loop
    this.startLoop()
  }

  private setupLighting() {
    // Ambient light simulating cosmic background glow
    const ambient = new THREE.AmbientLight(0xddeeff, 0.45)
    this.scene.add(ambient)

    // Sun directional light (illuminates Day Hemisphere with specular glint on oceans)
    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.2)
    sunLight.position.set(500, 250, 350)
    this.scene.add(sunLight)

    // Atmospheric rim light from deep space
    const spaceRimLight = new THREE.DirectionalLight(0x00d4ff, 0.7)
    spaceRimLight.position.set(-400, -150, -300)
    this.scene.add(spaceRimLight)
  }

  private buildStarfield() {
    const starCount = 2200
    const starGeo = new THREE.BufferGeometry()
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)

    for (let i = 0; i < starCount; i++) {
      const radius = 1200 + Math.random() * 1000
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 2 - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)

      const tint = Math.random()
      if (tint > 0.85) {
        colors[i * 3] = 0.4; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0 // cyan
      } else if (tint > 0.7) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.88; colors[i * 3 + 2] = 0.55 // warm gold
      } else {
        colors[i * 3] = 0.95; colors[i * 3 + 1] = 0.98; colors[i * 3 + 2] = 1.0 // diamond white
      }
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const starMat = new THREE.PointsMaterial({
      size: 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    })

    this.starsParticles = new THREE.Points(starGeo, starMat)
    this.scene.add(this.starsParticles)
  }

  /**
   * High-resolution fallback vector map of continents, oceans, and night lights
   */
  private generateHighDetailEarthTexture(isNight: boolean = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const ctx = canvas.getContext('2d')!

    if (isNight) {
      ctx.fillStyle = '#03050b'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Glowing urban centers
      ctx.fillStyle = '#ffaa33'
      ctx.shadowColor = '#00f0ff'
      ctx.shadowBlur = 5
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * canvas.width
        const y = 180 + Math.random() * (canvas.height - 360)
        const size = 0.5 + Math.random() * 2.2
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.fill()
      }
    } else {
      // Bathymetric Ocean Depth Gradient
      const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height)
      ocean.addColorStop(0, '#0c274c')
      ocean.addColorStop(0.5, '#051b38')
      ocean.addColorStop(1, '#082244')
      ctx.fillStyle = ocean
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Continents with topographical color layers (Eurasia, Americas, Africa, Australia)
      ctx.fillStyle = '#264a28' // Vegetated land
      ctx.strokeStyle = '#38693b'
      ctx.lineWidth = 3

      // Europe & Asia
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.64, canvas.height * 0.34, 380, 190, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Sahara / Desert Topography
      ctx.fillStyle = '#8c764b'
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.52, canvas.height * 0.44, 160, 80, 0, 0, Math.PI * 2)
      ctx.fill()

      // Central/South Africa
      ctx.fillStyle = '#224624'
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.53, canvas.height * 0.62, 130, 150, 0.1, 0, Math.PI * 2)
      ctx.fill()

      // North America
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.25, canvas.height * 0.36, 190, 160, -0.15, 0, Math.PI * 2)
      ctx.fill()

      // South America
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.32, canvas.height * 0.68, 120, 190, 0.25, 0, Math.PI * 2)
      ctx.fill()

      // Australia
      ctx.fillStyle = '#7a5a3a'
      ctx.beginPath()
      ctx.ellipse(canvas.width * 0.82, canvas.height * 0.72, 90, 70, 0, 0, Math.PI * 2)
      ctx.fill()

      // Polar Ice Caps
      ctx.fillStyle = '#eaf5ff'
      ctx.fillRect(0, 0, canvas.width, 50)
      ctx.fillRect(0, canvas.height - 50, canvas.width, 50)
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.ClampToEdgeWrapping
    return tex
  }

  private buildEarthSphere() {
    const geo = new THREE.SphereGeometry(this.globeRadius, 64, 64)
    const initialTexture = this.generateHighDetailEarthTexture(false)

    this.earthMaterial = new THREE.MeshStandardMaterial({
      map: initialTexture,
      roughness: 0.55,
      metalness: 0.25
    })

    this.earthMesh = new THREE.Mesh(geo, this.earthMaterial)
    this.earthGroup.add(this.earthMesh)
  }

  private loadHighResSatelliteTextures() {
    // High-resolution NASA Blue Marble Day Map & Night Lights from public CDN with robust fallbacks
    const dayUrl = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'
    const nightUrl = 'https://unpkg.com/three-globe/example/img/earth-night.jpg'
    const bumpUrl = 'https://unpkg.com/three-globe/example/img/earth-topology.png'
    const cloudsUrl = 'https://unpkg.com/three-globe/example/img/earth-clouds.png'

    this.textureLoader.load(
      dayUrl,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping
        this.satelliteDayMap = tex
        if (this.currentTheme === 'satellite') {
          this.earthMaterial.map = tex
          this.earthMaterial.needsUpdate = true
        }
      },
      undefined,
      () => {
        // Fallback already in place
      }
    )

    this.textureLoader.load(
      bumpUrl,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping
        this.bumpMap = tex
        this.earthMaterial.bumpMap = tex
        this.earthMaterial.bumpScale = 1.2
        this.earthMaterial.needsUpdate = true
      }
    )

    this.textureLoader.load(
      nightUrl,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping
        this.nightLightsMap = tex
      }
    )

    this.textureLoader.load(
      cloudsUrl,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping
        this.cloudsMap = tex
        if (this.cloudsMesh && this.cloudsMesh.material) {
          const mat = this.cloudsMesh.material as THREE.MeshStandardMaterial
          mat.map = tex
          mat.needsUpdate = true
        }
      }
    )
  }

  private buildClouds() {
    const cloudGeo = new THREE.SphereGeometry(this.globeRadius + 1.4, 64, 64)
    const cloudMat = new THREE.MeshStandardMaterial({
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    })

    this.cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat)
    this.earthGroup.add(this.cloudsMesh)
  }

  private buildAtmosphere() {
    const geo = new THREE.SphereGeometry(this.globeRadius * 1.16, 64, 64)

    // Photorealistic Rayleigh atmospheric Fresnel scattering shader
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
      this.earthMaterial.map = null
      this.earthMaterial.color.set(0x060b18)
      this.earthMaterial.roughness = 0.2
      this.earthMaterial.metalness = 0.8
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x020308)
    } else if (theme === 'night') {
      this.earthMaterial.map = this.nightLightsMap || this.generateHighDetailEarthTexture(true)
      this.earthMaterial.color.set(0xffffff)
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x03050c)
    } else if (theme === 'atlas') {
      this.earthMaterial.map = null
      this.earthMaterial.color.set(0x161c28)
      this.earthMaterial.roughness = 0.95
      this.earthMaterial.metalness = 0.0
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x080b12)
    } else {
      // Photoreal NASA Satellite
      this.earthMaterial.map = this.satelliteDayMap || this.generateHighDetailEarthTexture(false)
      this.earthMaterial.color.set(0xffffff)
      this.earthMaterial.roughness = 0.55
      this.earthMaterial.metalness = 0.25
      this.earthMaterial.needsUpdate = true
      this.scene.background = new THREE.Color(0x04060c)
    }
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode
    this.isFocusing = false
  }

  /**
   * Smoothly animates the camera to swoop down and focus on specific city coordinates
   */
  public focusOnCoordinates(lat: number, lng: number, distance: number = 150) {
    const targetPos = latLngToVector3(lat, lng, this.globeRadius, 0)
    const normal = targetPos.clone().normalize()
    this.targetCameraPos.copy(targetPos).add(normal.clone().multiplyScalar(distance - this.globeRadius))
    this.targetLookAt.copy(targetPos)
    this.isFocusing = true
  }

  /**
   * Rebuilds routes and destination pins for active timeline segments
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
    this.flightMaterials = []

    const visitedPlacesSet = new Set<string>()

    for (const seg of segments) {
      // 1. Destination pin markers
      if (seg.point) {
        const key = `${seg.point.lat.toFixed(2)},${seg.point.lng.toFixed(2)}`
        if (!visitedPlacesSet.has(key)) {
          visitedPlacesSet.add(key)
          const isSelected = selectedCityName ? seg.city === selectedCityName : false
          this.createPlaceMarker(seg.point, seg.semanticType || 'VISIT', seg.city || 'City', isSelected)
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
          // Ground Route
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
              opacity: 0.8,
              linewidth: 2
            })
            const line = new THREE.Line(geometry, mat)
            this.routesGroup.add(line)
          }
        }
      }
    }
  }

  private createPlaceMarker(point: GeoPoint, semanticType: string, cityName: string, isSelected: boolean = false) {
    const pos = latLngToVector3(point.lat, point.lng, this.globeRadius, 0.4)
    const normal = pos.clone().normalize()

    // 1. Pulsing base ring
    const ringGeo = new THREE.RingGeometry(0.9, isSelected ? 2.4 : 1.4, 24)
    const ringMat = new THREE.MeshBasicMaterial({
      color: isSelected ? 0xff2a6d : 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.copy(pos)
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

    // 2. Pin stem & bead
    const pinPos = latLngToVector3(point.lat, point.lng, this.globeRadius, isSelected ? 4.0 : 2.5)
    const beadGeo = new THREE.SphereGeometry(isSelected ? 1.4 : 0.9, 14, 14)
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
   * Updates vehicle position and handles smooth cinematic space camera
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

    this.vehicleRenderer.update(
      pos3D,
      forward,
      state.currentSegment?.activityType,
      0
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
        // Space Orbit: smooth slow planetary rotation with authentic inclination
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
