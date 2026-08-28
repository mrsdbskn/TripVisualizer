import * as THREE from 'three'
import type { ActivityType } from '../../types/timeline'

/**
 * Creates 3D Procedural Mesh models for transport vehicles (Airplane, Car, Train, Ship, Walker)
 */
export class VehicleRenderer {
  private group: THREE.Group
  private planeMesh: THREE.Group
  private carMesh: THREE.Group
  private trainMesh: THREE.Group
  private shipMesh: THREE.Group
  private walkMesh: THREE.Group
  private trailGeometry: THREE.BufferGeometry
  private trailLine: THREE.Line
  private trailPositions: Float32Array
  private trailCount = 40
  private trailIndex = 0

  constructor() {
    this.group = new THREE.Group()

    // 1. Airplane Mesh (Sleek Modern Jet)
    this.planeMesh = this.createAirplane()
    // 2. Car Mesh (Sleek Modern Roadster)
    this.carMesh = this.createCar()
    // 3. Train Mesh (Bullet Train)
    this.trainMesh = this.createTrain()
    // 4. Ship / Ferry Mesh
    this.shipMesh = this.createShip()
    // 5. Walker / Bicycle Mesh (Pulsing Avatar Beacon)
    this.walkMesh = this.createWalker()

    this.group.add(this.planeMesh)
    this.group.add(this.carMesh)
    this.group.add(this.trainMesh)
    this.group.add(this.shipMesh)
    this.group.add(this.walkMesh)

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
      opacity: 0.85,
      linewidth: 2
    })
    this.trailLine = new THREE.Line(this.trailGeometry, trailMaterial)
    this.group.add(this.trailLine)

    this.hideAll()
  }

  public getObject(): THREE.Group {
    return this.group
  }

  private hideAll() {
    this.planeMesh.visible = false
    this.carMesh.visible = false
    this.trainMesh.visible = false
    this.shipMesh.visible = false
    this.walkMesh.visible = false
  }

  private createAirplane(): THREE.Group {
    const group = new THREE.Group()

    // Fuselage
    const bodyGeo = new THREE.ConeGeometry(0.8, 4.0, 16)
    bodyGeo.rotateX(Math.PI / 2)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x112233
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)

    // Wings
    const wingGeo = new THREE.BoxGeometry(5.0, 0.12, 1.2)
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0066aa,
      metalness: 0.6,
      roughness: 0.3
    })
    const wings = new THREE.Mesh(wingGeo, wingMat)
    wings.position.set(0, 0, -0.3)

    // Tail fin
    const tailGeo = new THREE.BoxGeometry(0.1, 1.2, 1.0)
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff0055, emissive: 0xaa0033 })
    const tail = new THREE.Mesh(tailGeo, tailMat)
    tail.position.set(0, 0.6, -1.6)

    // Jet Engine Glow
    const glowGeo = new THREE.SphereGeometry(0.35, 12, 12)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    const glow = new THREE.Mesh(glowGeo, glowMat)
    glow.position.set(0, 0, -2.0)

    group.add(body)
    group.add(wings)
    group.add(tail)
    group.add(glow)
    group.scale.set(0.65, 0.65, 0.65)

    return group
  }

  private createCar(): THREE.Group {
    const group = new THREE.Group()
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.8, 3.2)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      metalness: 0.7,
      roughness: 0.2
    })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.4

    // Roof
    const roofGeo = new THREE.BoxGeometry(1.3, 0.6, 1.8)
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.1,
      metalness: 0.9
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, 0.9, -0.2)

    // Headlights
    const lightGeo = new THREE.SphereGeometry(0.2, 8, 8)
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x00ffff })
    const lightL = new THREE.Mesh(lightGeo, lightMat)
    lightL.position.set(0.6, 0.4, 1.6)
    const lightR = new THREE.Mesh(lightGeo, lightMat)
    lightR.position.set(-0.6, 0.4, 1.6)

    group.add(body)
    group.add(roof)
    group.add(lightL)
    group.add(lightR)
    group.scale.set(0.5, 0.5, 0.5)

    return group
  }

  private createTrain(): THREE.Group {
    const group = new THREE.Group()
    const carGeo = new THREE.BoxGeometry(1.4, 1.2, 5.0)
    const carMat = new THREE.MeshStandardMaterial({
      color: 0x00ff9d,
      emissive: 0x004422,
      metalness: 0.5,
      roughness: 0.3
    })
    const car = new THREE.Mesh(carGeo, carMat)
    car.position.y = 0.6

    // Nose cone
    const noseGeo = new THREE.ConeGeometry(0.8, 1.6, 16)
    noseGeo.rotateX(Math.PI / 2)
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 })
    const nose = new THREE.Mesh(noseGeo, noseMat)
    nose.position.set(0, 0.6, 3.2)

    group.add(car)
    group.add(nose)
    group.scale.set(0.5, 0.5, 0.5)
    return group
  }

  private createShip(): THREE.Group {
    const group = new THREE.Group()
    const hullGeo = new THREE.ConeGeometry(1.2, 4.2, 8)
    hullGeo.rotateX(Math.PI / 2)
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x0099ff, roughness: 0.3 })
    const hull = new THREE.Mesh(hullGeo, hullMat)
    hull.position.y = 0.3

    const deckGeo = new THREE.BoxGeometry(1.0, 0.8, 2.0)
    const deckMat = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const deck = new THREE.Mesh(deckGeo, deckMat)
    deck.position.set(0, 0.8, -0.4)

    group.add(hull)
    group.add(deck)
    group.scale.set(0.5, 0.5, 0.5)
    return group
  }

  private createWalker(): THREE.Group {
    const group = new THREE.Group()

    // Pulsing energetic avatar sphere with concentric ring
    const sphereGeo = new THREE.SphereGeometry(1.0, 16, 16)
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: false
    })
    const sphere = new THREE.Mesh(sphereGeo, sphereMat)

    const ringGeo = new THREE.RingGeometry(1.4, 1.8, 24)
    ringGeo.rotateX(-Math.PI / 2)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xff2a6d,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)

    group.add(sphere)
    group.add(ring)
    group.scale.set(0.4, 0.4, 0.4)
    return group
  }

  /**
   * Updates vehicle position, rotation, and particle contrail
   */
  public update(
    position: THREE.Vector3,
    direction: THREE.Vector3,
    activityType: ActivityType | undefined,
    bankingAngle: number = 0
  ) {
    this.hideAll()

    let activeMesh: THREE.Group = this.planeMesh

    switch (activityType) {
      case 'FLYING':
        this.planeMesh.visible = true
        activeMesh = this.planeMesh
        break
      case 'IN_PASSENGER_VEHICLE':
      case 'IN_VEHICLE':
      case 'MOTORCYCLING':
      case 'IN_TAXI':
        this.carMesh.visible = true
        activeMesh = this.carMesh
        break
      case 'IN_TRAIN':
      case 'IN_TRAM':
      case 'IN_SUBWAY':
        this.trainMesh.visible = true
        activeMesh = this.trainMesh
        break
      case 'IN_FERRY':
      case 'SAILING':
      case 'BOATING':
        this.shipMesh.visible = true
        activeMesh = this.shipMesh
        break
      case 'WALKING':
      case 'RUNNING':
      case 'CYCLING':
      case 'SKIING':
      default:
        this.walkMesh.visible = true
        activeMesh = this.walkMesh
        break
    }

    // Set position
    activeMesh.position.copy(position)

    // Calculate orientation relative to sphere normal & forward direction
    const up = position.clone().normalize()
    const forward = direction.clone().normalize()
    const right = new THREE.Vector3().crossVectors(up, forward).normalize()
    const correctedForward = new THREE.Vector3().crossVectors(right, up).normalize()

    const rotMatrix = new THREE.Matrix4()
    rotMatrix.makeBasis(right, up, correctedForward)
    activeMesh.quaternion.setFromRotationMatrix(rotMatrix)

    // Apply banking roll on turns
    if (activityType === 'FLYING' && Math.abs(bankingAngle) > 0.01) {
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(
        correctedForward,
        bankingAngle
      )
      activeMesh.quaternion.multiply(rollQuat)
    }

    // Update contrail line
    this.trailPositions[this.trailIndex * 3] = position.x
    this.trailPositions[this.trailIndex * 3 + 1] = position.y
    this.trailPositions[this.trailIndex * 3 + 2] = position.z
    this.trailIndex = (this.trailIndex + 1) % this.trailCount
    this.trailGeometry.attributes.position.needsUpdate = true
  }
}
