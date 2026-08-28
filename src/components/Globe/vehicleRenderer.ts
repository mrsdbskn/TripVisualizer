import * as THREE from 'three'
import type { ActivityType } from '../../types/timeline'

const EMOJI_MAP: Record<string, string> = {
  FLYING: '✈️',
  IN_PASSENGER_VEHICLE: '🚗',
  IN_VEHICLE: '🚗',
  IN_TAXI: '🚕',
  MOTORCYCLING: '🏍️',
  IN_TRAIN: '🚆',
  IN_TRAM: '🚊',
  IN_SUBWAY: '🚇',
  IN_BUS: '🚌',
  WALKING: '🚶',
  RUNNING: '🏃',
  CYCLING: '🚴',
  IN_FERRY: '⛴️',
  SAILING: '⛵',
  BOATING: '🚤',
  SKIING: '⛷️',
  UNKNOWN: '📍'
}

/**
 * Creates high-visibility Google Emoji Billboard Sprite with glowing badge & particle contrail
 */
export class VehicleRenderer {
  private group: THREE.Group
  private spriteGroup: THREE.Group
  private activeSprite: THREE.Sprite | null = null
  private spriteCache: Map<string, THREE.Sprite> = new Map()
  private pulseRingMesh: THREE.Mesh
  private trailGeometry: THREE.BufferGeometry
  private trailLine: THREE.Line
  private trailPositions: Float32Array
  private trailCount = 50
  private trailIndex = 0

  constructor() {
    this.group = new THREE.Group()
    this.spriteGroup = new THREE.Group()
    this.group.add(this.spriteGroup)

    // Glowing Pulse Ring beneath vehicle
    const ringGeo = new THREE.RingGeometry(1.6, 2.4, 32)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    })
    this.pulseRingMesh = new THREE.Mesh(ringGeo, ringMat)
    this.group.add(this.pulseRingMesh)

    // Contrail / Light Ribbon Trail
    this.trailPositions = new Float32Array(this.trailCount * 3)
    this.trailGeometry = new THREE.BufferGeometry()
    this.trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3)
    )

    const trailMaterial = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.9,
      linewidth: 3
    })
    this.trailLine = new THREE.Line(this.trailGeometry, trailMaterial)
    this.group.add(this.trailLine)

    // Pre-cache primary emojis
    this.getOrCreateSprite('FLYING')
    this.getOrCreateSprite('IN_PASSENGER_VEHICLE')
    this.getOrCreateSprite('IN_TRAIN')
    this.getOrCreateSprite('WALKING')
  }

  public getObject(): THREE.Group {
    return this.group
  }

  /**
   * Generates an Ultra-Crisp HD Google Emoji Canvas Texture (512x512)
   */
  private createEmojiTexture(emoji: string, bgColor: string = 'rgba(13, 17, 28, 0.85)', glowColor: string = '#00f0ff'): THREE.CanvasTexture {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 512
    const ctx = canvas.getContext('2d')!

    // Circular glowing badge container
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 24
    ctx.fillStyle = bgColor
    ctx.beginPath()
    ctx.arc(256, 256, 200, 0, Math.PI * 2)
    ctx.fill()

    // Vibrant border ring
    ctx.lineWidth = 14
    ctx.strokeStyle = glowColor
    ctx.stroke()

    // Draw Google / System Emoji
    ctx.shadowBlur = 0
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '240px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
    ctx.fillText(emoji, 256, 268)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }

  private getOrCreateSprite(activityType: string): THREE.Sprite {
    if (this.spriteCache.has(activityType)) {
      return this.spriteCache.get(activityType)!
    }

    const emoji = EMOJI_MAP[activityType] || '📍'
    let glow = '#00f0ff'
    if (activityType === 'FLYING') glow = '#00f0ff'
    else if (activityType === 'IN_PASSENGER_VEHICLE' || activityType === 'IN_VEHICLE') glow = '#ff9900'
    else if (activityType === 'IN_TRAIN' || activityType === 'IN_TRAM' || activityType === 'IN_SUBWAY') glow = '#00ff9d'
    else if (activityType === 'WALKING' || activityType === 'RUNNING') glow = '#ff2a6d'

    const tex = this.createEmojiTexture(emoji, 'rgba(10, 14, 26, 0.9)', glow)
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.set(10, 10, 1)

    this.spriteCache.set(activityType, sprite)
    this.spriteGroup.add(sprite)
    return sprite
  }

  /**
   * Updates vehicle position, Google emoji sprite, and contrail
   */
  public update(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    activityType: ActivityType | undefined,
    cameraDistance: number = 260
  ) {
    const key = activityType || 'UNKNOWN'
    const sprite = this.getOrCreateSprite(key)

    // Hide all sprites except current
    for (const [_, s] of this.spriteCache) {
      s.visible = false
    }
    sprite.visible = true
    this.activeSprite = sprite

    // Dynamic LOD scale based on camera distance (ensures it's always readable)
    const dynamicScale = Math.max(7, Math.min(22, (cameraDistance / 260) * 11))
    sprite.scale.set(dynamicScale, dynamicScale, 1)

    // Position sprite slightly above sphere normal
    const normal = position.clone().normalize()
    const elevatedPos = position.clone().add(normal.clone().multiplyScalar(1.5))
    sprite.position.copy(elevatedPos)

    // Position Pulse Ring
    this.pulseRingMesh.position.copy(position)
    this.pulseRingMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    const ringScale = (dynamicScale / 11) * 1.2
    this.pulseRingMesh.scale.set(ringScale, ringScale, ringScale)

    // Update Contrail ribbon
    this.trailPositions[this.trailIndex * 3] = position.x
    this.trailPositions[this.trailIndex * 3 + 1] = position.y
    this.trailPositions[this.trailIndex * 3 + 2] = position.z
    this.trailIndex = (this.trailIndex + 1) % this.trailCount
    this.trailGeometry.attributes.position.needsUpdate = true
  }
}
