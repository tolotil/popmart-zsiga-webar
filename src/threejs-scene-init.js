import * as THREE from 'three'
import {PRIZE_CARDS, createPrizeCardTexture, preloadPrizeCharacter} from './card-data'

const BOX_WIDTH = 0.56
const BOX_HEIGHT = 0.72
const BOX_DEPTH = 0.42
const PANEL_THICKNESS = 0.012
const FLAP_THICKNESS = 0.007
const BOX_DROP_START_SCALE = 0.5
const BOX_PLACED_SCALE = 0.78
const CARD_WIDTH = 0.34
const CARD_HEIGHT = 0.535
const DISPLAY_CARD_WIDTH = 0.46
const DISPLAY_CARD_HEIGHT = 0.724
const CARD_PRESENT_LIFT_DURATION = 1450
const CARD_PRESENT_MIN_DEPTH = -2.2
const CARD_PRESENT_MAX_DEPTH = -0.95
const CAMERA_HEIGHT_METERS = 1.45
const MAX_CENTER_HIT_DISTANCE = 2.8
const BOX_TEXTURE_BASE_PATH = 'assets/box-textures'
const HAND_TEXTURE_PATH = 'assets/ui/tear-hand.png'

const BOX_TEXTURES = {
  front: `${BOX_TEXTURE_BASE_PATH}/front.jpg`,
  back: `${BOX_TEXTURE_BASE_PATH}/back.jpg`,
  left: `${BOX_TEXTURE_BASE_PATH}/left.jpg`,
  right: `${BOX_TEXTURE_BASE_PATH}/right.jpg`,
  top: `${BOX_TEXTURE_BASE_PATH}/top.jpg`,
  bottom: `${BOX_TEXTURE_BASE_PATH}/bottom.jpg`,
}

const clamp01 = value => Math.min(Math.max(value, 0), 1)
const easeOutCubic = t => 1 - Math.pow(1 - t, 3)
const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a, b, t) => a + (b - a) * t

const distanceToSegment = (point, start, end) => {
  const vx = end.x - start.x
  const vy = end.y - start.y
  const wx = point.x - start.x
  const wy = point.y - start.y
  const lengthSquared = vx * vx + vy * vy

  if (!lengthSquared) {
    return Math.hypot(point.x - start.x, point.y - start.y)
  }

  const t = clamp01((wx * vx + wy * vy) / lengthSquared)
  const px = start.x + t * vx
  const py = start.y + t * vy
  return Math.hypot(point.x - px, point.y - py)
}

const createTexture = (path) => {
  const texture = new THREE.TextureLoader().load(path)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

const createBoxMaterial = (path) => new THREE.MeshBasicMaterial({
  color: 0xffffff,
  map: createTexture(path),
  toneMapped: false,
})

const createTopHalfMaterial = (isFrontHalf) => {
  const texture = createTexture(BOX_TEXTURES.top)
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.repeat.set(1, 0.5)
  texture.offset.set(0, isFrontHalf ? 0 : 0.5)
  texture.needsUpdate = true

  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texture,
    toneMapped: false,
  })
}

let roundedCardAlphaTexture = null

const createRoundedRectPath = (ctx, x, y, width, height, radius) => {
  const right = x + width
  const bottom = y + height

  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(right - radius, y)
  ctx.quadraticCurveTo(right, y, right, y + radius)
  ctx.lineTo(right, bottom - radius)
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom)
  ctx.lineTo(x + radius, bottom)
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

const getRoundedCardAlphaTexture = () => {
  if (roundedCardAlphaTexture) {
    return roundedCardAlphaTexture
  }

  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 404
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#ffffff'
  createRoundedRectPath(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 24)
  ctx.fill()

  roundedCardAlphaTexture = new THREE.CanvasTexture(canvas)
  roundedCardAlphaTexture.minFilter = THREE.LinearFilter
  roundedCardAlphaTexture.magFilter = THREE.LinearFilter
  roundedCardAlphaTexture.needsUpdate = true
  return roundedCardAlphaTexture
}

const createCardMaterial = () => new THREE.MeshBasicMaterial({
  color: 0xffffff,
  alphaMap: getRoundedCardAlphaTexture(),
  transparent: true,
  alphaTest: 0.04,
  side: THREE.DoubleSide,
  depthWrite: true,
  toneMapped: false,
})

const createTearHand = () => {
  const texture = createTexture(HAND_TEXTURE_PATH)
  const hand = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.333),
    new THREE.MeshBasicMaterial({
      color: 0x111111,
      map: texture,
      transparent: true,
      alphaTest: 0.02,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  )
  hand.rotation.x = -Math.PI / 2
  return hand
}

const createDashedTearLine = (length) => {
  const dashCount = 15
  const dashLength = length / (dashCount * 1.72)
  const gap = (length - dashCount * dashLength) / (dashCount - 1)
  const points = []
  let x = -length / 2

  for (let i = 0; i < dashCount; i++) {
    points.push(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x + dashLength, 0, 0))
    x += dashLength + gap
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.78,
    })
  )
  return line
}

const createTearControls = () => {
  const group = new THREE.Group()
  const stripLength = BOX_WIDTH * 0.86

  const dashedLine = createDashedTearLine(stripLength)
  dashedLine.position.y = 0.003
  group.add(dashedLine)

  const fill = new THREE.Object3D()
  fill.position.x = -stripLength / 2
  group.add(fill)

  const hand = createTearHand()
  const handleOffset = 0.07
  hand.position.set(-stripLength / 2 + handleOffset, 0.032, -0.07)
  group.add(hand)

  const startPoint = new THREE.Object3D()
  const endPoint = new THREE.Object3D()
  startPoint.position.set(-stripLength / 2, 0.032, 0)
  endPoint.position.set(stripLength / 2, 0.032, 0)
  group.add(startPoint, endPoint)

  const peel = new THREE.Object3D()
  peel.position.set(0, 0.032, 0)
  group.add(peel)

  return {
    group,
    fill,
    handle: hand,
    handleOffset,
    peel,
    dashedLine,
    startPoint,
    endPoint,
    length: stripLength,
  }
}

const createDefaultBlindBox = () => {
  const group = new THREE.Group()
  const edgeMaterial = new THREE.LineBasicMaterial({color: 0x8a8178})
  const paperEdgeMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false})
  const paperInsideMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false})
  const whiteInsideMaterial = new THREE.MeshBasicMaterial({color: 0xffffff, toneMapped: false})

  const addPanel = (geometry, material, position, parent = group) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.castShadow = true
    mesh.receiveShadow = true
    parent.add(mesh)

    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial)
    edges.position.copy(position)
    parent.add(edges)

    return mesh
  }

  addPanel(
    new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, PANEL_THICKNESS),
    [
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      createBoxMaterial(BOX_TEXTURES.front),
      whiteInsideMaterial,
    ],
    new THREE.Vector3(0, BOX_HEIGHT / 2, BOX_DEPTH / 2)
  )
  addPanel(
    new THREE.BoxGeometry(BOX_WIDTH, BOX_HEIGHT, PANEL_THICKNESS),
    [
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      whiteInsideMaterial,
      createBoxMaterial(BOX_TEXTURES.back),
    ],
    new THREE.Vector3(0, BOX_HEIGHT / 2, -BOX_DEPTH / 2)
  )
  addPanel(
    new THREE.BoxGeometry(PANEL_THICKNESS, BOX_HEIGHT, BOX_DEPTH),
    [
      whiteInsideMaterial,
      createBoxMaterial(BOX_TEXTURES.left),
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
    ],
    new THREE.Vector3(-BOX_WIDTH / 2, BOX_HEIGHT / 2, 0)
  )
  addPanel(
    new THREE.BoxGeometry(PANEL_THICKNESS, BOX_HEIGHT, BOX_DEPTH),
    [
      createBoxMaterial(BOX_TEXTURES.right),
      whiteInsideMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
      paperEdgeMaterial,
    ],
    new THREE.Vector3(BOX_WIDTH / 2, BOX_HEIGHT / 2, 0)
  )
  addPanel(
    new THREE.BoxGeometry(BOX_WIDTH, PANEL_THICKNESS, BOX_DEPTH),
    [
      paperEdgeMaterial,
      paperEdgeMaterial,
      whiteInsideMaterial,
      createBoxMaterial(BOX_TEXTURES.bottom),
      paperEdgeMaterial,
      paperEdgeMaterial,
    ],
    new THREE.Vector3(0, PANEL_THICKNESS / 2, 0)
  )

  const createFlap = (isFrontHalf) => {
    const direction = isFrontHalf ? 1 : -1
    const pivot = new THREE.Group()
    pivot.position.set(0, BOX_HEIGHT + FLAP_THICKNESS / 2, direction * BOX_DEPTH / 2)
    group.add(pivot)

    const flap = new THREE.Mesh(
      new THREE.BoxGeometry(BOX_WIDTH * 1.02, FLAP_THICKNESS, BOX_DEPTH / 2),
      [
        paperEdgeMaterial,
        paperEdgeMaterial,
        createTopHalfMaterial(isFrontHalf),
        paperInsideMaterial,
        paperEdgeMaterial,
        paperEdgeMaterial,
      ]
    )
    flap.position.z = -direction * BOX_DEPTH / 4
    flap.castShadow = true
    flap.receiveShadow = true
    pivot.add(flap)

    const flapEdges = new THREE.LineSegments(new THREE.EdgesGeometry(flap.geometry), edgeMaterial)
    flapEdges.position.copy(flap.position)
    pivot.add(flapEdges)

    return pivot
  }

  const frontFlapPivot = createFlap(true)
  const backFlapPivot = createFlap(false)

  const seam = new THREE.Object3D()

  const tearControls = createTearControls()
  tearControls.group.position.set(0, BOX_HEIGHT + FLAP_THICKNESS + 0.032, 0)
  group.add(tearControls.group)

  const innerGlow = new THREE.Object3D()

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 48),
    new THREE.MeshBasicMaterial({
      color: 0x111111,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
    })
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.006
  shadow.scale.set(1.1, 0.72, 1)
  group.add(shadow)

  return {
    group,
    topFlaps: {
      front: frontFlapPivot,
      back: backFlapPivot,
      seam,
      innerGlow,
    },
    tearControls,
  }
}

const createSparkles = () => {
  const group = new THREE.Group()
  const material = new THREE.MeshBasicMaterial({
    color: 0xffe26a,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
  })

  for (let i = 0; i < 14; i++) {
    const sparkle = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.025), material.clone())
    const angle = (i / 14) * Math.PI * 2
    const radius = 0.32 + (i % 3) * 0.055
    sparkle.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.01)
    sparkle.rotation.z = angle + Math.PI / 4
    sparkle.userData.phase = i * 0.53
    group.add(sparkle)
  }

  return group
}

export const initScenePipelineModule = () => {
  let canvas
  let scene
  let camera
  let renderer
  let boxGroup
  let topFlaps
  let tearControls
  let cardGroup
  let cardMesh
  let cardHitMesh
  let displayGroup
  let displayCardMesh
  let sparkles
  let selectedCard = null
  const prizeTextureCache = new Map()

  const raycaster = new THREE.Raycaster()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const centerPoint = new THREE.Vector3()
  const forwardPoint = new THREE.Vector3()
  const cameraDirection = new THREE.Vector3()
  const worldPosition = new THREE.Vector3()
  const ndc = new THREE.Vector2()

  const state = {
    phase: 'idle',
    tearProgress: 0,
    dropStartedAt: 0,
    openStartedAt: 0,
    cardStartedAt: 0,
    presentationStartedAt: 0,
    draggingTear: false,
    cardLaunched: false,
    dropStart: new THREE.Vector3(),
    dropEnd: new THREE.Vector3(),
    cardStart: new THREE.Vector3(),
    cardPeak: new THREE.Vector3(),
    cardEnd: new THREE.Vector3(),
    presentationStart: new THREE.Vector3(),
  }

  const getHint = () => document.getElementById('ar-hint')
  const getGrabButton = () => document.getElementById('grab-button')
  const getResetButton = () => document.getElementById('reset-button')
  const getPhotoButton = () => document.getElementById('photo-button')

  const setHint = (text) => {
    const hint = getHint()

    if (hint) {
      hint.textContent = text
    }
  }

  const setButtonVisible = (button, visible) => {
    if (button) {
      button.classList.toggle('is-hidden', !visible)
    }
  }

  const getPrizeTexture = (card) => {
    if (!prizeTextureCache.has(card.id)) {
      prizeTextureCache.set(card.id, createPrizeCardTexture(THREE, card))
    }

    return prizeTextureCache.get(card.id)
  }

  const preloadPrizeTextures = () => {
    PRIZE_CARDS.forEach(card => getPrizeTexture(card))
  }

  const setBoxOpenProgress = (value) => {
    if (!topFlaps) {
      return
    }

    const progress = clamp01(value)
    topFlaps.front.rotation.set(progress * 1.35, 0, 0)
    topFlaps.back.rotation.set(-progress * 1.35, 0, 0)
    topFlaps.seam.visible = progress < 0.18
  }

  const updateTearProgress = (value) => {
    state.tearProgress = clamp01(value)
    const length = tearControls.length
    const startX = -length / 2
    const travel = length * state.tearProgress

    tearControls.fill.scale.x = Math.max(travel, 0.001)
    tearControls.fill.position.x = startX
    tearControls.handle.position.x = startX + travel + tearControls.handleOffset
  }

  const createCardObjects = () => {
    cardGroup = new THREE.Group()
    cardGroup.visible = false

    cardHitMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_WIDTH * 1.24, CARD_HEIGHT * 1.24),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.01,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    cardGroup.add(cardHitMesh)

    cardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
      createCardMaterial()
    )
    cardMesh.position.z = 0.002
    cardMesh.castShadow = true
    cardGroup.add(cardMesh)
    scene.add(cardGroup)

    displayGroup = new THREE.Group()
    displayGroup.position.set(0, 0, -1.08)
    displayGroup.visible = false

    displayCardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(DISPLAY_CARD_WIDTH, DISPLAY_CARD_HEIGHT),
      createCardMaterial()
    )
    displayGroup.add(displayCardMesh)

    sparkles = createSparkles()
    sparkles.position.z = 0.02
    displayGroup.add(sparkles)
    camera.add(displayGroup)
  }

  const pickRandomCard = () => PRIZE_CARDS[Math.floor(Math.random() * PRIZE_CARDS.length)]

  const assignCardTexture = (card) => {
    const texture = getPrizeTexture(card)
    cardMesh.material.map = texture
    cardMesh.material.needsUpdate = true

    displayCardMesh.material.map = texture
    displayCardMesh.material.needsUpdate = true
  }

  const prepareSelectedCard = () => {
    if (!selectedCard) {
      selectedCard = pickRandomCard()
    }

    assignCardTexture(selectedCard)
    preloadPrizeCharacter(selectedCard).catch(() => {})
    return selectedCard
  }

  const getCenterPlacementPoint = () => {
    camera.updateMatrixWorld()
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

    const hit = raycaster.ray.intersectPlane(groundPlane, centerPoint)

    if (hit) {
      const distance = camera.position.distanceTo(centerPoint)

      if (distance > 0.25 && distance < MAX_CENTER_HIT_DISTANCE) {
        return centerPoint.clone()
      }
    }

    camera.getWorldDirection(cameraDirection)
    forwardPoint.copy(camera.position).add(cameraDirection.multiplyScalar(1.35))
    forwardPoint.y = 0
    return forwardPoint.clone()
  }

  const getDropStartPoint = (targetPoint) => {
    const distance = camera.position.distanceTo(targetPoint)
    const start = new THREE.Vector3(0, 1.22, 0.5).unproject(camera)
    start.sub(camera.position).normalize().multiplyScalar(distance)
    start.add(camera.position)
    start.y = Math.max(start.y, targetPoint.y + 1.05)
    return start
  }

  const faceBoxToCamera = (targetPoint) => {
    const dx = camera.position.x - targetPoint.x
    const dz = camera.position.z - targetPoint.z

    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      boxGroup.rotation.set(0, Math.atan2(dx, dz), 0)
    }
  }

  const projectObjectToScreen = (object) => {
    const rect = renderer.domElement.getBoundingClientRect()
    camera.updateMatrixWorld()
    object.getWorldPosition(worldPosition)
    const projected = worldPosition.project(camera)

    return {
      x: rect.left + (projected.x + 1) * rect.width / 2,
      y: rect.top + (-projected.y + 1) * rect.height / 2,
    }
  }

  const screenPointToCameraLocal = (point, z = -1.44) => {
    const rect = renderer.domElement.getBoundingClientRect()
    const ndcX = ((point.x - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((point.y - rect.top) / rect.height) * 2 - 1)
    const distance = Math.abs(z)

    if (camera.isPerspectiveCamera) {
      const verticalFov = THREE.MathUtils.degToRad(camera.fov)
      const visibleHeight = 2 * Math.tan(verticalFov / 2) * distance
      const visibleWidth = visibleHeight * camera.aspect
      return new THREE.Vector3(
        ndcX * visibleWidth / 2,
        ndcY * visibleHeight / 2,
        z
      )
    }

    return new THREE.Vector3(ndcX * 0.6, ndcY * 0.9, z)
  }

  const objectToCameraPresentationStart = (object) => {
    camera.updateMatrixWorld()
    object.updateMatrixWorld()
    object.getWorldPosition(worldPosition)
    const localPosition = camera.worldToLocal(worldPosition.clone())

    if (localPosition.z < -0.001) {
      const targetZ = THREE.MathUtils.clamp(
        localPosition.z,
        CARD_PRESENT_MIN_DEPTH,
        CARD_PRESENT_MAX_DEPTH
      )
      return localPosition.multiplyScalar(targetZ / localPosition.z)
    }

    return screenPointToCameraLocal(projectObjectToScreen(object), -1.44)
  }

  const getTearScreenLine = () => ({
    start: projectObjectToScreen(tearControls.startPoint),
    end: projectObjectToScreen(tearControls.endPoint),
  })

  const progressFromPointer = (clientX, clientY) => {
    const {start, end} = getTearScreenLine()
    const vx = end.x - start.x
    const vy = end.y - start.y
    const lengthSquared = vx * vx + vy * vy

    if (!lengthSquared) {
      return state.tearProgress
    }

    return clamp01(((clientX - start.x) * vx + (clientY - start.y) * vy) / lengthSquared)
  }

  const isPointerNearTearControl = (clientX, clientY) => {
    const {start, end} = getTearScreenLine()
    const pointer = {x: clientX, y: clientY}
    const handle = projectObjectToScreen(tearControls.handle)
    const handleDistance = Math.hypot(pointer.x - handle.x, pointer.y - handle.y)
    const trackDistance = distanceToSegment(pointer, start, end)

    return handleDistance < 96 || trackDistance < 72
  }

  const setPointerNdc = (event) => {
    const rect = renderer.domElement.getBoundingClientRect()
    ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
  }

  const launchCard = () => {
    if (state.cardLaunched) {
      return
    }

    state.cardLaunched = true
    prepareSelectedCard()

    boxGroup.updateMatrixWorld()
    state.cardStart.copy(new THREE.Vector3(0, BOX_HEIGHT + 0.08, 0).applyMatrix4(boxGroup.matrixWorld))
    state.cardPeak.copy(new THREE.Vector3(BOX_WIDTH * 0.42, BOX_HEIGHT + 0.66, 0.04).applyMatrix4(boxGroup.matrixWorld))
    state.cardEnd.copy(new THREE.Vector3(BOX_WIDTH / 2 + 0.44, 0.028, 0.02).applyMatrix4(boxGroup.matrixWorld))

    cardGroup.position.copy(state.cardStart)
    cardGroup.rotation.set(0, boxGroup.rotation.y, 0)
    cardGroup.scale.setScalar(0.18 * BOX_PLACED_SCALE)
    cardGroup.visible = true
    state.cardStartedAt = performance.now()
    setHint(`抽中：${selectedCard.name}，小卡正在飞出`)
  }

  const openBox = () => {
    if (state.phase !== 'tear-ready') {
      return
    }

    state.phase = 'opening'
    state.draggingTear = false
    state.openStartedAt = performance.now()
    prepareSelectedCard()
    setHint('盲盒打开中')
  }

  const presentCard = () => {
    cardMesh.updateMatrixWorld()
    state.presentationStart.copy(objectToCameraPresentationStart(cardMesh))
    state.phase = 'card-lifting'
    state.presentationStartedAt = performance.now()
    cardGroup.visible = false
    displayGroup.visible = true
    displayGroup.position.copy(state.presentationStart)
    displayGroup.rotation.set(0.36, -0.22, -0.08)
    displayCardMesh.rotation.set(-0.2, -0.32, -0.12)
    displayCardMesh.scale.setScalar(0.46)
    setButtonVisible(getPhotoButton(), false)
    setHint('小卡正在捡起')
  }

  const placeBoxAtCenter = () => {
    if (state.phase !== 'idle') {
      return
    }

    const targetPoint = getCenterPlacementPoint()
    faceBoxToCamera(targetPoint)

    state.dropEnd.copy(targetPoint)
    state.dropStart.copy(getDropStartPoint(targetPoint))
    state.dropStartedAt = performance.now()
    state.phase = 'dropping'
    state.cardLaunched = false
    selectedCard = null

    boxGroup.position.copy(state.dropStart)
    boxGroup.scale.setScalar(BOX_DROP_START_SCALE)
    boxGroup.visible = true
    setBoxOpenProgress(0)
    tearControls.group.visible = true
    tearControls.peel.rotation.set(0, 0, 0)
    tearControls.peel.position.set(0, 0.04, -0.07)
    displayGroup.visible = false
    cardGroup.visible = false
    updateTearProgress(0)

    setButtonVisible(getGrabButton(), false)
    setButtonVisible(getResetButton(), true)
    setButtonVisible(getPhotoButton(), false)
    setHint('盲盒正在落到当前实景桌面')
  }

  const resetExperience = () => {
    state.phase = 'idle'
    state.draggingTear = false
    state.cardLaunched = false
    state.tearProgress = 0
    selectedCard = null

    if (boxGroup) {
      boxGroup.visible = false
      boxGroup.scale.setScalar(BOX_PLACED_SCALE)
    }

    if (cardGroup) {
      cardGroup.visible = false
    }

    if (displayGroup) {
      displayGroup.visible = false
    }

    setBoxOpenProgress(0)

    if (tearControls) {
      tearControls.group.visible = true
      tearControls.peel.rotation.set(0, 0, 0)
      tearControls.peel.position.set(0, 0.04, -0.07)
      updateTearProgress(0)
    }

    setButtonVisible(getGrabButton(), true)
    setButtonVisible(getResetButton(), false)
    setButtonVisible(getPhotoButton(), false)
    setHint('对准桌面中心，点击获取盲盒')
  }

  const onPointerDown = (event) => {
    if (state.phase === 'tear-ready') {
      if (!isPointerNearTearControl(event.clientX, event.clientY)) {
        return
      }

      event.preventDefault()
      state.draggingTear = true
      updateTearProgress(progressFromPointer(event.clientX, event.clientY))
      return
    }

    if (state.phase === 'card-landed') {
      setPointerNdc(event)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects([cardMesh, cardHitMesh], true)

      if (hits.length) {
        event.preventDefault()
        presentCard()
      }
    }
  }

  const onPointerMove = (event) => {
    if (!state.draggingTear) {
      return
    }

    event.preventDefault()
    const progress = progressFromPointer(event.clientX, event.clientY)
    updateTearProgress(progress)

    if (progress > 0.96) {
      openBox()
    }
  }

  const onPointerUp = (event) => {
    if (!state.draggingTear) {
      return
    }

    event.preventDefault()
    state.draggingTear = false

    if (state.tearProgress > 0.9) {
      openBox()
    } else {
      updateTearProgress(0)
      setHint('从左向右拉满撕拉条')
    }
  }

  const updateDrop = (now) => {
    const t = clamp01((now - state.dropStartedAt) / 760)
    const eased = easeOutCubic(t)
    boxGroup.position.lerpVectors(state.dropStart, state.dropEnd, eased)
    boxGroup.position.y += Math.sin(t * Math.PI) * 0.05
    boxGroup.scale.setScalar(lerp(BOX_DROP_START_SCALE, BOX_PLACED_SCALE, eased))

    if (t >= 1) {
      state.phase = 'tear-ready'
      boxGroup.position.copy(state.dropEnd)
      boxGroup.scale.setScalar(BOX_PLACED_SCALE)
      setHint('把手机移到盲盒上方，从左向右撕开拉条')
    }
  }

  const updateOpening = (now) => {
    const t = clamp01((now - state.openStartedAt) / 860)
    const eased = easeInOut(t)
    setBoxOpenProgress(eased)
    tearControls.group.visible = t < 0.82
    tearControls.peel.rotation.z = eased * 0.32
    tearControls.peel.position.x = eased * 0.16

    if (t > 0.24) {
      launchCard()
    }

    if (state.cardLaunched) {
      updateCardFlight(now)
    }
  }

  const updateCardFlight = (now) => {
    const t = clamp01((now - state.cardStartedAt) / 1120)
    const eased = easeInOut(t)
    const oneMinus = 1 - eased
    cardGroup.position
      .copy(state.cardStart)
      .multiplyScalar(oneMinus * oneMinus)
      .add(state.cardPeak.clone().multiplyScalar(2 * oneMinus * eased))
      .add(state.cardEnd.clone().multiplyScalar(eased * eased))
    cardGroup.scale.setScalar((0.22 + eased * 0.78) * BOX_PLACED_SCALE)
    cardGroup.rotation.set(
      lerp(0.1, -Math.PI / 2, eased),
      boxGroup.rotation.y,
      lerp(0.65, -0.18, eased)
    )

    if (t >= 1) {
      state.phase = 'card-landed'
      cardGroup.position.copy(state.cardEnd)
      cardGroup.rotation.set(-Math.PI / 2, boxGroup.rotation.y, -0.18)
      cardGroup.scale.setScalar(BOX_PLACED_SCALE)
      setHint('小卡落到盲盒右侧了，点击小卡捡起')
    }
  }

  const updatePresentationLift = (now) => {
    const t = clamp01((now - state.presentationStartedAt) / CARD_PRESENT_LIFT_DURATION)
    const eased = easeInOut(t)
    const start = state.presentationStart

    displayGroup.position.set(
      lerp(start.x, 0, eased),
      lerp(start.y, 0, eased) + Math.sin(t * Math.PI) * 0.035,
      lerp(start.z, -1.08, eased)
    )
    displayGroup.rotation.set(
      lerp(0.36, 0, eased),
      lerp(-0.22, 0, eased),
      lerp(-0.08, 0, eased)
    )
    displayCardMesh.rotation.set(
      lerp(-0.2, 0, eased),
      lerp(-0.32, 0, eased),
      lerp(-0.12, 0, eased)
    )
    displayCardMesh.scale.setScalar(lerp(0.46, 1, eased))

    if (t >= 1) {
      state.phase = 'card-presented'
      displayGroup.position.set(0, 0, -1.08)
      displayGroup.rotation.set(0, 0, 0)
      displayCardMesh.rotation.set(0, 0, 0)
      displayCardMesh.scale.setScalar(1)
      setButtonVisible(getPhotoButton(), true)
      setHint('点击“与抽到的角色合影”进入拍照页')
    }
  }

  const updatePresentation = (now) => {
    const t = (now - state.presentationStartedAt) / 1000
    displayCardMesh.rotation.y = Math.sin(t * 2.5) * 0.16
    displayCardMesh.rotation.z = Math.sin(t * 3.2) * 0.025
    displayCardMesh.scale.setScalar(1 + Math.sin(t * 5.4) * 0.025)

    sparkles.children.forEach((sparkle, index) => {
      const pulse = (Math.sin(t * 4 + sparkle.userData.phase) + 1) / 2
      sparkle.scale.setScalar(0.65 + pulse * 1.3)
      sparkle.material.opacity = 0.25 + pulse * 0.72
      sparkle.rotation.z += 0.015 + index * 0.0008
    })
  }

  const initXrScene = ({xrScene, activeCanvas}) => {
    scene = xrScene.scene
    camera = xrScene.camera
    renderer = xrScene.renderer
    canvas = activeCanvas

    renderer.shadowMap.enabled = true
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const ambientLight = new THREE.HemisphereLight(0xffffff, 0x4a4a5a, 1.08)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.92)
    directionalLight.position.set(1.8, 3.6, 2.2)
    directionalLight.castShadow = true
    scene.add(directionalLight)

    const groundGeometry = new THREE.PlaneGeometry(2000, 2000)
    groundGeometry.rotateX(-Math.PI / 2)
    const ground = new THREE.Mesh(
      groundGeometry,
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    )
    scene.add(ground)

    camera.position.set(0, CAMERA_HEIGHT_METERS, 0)

    const blindBox = createDefaultBlindBox()
    boxGroup = blindBox.group
    topFlaps = blindBox.topFlaps
    tearControls = blindBox.tearControls
    boxGroup.visible = false
    scene.add(boxGroup)

    createCardObjects()
    preloadPrizeTextures()
  }

  const bindDomControls = () => {
    getGrabButton()?.addEventListener('click', placeBoxAtCenter)
    getResetButton()?.addEventListener('click', resetExperience)
    getPhotoButton()?.addEventListener('click', () => {
      if (!selectedCard) {
        return
      }

      window.dispatchEvent(new CustomEvent('blindbox-start-photo', {
        detail: {card: selectedCard},
      }))
    })

    canvas.addEventListener('pointerdown', onPointerDown, true)
    canvas.addEventListener('pointermove', onPointerMove, true)
    canvas.addEventListener('pointerup', onPointerUp, true)
    canvas.addEventListener('pointercancel', onPointerUp, true)
    canvas.addEventListener('touchmove', event => event.preventDefault(), {passive: false})
  }

  return {
    name: 'blindbox-3d-card-flow',

    onStart: ({canvas: activeCanvas}) => {
      const xrScene = XR8.Threejs.xrScene()

      initXrScene({xrScene, activeCanvas})
      bindDomControls()
      resetExperience()

      XR8.XrController.updateCameraProjectionMatrix({
        origin: camera.position,
        facing: camera.quaternion,
      })
    },

    onUpdate: () => {
      if (!boxGroup) {
        return
      }

      const now = performance.now()

      if (state.phase === 'dropping') {
        updateDrop(now)
      } else if (state.phase === 'opening') {
        updateOpening(now)
      } else if (state.phase === 'card-flying') {
        updateCardFlight(now)
      } else if (state.phase === 'card-lifting') {
        updatePresentationLift(now)
      } else if (state.phase === 'card-presented') {
        updatePresentation(now)
      }

      if (state.phase === 'tear-ready' && !state.draggingTear) {
        const pulse = Math.sin(now * 0.006)
        tearControls.handle.position.y = 0.082 + pulse * 0.012
        tearControls.handle.rotation.z = pulse * 0.12
      }
    },
  }
}
