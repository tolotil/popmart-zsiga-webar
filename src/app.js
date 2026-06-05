import {initScenePipelineModule} from './threejs-scene-init'
import {drawPrizeCharacter} from './card-data'
import * as THREE from 'three'
import cssText from './index.css'

const DOODLE_BASE_URL = 'assets/doodle/molly-doodle-base.png'
const BRAND_LOGO_URL = 'assets/ui/popmart-logo.png'
const PHOTO_MIN_SCALE = 0.72
const PHOTO_MAX_SCALE = 2.4
const DOODLE_COLOR_STORIES = {
  '#ff4f5e': {
    name: '红色',
    trait: '把态度说清楚，不绕弯，也不讨好',
    tone: '敢说',
    energy: '力量',
    expression: '敢把真实态度说出口',
  },
  '#ff9f1c': {
    name: '橙色',
    trait: '把低电量慢慢充回来，让今天重新热闹一点',
    tone: '热忱',
    energy: '热爱',
    expression: '把喜欢的事继续做热',
  },
  '#ffe156': {
    name: '黄色',
    trait: '保留一点孩子气，认真生活，也认真开心',
    tone: '明亮',
    energy: '勇气',
    expression: '用明亮回应今天',
  },
  '#2ecb70': {
    name: '绿色',
    trait: '先站稳自己，再把情绪放回舒服的节奏',
    tone: '松弛',
    energy: '边界',
    expression: '把边界和呼吸感留给自己',
  },
  '#3cb7ff': {
    name: '蓝色',
    trait: '冷静不是没情绪，是选择清醒地表达',
    tone: '清醒',
    energy: '真实',
    expression: '在安静里保留判断',
  },
  '#7864ff': {
    name: '紫色',
    trait: '有自己的节奏，慢一点也没关系',
    tone: '自洽',
    energy: '自我',
    expression: '不急着解释，也不随便改变',
  },
  '#ff74d4': {
    name: '粉色',
    trait: '温柔可以很有边界，可爱也可以很有主见',
    tone: '柔软',
    energy: '主见',
    expression: '把柔软和主见同时留下',
  },
}

window.THREE = THREE

const style = document.createElement('style')
style.textContent = cssText
document.head.appendChild(style)

let photoStream = null
let photoFacingMode = 'user'
let selectedCard = null
let capturedImageUrl = ''
let capturedBlob = null
let dragState = null
let photoScale = 1
let photoBaseWidth = 0
let pinchState = null
let photoCameraToken = 0
let activeEntryChoice = null
let xrReady = false
let xrModulesAdded = false
let xrRunning = false
let pendingStartAr = false
let photoUiBound = false
let entryUiBound = false
let doodleUiBound = false
let doodleReady = false
let doodleImage = null
let brandLogoImage = null
let doodlePaintCanvas = null
let doodlePaintContext = null
let doodlePaintMask = null
let doodleRegionMap = null
let doodleRegions = []
let doodleDrag = null
let doodleFillToken = 0
let doodleHintTimer = 0
let doodleSelectedColors = new Map()
let doodleRegionColors = new Map()
let doodleResultToken = 0
let doodleCardUrl = ''
let doodleCardBlob = null
let doodleCharacterName = '我的 Molly'
const activePhotoPointers = new Map()

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const getPhotoNodes = () => ({
  page: document.getElementById('photo-page'),
  stage: document.getElementById('photo-stage'),
  video: document.getElementById('photo-video'),
  frame: document.getElementById('photo-frame'),
  character: document.getElementById('photo-character'),
  result: document.getElementById('photo-result'),
  hint: document.getElementById('photo-hint'),
  logo: document.getElementById('photo-brand-logo'),
  switchButton: document.getElementById('switch-camera-button'),
  captureButton: document.getElementById('capture-photo-button'),
  shareButton: document.getElementById('share-photo-button'),
  buyButton: document.getElementById('buy-button'),
  doodleButton: document.getElementById('photo-doodle-button'),
})

const getEntryNodes = () => ({
  cover: document.getElementById('entry-cover'),
  boxButton: document.getElementById('entry-box-button'),
  doodleButton: document.getElementById('entry-doodle-button'),
  buyButton: document.getElementById('entry-buy-button'),
  confirm: document.getElementById('entry-confirm'),
  confirmText: document.getElementById('entry-confirm-text'),
  confirmButton: document.getElementById('entry-confirm-button'),
  closeButton: document.getElementById('entry-close-button'),
  cancelButton: document.getElementById('entry-cancel-button'),
})

const getPurchaseNodes = () => ({
  modal: document.getElementById('purchase-modal'),
  closeButton: document.getElementById('purchase-close-button'),
})

const showPurchaseModal = () => {
  const {modal} = getPurchaseNodes()
  modal?.classList.remove('is-hidden')
}

const hidePurchaseModal = () => {
  const {modal} = getPurchaseNodes()
  modal?.classList.add('is-hidden')
}

const getDoodleNodes = () => ({
  page: document.getElementById('doodle-page'),
  resultPage: document.getElementById('doodle-result-page'),
  board: document.querySelector('.doodle-board'),
  stage: document.getElementById('doodle-stage'),
  canvas: document.getElementById('doodle-canvas'),
  palette: document.getElementById('doodle-palette'),
  hint: document.getElementById('doodle-hint'),
  confirmButton: document.getElementById('doodle-confirm-button'),
  nameDialog: document.getElementById('doodle-name-dialog'),
  nameInput: document.getElementById('doodle-name-input'),
  nameConfirmButton: document.getElementById('doodle-name-confirm'),
  nameCancelButton: document.getElementById('doodle-name-cancel'),
  meaningList: document.getElementById('doodle-meaning-list'),
  loading: document.getElementById('doodle-loading'),
  cardWrap: document.getElementById('doodle-card-wrap'),
  cardImage: document.getElementById('doodle-card-image'),
  cardCanvas: document.getElementById('doodle-card-canvas'),
  editButton: document.getElementById('doodle-edit-button'),
  shareButton: document.getElementById('doodle-share-button'),
  saveButton: document.getElementById('doodle-save-button'),
  toBoxButton: document.getElementById('doodle-to-box-button'),
  buyButton: document.getElementById('doodle-buy-button'),
})

const hideEntryConfirm = () => {
  const {confirm} = getEntryNodes()
  activeEntryChoice = null
  confirm?.classList.add('is-hidden')
}

const showEntryConfirm = (choice) => {
  const {confirm, confirmText} = getEntryNodes()
  activeEntryChoice = choice

  if (confirmText) {
    confirmText.textContent = choice === 'box'
      ? '是否选择进入 AR 抽盒体验，抽取你的今日盲盒呢？'
      : '是否选择进入涂鸦体验，设计专属于你的幸运色 Angry Molly 呢？'
  }

  confirm?.classList.remove('is-hidden')
}

const hidePhotoMode = () => {
  const {page} = getPhotoNodes()
  photoCameraToken += 1
  stopPhotoStream()
  page?.classList.add('is-hidden')
  page?.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('photo-active')
}

const showCover = () => {
  const {cover} = getEntryNodes()
  const {page: doodlePage, resultPage: doodleResultPage} = getDoodleNodes()
  hidePhotoMode()
  doodlePage?.classList.add('is-hidden')
  doodlePage?.setAttribute('aria-hidden', 'true')
  doodleResultPage?.classList.add('is-hidden')
  doodleResultPage?.setAttribute('aria-hidden', 'true')
  cover?.classList.remove('is-hidden')
  document.body.classList.remove('ar-active', 'doodle-active', 'doodle-result-active')
}

const getPhotoStageRect = () => {
  const {stage} = getPhotoNodes()

  if (stage) {
    return stage.getBoundingClientRect()
  }

  return {
    left: 0,
    top: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

const stopPhotoStream = () => {
  const {video} = getPhotoNodes()

  if (!photoStream) {
    if (video) {
      video.pause()
      video.srcObject = null
    }
    return
  }

  photoStream.getTracks().forEach(track => track.stop())
  photoStream = null

  if (video) {
    video.pause()
    video.srcObject = null
    video.removeAttribute('src')
    video.load()
  }
}

const updatePhotoVideoMirror = () => {
  const {video} = getPhotoNodes()

  if (video) {
    video.style.transform = photoFacingMode === 'user' ? 'scaleX(-1)' : 'none'
  }
}

const getPhotoCameraConstraints = (facingMode, exact = false) => ({
  video: {
    facingMode: exact ? {exact: facingMode} : {ideal: facingMode},
    width: {ideal: 1280},
    height: {ideal: 720},
  },
  audio: false,
})

const requestPhotoStream = async () => {
  const attempts = [
    () => navigator.mediaDevices.getUserMedia(getPhotoCameraConstraints(photoFacingMode, true)),
    () => navigator.mediaDevices.getUserMedia(getPhotoCameraConstraints(photoFacingMode)),
    () => navigator.mediaDevices.getUserMedia({video: true, audio: false}),
  ]

  let lastError = null

  for (const attempt of attempts) {
    try {
      return await attempt()
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}

const startPhotoCamera = async () => {
  const {video, hint} = getPhotoNodes()
  const token = ++photoCameraToken

  stopPhotoStream()
  await sleep(180)

  try {
    const nextStream = await requestPhotoStream()

    if (token !== photoCameraToken) {
      nextStream.getTracks().forEach(track => track.stop())
      return
    }

    photoStream = nextStream
  } catch (error) {
    if (hint) {
      hint.textContent = '摄像头没有打开，请确认浏览器摄像头权限后重试'
    }
    return
  }

  video.muted = true
  video.playsInline = true
  video.srcObject = photoStream
  updatePhotoVideoMirror()

  try {
    await video.play()
  } catch (error) {
    if (hint) {
      hint.textContent = '摄像头已授权但画面没有开始播放，请再点一次切换摄像头'
    }
    return
  }

  if (hint) {
    hint.textContent = '拖动角色调整位置，双指缩放，点合影留念固定画面'
  }
}

const drawPhotoCharacter = async () => {
  const {character} = getPhotoNodes()

  if (!selectedCard || !character) {
    return
  }

  const ctx = character.getContext('2d')
  ctx.clearRect(0, 0, character.width, character.height)

  await drawPrizeCharacter(
    ctx,
    selectedCard,
    24,
    12,
    character.width - 48,
    character.height - 28,
    {shadow: true}
  )
}

const placePhotoCharacter = () => {
  const {character} = getPhotoNodes()
  const stageRect = getPhotoStageRect()
  photoBaseWidth = Math.min(stageRect.width * 0.36, 190)
  const width = photoBaseWidth * photoScale

  character.style.width = `${width}px`
  character.style.right = '7%'
  character.style.left = 'auto'
  character.style.bottom = '10%'
  character.style.top = 'auto'
}

const resetPhotoGestures = () => {
  dragState = null
  pinchState = null
  activePhotoPointers.clear()
}

const getPointerDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

const applyPhotoCharacterScale = (center) => {
  const {character} = getPhotoNodes()
  const stageRect = getPhotoStageRect()
  const width = photoBaseWidth * photoScale
  const height = width * (character.height / character.width)
  const nextCenter = center || {
    x: stageRect.left + stageRect.width * 0.76,
    y: stageRect.top + stageRect.height * 0.82,
  }
  const x = clamp(nextCenter.x - stageRect.left - width / 2, 0, Math.max(stageRect.width - width, 0))
  const y = clamp(nextCenter.y - stageRect.top - height / 2, 0, Math.max(stageRect.height - height, 0))

  character.style.width = `${width}px`
  character.style.left = `${x}px`
  character.style.top = `${y}px`
  character.style.right = 'auto'
  character.style.bottom = 'auto'
}

const beginPhotoPinch = (character) => {
  const pointers = Array.from(activePhotoPointers.values())

  if (pointers.length < 2) {
    pinchState = null
    return
  }

  const [first, second] = pointers
  const rect = character.getBoundingClientRect()
  pinchState = {
    startDistance: Math.max(getPointerDistance(first, second), 1),
    startScale: photoScale,
    center: {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    },
  }
  dragState = null
}

const drawVideoCover = (ctx, video, width, height, mirror = false) => {
  const videoWidth = video.videoWidth || width
  const videoHeight = video.videoHeight || height
  const videoAspect = videoWidth / videoHeight
  const canvasAspect = width / height

  let sx = 0
  let sy = 0
  let sw = videoWidth
  let sh = videoHeight

  if (videoAspect > canvasAspect) {
    sw = videoHeight * canvasAspect
    sx = (videoWidth - sw) / 2
  } else {
    sh = videoWidth / canvasAspect
    sy = (videoHeight - sh) / 2
  }

  ctx.save()

  if (mirror) {
    ctx.translate(width, 0)
    ctx.scale(-1, 1)
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height)
  ctx.restore()
}

const waitForImage = async (image) => {
  if (!image || image.complete) {
    return
  }

  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
  })
}

const loadDoodleImage = async () => {
  if (doodleImage) {
    return doodleImage
  }

  doodleImage = new Image()
  doodleImage.decoding = 'async'
  doodleImage.src = DOODLE_BASE_URL

  if (doodleImage.complete) {
    return doodleImage
  }

  await new Promise((resolve, reject) => {
    doodleImage.onload = resolve
    doodleImage.onerror = reject
  })

  return doodleImage
}

const loadBrandLogoImage = async () => {
  if (brandLogoImage) {
    return brandLogoImage
  }

  brandLogoImage = new Image()
  brandLogoImage.decoding = 'async'
  brandLogoImage.src = BRAND_LOGO_URL

  if (brandLogoImage.complete) {
    return brandLogoImage
  }

  await new Promise((resolve, reject) => {
    brandLogoImage.onload = resolve
    brandLogoImage.onerror = reject
  })

  return brandLogoImage
}

const drawBrandLogo = (ctx, logo, x, y, width) => {
  if (!logo || !logo.naturalWidth || !logo.naturalHeight) {
    return
  }

  const height = width * (logo.naturalHeight / logo.naturalWidth)
  ctx.drawImage(logo, x, y, width, height)
}

const hexToRgb = (hex) => {
  const value = hex.replace('#', '')

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  }
}

const getDoodleStories = () => Array.from(doodleSelectedColors.values())

const getDoodleMeaningLine = (story) => `${story.name}：${story.trait}。`

const formatDoodleList = (items, limit = 3) => {
  const values = Array.from(new Set(items)).slice(0, limit)

  if (values.length <= 1) {
    return values[0] || ''
  }

  if (values.length === 2) {
    return `${values[0]}与${values[1]}`
  }

  return `${values.slice(0, -1).join('、')}与${values[values.length - 1]}`
}

const composeDoodleDesignCopy = (stories) => {
  const names = stories.map(story => story.name)
  const tones = stories.map(story => story.tone)
  const energies = stories.map(story => story.energy)
  const expressions = stories.map(story => story.expression)
  const warmCount = stories.filter(story => ['力量', '热爱', '勇气', '主见'].includes(story.energy)).length
  const coolCount = stories.length - warmCount
  const hasContrast = warmCount > 0 && coolCount > 0
  const paletteName = formatDoodleList(names)
  const toneText = formatDoodleList(tones)
  const energyText = formatDoodleList(energies)

  if (stories.length === 1) {
    return `${doodleCharacterName} 选了${names[0]}。它把${energies[0]}穿成颜色：${expressions[0]}。这不是发脾气，是把真实放到台前。`
  }

  if (stories.length === 2) {
    const bridge = hasContrast
      ? '一色点燃生命力，一色守住节奏'
      : '两色同向，把态度推得更鲜明'

    return `${doodleCharacterName} 的${paletteName}站在一起：${bridge}。愤怒在这里是${energyText}，不是失控，是认真表达自己。`
  }

  const balance = hasContrast
    ? '热烈负责向前，冷静负责守边界'
    : warmCount === stories.length
      ? '整组颜色像一簇心火，热烈但不乱'
      : '整组颜色更安静，却把自我留得很清楚'

  return `${doodleCharacterName} 把${paletteName}做成色彩矩阵。${balance}，${energyText}一起燃起来；${toneText}不是标准答案，是今天敢表达的版本。`
}

const syncDoodleSelectedColors = () => {
  const colors = new Map()

  for (const color of doodleRegionColors.values()) {
    const story = DOODLE_COLOR_STORIES[color]

    if (story && !colors.has(color)) {
      colors.set(color, {
        color,
        ...story,
      })
    }
  }

  doodleSelectedColors = colors

  const {confirmButton} = getDoodleNodes()

  if (confirmButton) {
    confirmButton.disabled = doodleSelectedColors.size === 0
    confirmButton.textContent = doodleSelectedColors.size > 0 ? '确定选择' : '确定选择'
  }
}

const roundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

const wrapCanvasText = (ctx, text, maxWidth) => {
  const chars = Array.from(text)
  const lines = []
  let line = ''

  for (const char of chars) {
    const testLine = `${line}${char}`

    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = char
      continue
    }

    line = testLine
  }

  if (line) {
    lines.push(line)
  }

  return lines
}

const createDoodleCard = async (stories) => {
  const {cardCanvas, canvas: doodleCanvas, cardImage} = getDoodleNodes()

  if (!cardCanvas || !doodleCanvas || !cardImage) {
    return
  }

  const logo = await loadBrandLogoImage().catch(() => null)
  const width = cardCanvas.width
  const height = cardCanvas.height
  const ctx = cardCanvas.getContext('2d')
  const colors = stories.map(story => story.color)
  const firstColor = colors[0] || '#45a9d8'
  const secondColor = colors[1] || '#ffd84a'
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#fffaf0')
  gradient.addColorStop(0.42, firstColor)
  gradient.addColorStop(1, secondColor)

  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.globalAlpha = 0.82
  ctx.fillStyle = '#ffffff'
  roundedRect(ctx, 54, 54, width - 108, height - 108, 44)
  ctx.fill()
  ctx.restore()

  drawBrandLogo(ctx, logo, 86, 82, 128)

  ctx.fillStyle = '#111111'
  ctx.textAlign = 'center'
  ctx.font = '900 54px system-ui, sans-serif'
  ctx.fillText('Angry Molly 幸运色小卡', width / 2, 164)
  ctx.font = '900 36px system-ui, sans-serif'
  ctx.fillStyle = firstColor
  ctx.fillText(`「${doodleCharacterName}」`, width / 2, 212)

  const sourceRatio = doodleCanvas.width / doodleCanvas.height
  const characterHeight = 600
  const characterWidth = characterHeight * sourceRatio
  const characterX = (width - characterWidth) / 2
  const characterY = 242
  ctx.drawImage(doodleCanvas, characterX, characterY, characterWidth, characterHeight)

  let chipX = 106
  let chipY = 820
  const chipSize = 32
  ctx.textAlign = 'left'
  ctx.font = '800 25px system-ui, sans-serif'

  stories.forEach(story => {
    const labelWidth = ctx.measureText(story.name).width

    if (chipX + chipSize + 42 + labelWidth > width - 106) {
      chipX = 106
      chipY += 44
    }

    ctx.fillStyle = story.color
    roundedRect(ctx, chipX, chipY, chipSize, chipSize, 16)
    ctx.fill()
    ctx.fillStyle = '#111111'
    ctx.fillText(story.name, chipX + 42, chipY + 25)
    chipX += 42 + labelWidth + 22
  })

  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
  roundedRect(ctx, 86, 910, width - 172, 304, 30)
  ctx.fill()

  ctx.fillStyle = '#111111'
  ctx.textAlign = 'left'
  const designCopy = composeDoodleDesignCopy(stories)
  let copyFontSize = 28
  let copyLineHeight = 40
  let lines = []

  do {
    ctx.font = `850 ${copyFontSize}px system-ui, sans-serif`
    lines = wrapCanvasText(ctx, designCopy, width - 230)
    copyLineHeight = copyFontSize + 12

    if (lines.length * copyLineHeight <= 214 || copyFontSize <= 22) {
      break
    }

    copyFontSize -= 2
  } while (copyFontSize >= 22)

  let textY = 952 + copyFontSize

  lines.forEach(line => {
    ctx.fillText(line, 116, textY)
    textY += copyLineHeight
  })

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(17, 17, 17, 0.52)'
  ctx.font = '800 24px system-ui, sans-serif'
  ctx.fillText('MOLLY 20 周年 | 心火怒放', width / 2, 1262)

  if (doodleCardUrl) {
    URL.revokeObjectURL(doodleCardUrl)
  }

  doodleCardBlob = await new Promise(resolve => cardCanvas.toBlob(resolve, 'image/png', 0.94))

  if (doodleCardBlob) {
    doodleCardUrl = URL.createObjectURL(doodleCardBlob)
    cardImage.src = doodleCardUrl
  }
}

const typeDoodleMeanings = async (stories, token) => {
  const {meaningList} = getDoodleNodes()

  if (!meaningList) {
    return
  }

  meaningList.textContent = ''

  for (const story of stories) {
    if (token !== doodleResultToken) {
      return
    }

    const line = document.createElement('p')
    line.className = 'doodle-meaning-line'
    meaningList.appendChild(line)

    for (const char of Array.from(getDoodleMeaningLine(story))) {
      if (token !== doodleResultToken) {
        return
      }

      line.textContent += char
      await sleep(42)
    }
  }
}

const closeDoodleNameDialog = () => {
  const {nameDialog} = getDoodleNodes()
  nameDialog?.classList.add('is-hidden')
}

const openDoodleNameDialog = () => {
  syncDoodleSelectedColors()

  if (!getDoodleStories().length) {
    showDoodleHint('先拖一个颜色到灰色区域，再确认选择')
    return
  }

  const {nameDialog, nameInput} = getDoodleNodes()
  nameDialog?.classList.remove('is-hidden')

  if (nameInput) {
    nameInput.value = doodleCharacterName === '我的 Molly' ? '' : doodleCharacterName
    window.setTimeout(() => nameInput.focus(), 80)
  }
}

const confirmDoodleName = () => {
  const {nameInput} = getDoodleNodes()
  const value = nameInput?.value.trim()
  doodleCharacterName = value || '我的 Molly'
  closeDoodleNameDialog()
  openDoodleResult()
}

const openDoodleResult = async () => {
  syncDoodleSelectedColors()

  const stories = getDoodleStories()

  if (!stories.length) {
    showDoodleHint('先拖一个颜色到灰色区域，再确认选择')
    return
  }

  const {
    page,
    resultPage,
    meaningList,
    loading,
    cardWrap,
    editButton,
    shareButton,
    saveButton,
    toBoxButton,
  } = getDoodleNodes()
  const token = ++doodleResultToken

  page?.classList.add('is-hidden')
  page?.setAttribute('aria-hidden', 'true')
  resultPage?.classList.remove('is-hidden')
  resultPage?.querySelector('.doodle-result')?.classList.remove('has-card')
  resultPage?.setAttribute('aria-hidden', 'false')
  document.body.classList.remove('doodle-active', 'ar-active', 'photo-active')
  document.body.classList.add('doodle-result-active')

  if (meaningList) {
    meaningList.textContent = ''
  }

  loading?.classList.add('is-hidden')
  loading?.classList.remove('is-running')
  loading?.setAttribute('aria-hidden', 'true')
  cardWrap?.classList.add('is-hidden')
  editButton?.classList.add('is-hidden')
  shareButton?.classList.add('is-hidden')
  saveButton?.classList.add('is-hidden')
  toBoxButton?.classList.add('is-hidden')

  await typeDoodleMeanings(stories, token)

  if (token !== doodleResultToken) {
    return
  }

  loading?.classList.remove('is-hidden')
  loading?.setAttribute('aria-hidden', 'false')
  void loading?.offsetWidth
  loading?.classList.add('is-running')
  await sleep(2000)

  if (token !== doodleResultToken) {
    return
  }

  await createDoodleCard(stories)
  loading?.classList.add('is-hidden')
  loading?.classList.remove('is-running')
  loading?.setAttribute('aria-hidden', 'true')
  resultPage?.querySelector('.doodle-result')?.classList.add('has-card')
  cardWrap?.classList.remove('is-hidden')
  editButton?.classList.remove('is-hidden')
  shareButton?.classList.remove('is-hidden')
  saveButton?.classList.remove('is-hidden')
  toBoxButton?.classList.remove('is-hidden')
}

const returnToDoodleEdit = () => {
  const {
    page,
    resultPage,
    nameDialog,
    loading,
    cardWrap,
    editButton,
    shareButton,
    saveButton,
    toBoxButton,
  } = getDoodleNodes()

  doodleResultToken += 1
  resultPage?.classList.add('is-hidden')
  resultPage?.setAttribute('aria-hidden', 'true')
  resultPage?.querySelector('.doodle-result')?.classList.remove('has-card')
  page?.classList.remove('is-hidden')
  page?.setAttribute('aria-hidden', 'false')
  nameDialog?.classList.add('is-hidden')
  loading?.classList.add('is-hidden')
  loading?.classList.remove('is-running')
  loading?.setAttribute('aria-hidden', 'true')
  cardWrap?.classList.add('is-hidden')
  editButton?.classList.add('is-hidden')
  shareButton?.classList.add('is-hidden')
  saveButton?.classList.add('is-hidden')
  toBoxButton?.classList.add('is-hidden')
  document.body.classList.remove('doodle-result-active', 'ar-active', 'photo-active')
  document.body.classList.add('doodle-active')
  drawDoodleCanvas()
  syncDoodleSelectedColors()
  showDoodleHint('可以继续修改颜色，完成后再次确认')
}

const saveDoodleCard = async () => {
  if (!doodleCardUrl) {
    await createDoodleCard(getDoodleStories())
  }

  if (!doodleCardUrl) {
    return
  }

  const link = document.createElement('a')
  link.href = doodleCardUrl
  link.download = 'angry-molly-lucky-color-card.png'
  link.click()
}

const showDoodleHint = (message, autoReset = true) => {
  const {hint} = getDoodleNodes()

  if (!hint) {
    return
  }

  window.clearTimeout(doodleHintTimer)
  hint.textContent = message

  if (!autoReset) {
    return
  }

  doodleHintTimer = window.setTimeout(() => {
    hint.textContent = '拖色点到灰色区域上色'
  }, 1700)
}

const isDoodlePaintablePixel = (data, offset) => {
  const r = data[offset]
  const g = data[offset + 1]
  const b = data[offset + 2]
  const a = data[offset + 3]

  return (
    a > 24 &&
    r >= 188 &&
    r <= 232 &&
    Math.abs(r - g) <= 8 &&
    Math.abs(r - b) <= 8
  )
}

const drawDoodleCanvas = () => {
  const {canvas} = getDoodleNodes()

  if (!canvas || !doodleImage) {
    return
  }

  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(doodleImage, 0, 0, canvas.width, canvas.height)

  if (doodlePaintCanvas) {
    context.drawImage(doodlePaintCanvas, 0, 0)
  }
}

const initDoodleCanvas = async () => {
  if (doodleReady) {
    drawDoodleCanvas()
    return
  }

  const {canvas} = getDoodleNodes()

  if (!canvas) {
    return
  }

  showDoodleHint('正在准备涂鸦底稿', false)

  try {
    const image = await loadDoodleImage()
    canvas.width = image.naturalWidth || image.width
    canvas.height = image.naturalHeight || image.height

    const context = canvas.getContext('2d', {willReadFrequently: true})
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    const baseImageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const total = canvas.width * canvas.height
    doodlePaintMask = new Uint8Array(total)
    doodleRegionMap = new Int32Array(total)
    doodleRegions = []

    for (let index = 0; index < total; index += 1) {
      if (isDoodlePaintablePixel(baseImageData.data, index * 4)) {
        doodlePaintMask[index] = 1
      }
    }

    doodlePaintCanvas = document.createElement('canvas')
    doodlePaintCanvas.width = canvas.width
    doodlePaintCanvas.height = canvas.height
    doodlePaintContext = doodlePaintCanvas.getContext('2d', {willReadFrequently: true})
    doodleReady = true
    drawDoodleCanvas()
    syncDoodleSelectedColors()
    showDoodleHint('拖色点到灰色区域上色')
  } catch (error) {
    showDoodleHint('底稿加载失败，请刷新页面重试', false)
  }
}

const getDoodleCanvasPoint = (clientX, clientY) => {
  const {canvas} = getDoodleNodes()

  if (!canvas || !canvas.width || !canvas.height) {
    return null
  }

  const rect = canvas.getBoundingClientRect()

  if (
    clientX < rect.left ||
    clientX > rect.right ||
    clientY < rect.top ||
    clientY > rect.bottom
  ) {
    return null
  }

  return {
    x: Math.floor((clientX - rect.left) * (canvas.width / rect.width)),
    y: Math.floor((clientY - rect.top) * (canvas.height / rect.height)),
  }
}

const findNearestDoodlePaintableIndex = (point) => {
  if (!point || !doodlePaintMask || !doodlePaintCanvas) {
    return -1
  }

  const width = doodlePaintCanvas.width
  const height = doodlePaintCanvas.height
  const x = clamp(point.x, 0, width - 1)
  const y = clamp(point.y, 0, height - 1)
  const directIndex = y * width + x

  if (doodlePaintMask[directIndex]) {
    return directIndex
  }

  const maxRadius = 22

  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue
        }

        const nx = x + dx
        const ny = y + dy

        if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
          continue
        }

        const index = ny * width + nx

        if (doodlePaintMask[index]) {
          return index
        }
      }
    }
  }

  return -1
}

const getDoodleRegion = (startIndex) => {
  if (startIndex < 0 || !doodlePaintMask || !doodleRegionMap || !doodlePaintCanvas) {
    return null
  }

  const existingId = doodleRegionMap[startIndex]

  if (existingId > 0) {
    return doodleRegions[existingId - 1]
  }

  const width = doodlePaintCanvas.width
  const height = doodlePaintCanvas.height
  const id = doodleRegions.length + 1
  const stack = [startIndex]
  const pixels = []
  doodleRegionMap[startIndex] = id

  while (stack.length) {
    const index = stack.pop()
    pixels.push(index)

    const x = index % width
    const y = Math.floor(index / width)
    const neighbors = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y < height - 1 ? index + width : -1,
    ]

    for (const nextIndex of neighbors) {
      if (
        nextIndex >= 0 &&
        doodlePaintMask[nextIndex] &&
        doodleRegionMap[nextIndex] === 0
      ) {
        doodleRegionMap[nextIndex] = id
        stack.push(nextIndex)
      }
    }
  }

  const region = {id, pixels}
  doodleRegions.push(region)

  return region
}

const addDoodleBloom = (clientX, clientY, color) => {
  const {stage} = getDoodleNodes()

  if (!stage) {
    return
  }

  const rect = stage.getBoundingClientRect()
  const bloom = document.createElement('span')
  bloom.className = 'doodle-bloom'
  bloom.style.setProperty('--paint-color', color)
  bloom.style.left = `${clientX - rect.left}px`
  bloom.style.top = `${clientY - rect.top}px`
  stage.appendChild(bloom)
  bloom.addEventListener('animationend', () => bloom.remove(), {once: true})
}

const denyDoodlePaint = () => {
  const {board} = getDoodleNodes()

  board?.classList.remove('is-denied')
  void board?.offsetWidth
  board?.classList.add('is-denied')
  window.setTimeout(() => board?.classList.remove('is-denied'), 260)
  showDoodleHint('这里是肤色、白色或线条区域，不能上色')
}

const animateDoodleRegionFill = (region, color, originIndex) => {
  if (!region || !doodlePaintCanvas || !doodlePaintContext) {
    return
  }

  const width = doodlePaintCanvas.width
  const imageData = doodlePaintContext.getImageData(0, 0, width, doodlePaintCanvas.height)
  const data = imageData.data
  const rgb = hexToRgb(color)
  const originX = originIndex % width
  const originY = Math.floor(originIndex / width)
  let maxDistanceSq = 1

  for (const index of region.pixels) {
    const dx = (index % width) - originX
    const dy = Math.floor(index / width) - originY
    maxDistanceSq = Math.max(maxDistanceSq, dx * dx + dy * dy)
  }

  const startedAt = performance.now()
  const duration = 520
  const token = ++doodleFillToken

  const paintFrame = (now) => {
    if (token !== doodleFillToken) {
      return
    }

    const progress = clamp((now - startedAt) / duration, 0, 1)
    const eased = 1 - ((1 - progress) ** 3)
    const radiusSq = maxDistanceSq * eased * eased

    for (const index of region.pixels) {
      const dx = (index % width) - originX
      const dy = Math.floor(index / width) - originY

      if (progress === 1 || dx * dx + dy * dy <= radiusSq) {
        const offset = index * 4
        data[offset] = rgb.r
        data[offset + 1] = rgb.g
        data[offset + 2] = rgb.b
        data[offset + 3] = 238
      }
    }

    doodlePaintContext.putImageData(imageData, 0, 0)
    drawDoodleCanvas()

    if (progress < 1) {
      window.requestAnimationFrame(paintFrame)
    }
  }

  window.requestAnimationFrame(paintFrame)
}

const paintDoodleAt = async (clientX, clientY, color) => {
  if (!doodleReady) {
    await initDoodleCanvas()
  }

  const point = getDoodleCanvasPoint(clientX, clientY)
  const startIndex = findNearestDoodlePaintableIndex(point)

  if (startIndex < 0) {
    denyDoodlePaint()
    return
  }

  const region = getDoodleRegion(startIndex)

  if (!region || region.pixels.length < 10) {
    denyDoodlePaint()
    return
  }

  addDoodleBloom(clientX, clientY, color)
  doodleRegionColors.set(region.id, color)
  syncDoodleSelectedColors()
  animateDoodleRegionFill(region, color, startIndex)
  showDoodleHint('已铺色，可以继续涂色，或点击确定选择')
}

const updateDoodleDragDot = (event) => {
  if (!doodleDrag) {
    return
  }

  doodleDrag.dot.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`
}

const finishDoodleDrag = async (event) => {
  if (!doodleDrag || event.pointerId !== doodleDrag.pointerId) {
    return
  }

  const {color, dot} = doodleDrag
  doodleDrag = null
  dot.remove()
  window.removeEventListener('pointermove', updateDoodleDragDot)
  window.removeEventListener('pointerup', finishDoodleDrag)
  window.removeEventListener('pointercancel', finishDoodleDrag)
  await paintDoodleAt(event.clientX, event.clientY, color)
}

const beginDoodleDrag = (event) => {
  const color = event.currentTarget.dataset.color

  if (!color) {
    return
  }

  event.preventDefault()

  if (doodleDrag) {
    doodleDrag.dot.remove()
  }

  const dot = document.createElement('span')
  dot.className = 'doodle-drag-dot'
  dot.style.setProperty('--paint-color', color)
  document.body.appendChild(dot)
  doodleDrag = {
    color,
    dot,
    pointerId: event.pointerId,
  }

  updateDoodleDragDot(event)
  window.addEventListener('pointermove', updateDoodleDragDot)
  window.addEventListener('pointerup', finishDoodleDrag)
  window.addEventListener('pointercancel', finishDoodleDrag)
}

const capturePhoto = async () => {
  const {page, video, frame, character, logo, result, shareButton, buyButton, doodleButton, captureButton, hint} = getPhotoNodes()
  await Promise.all([
    waitForImage(frame),
    waitForImage(logo),
  ])

  const stageRect = getPhotoStageRect()
  const width = frame.naturalWidth || Math.round(stageRect.width * window.devicePixelRatio)
  const height = frame.naturalHeight || Math.round(stageRect.height * window.devicePixelRatio)
  const scaleX = width / stageRect.width
  const scaleY = height / stageRect.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  drawVideoCover(ctx, video, width, height, photoFacingMode === 'user')

  const characterRect = character.getBoundingClientRect()
  ctx.drawImage(
    character,
    (characterRect.left - stageRect.left) * scaleX,
    (characterRect.top - stageRect.top) * scaleY,
    characterRect.width * scaleX,
    characterRect.height * scaleY
  )

  ctx.drawImage(frame, 0, 0, width, height)

  if (logo?.naturalWidth && logo?.naturalHeight) {
    const logoRect = logo.getBoundingClientRect()
    ctx.drawImage(
      logo,
      (logoRect.left - stageRect.left) * scaleX,
      (logoRect.top - stageRect.top) * scaleY,
      logoRect.width * scaleX,
      logoRect.height * scaleY
    )
  }

  capturedImageUrl = canvas.toDataURL('image/png')
  result.src = capturedImageUrl
  result.classList.remove('is-hidden')
  page.classList.add('is-captured')

  capturedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.96))
  captureButton.textContent = '重拍'
  shareButton.classList.remove('is-hidden')
  buyButton.classList.remove('is-hidden')
  doodleButton.classList.remove('is-hidden')

  if (hint) {
    hint.textContent = '合影已固定，可以保存或进入购买链接'
  }
}

const sharePhoto = async () => {
  const {hint} = getPhotoNodes()

  if (!capturedBlob && !capturedImageUrl) {
    return
  }

  try {
    const link = document.createElement('a')
    const objectUrl = capturedImageUrl ? '' : URL.createObjectURL(capturedBlob)
    link.href = capturedImageUrl || objectUrl
    link.download = 'blindbox-photo.png'
    link.rel = 'noopener'
    document.body.appendChild(link)
    link.click()
    link.remove()

    if (objectUrl) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200)
    }

    if (hint) {
      hint.textContent = '已触发保存；如浏览器没有下载，请长按合影图片保存'
    }
  } catch (error) {
    if (hint) {
      hint.textContent = '保存失败，请长按合影图片保存'
    }
  }
}

const startPhotoMode = async (card) => {
  selectedCard = card
  capturedImageUrl = ''
  capturedBlob = null
  photoFacingMode = 'user'
  photoScale = 1
  resetPhotoGestures()

  const {page, result, shareButton, buyButton, doodleButton, captureButton, hint} = getPhotoNodes()
  page.classList.remove('is-hidden')
  page.classList.remove('is-captured')
  page.setAttribute('aria-hidden', 'false')
  result.classList.add('is-hidden')
  shareButton.classList.add('is-hidden')
  buyButton.classList.add('is-hidden')
  doodleButton.classList.add('is-hidden')
  captureButton.textContent = '合影留念'
  document.body.classList.add('photo-active')

  if (hint) {
    hint.textContent = '正在打开合影相机'
  }

  if (window.XR8?.stop) {
    try {
      window.XR8.stop()
      xrRunning = false
    } catch (error) {
      // The photo page uses getUserMedia; stopping XR frees the camera when supported.
    }
  }

  placePhotoCharacter()
  await Promise.all([
    drawPhotoCharacter(),
    startPhotoCamera(),
  ])
}

const ensureXrModules = () => {
  if (xrModulesAdded || !window.XR8) {
    return
  }

  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    window.LandingPage.pipelineModule(),
    XRExtras.FullWindowCanvas.pipelineModule(),
    XRExtras.Loading.pipelineModule(),
    XRExtras.RuntimeError.pipelineModule(),
    initScenePipelineModule(),
  ])

  xrModulesAdded = true
}

const stopXrIfRunning = () => {
  if (!xrRunning || !window.XR8?.stop) {
    return
  }

  try {
    window.XR8.stop()
  } catch (error) {
    // XR may already be stopped when switching between experience pages.
  }

  xrRunning = false
}

const startArExperience = () => {
  if (!xrReady || !window.XR8) {
    pendingStartAr = true
    const {confirm, confirmText} = getEntryNodes()

    if (confirmText) {
      confirmText.textContent = 'AR 引擎正在加载，请稍等'
    }

    confirm?.classList.remove('is-hidden')
    return
  }

  pendingStartAr = false
  hideEntryConfirm()

  const {cover} = getEntryNodes()
  const {page: doodlePage, resultPage: doodleResultPage} = getDoodleNodes()
  hidePhotoMode()
  doodlePage?.classList.add('is-hidden')
  doodlePage?.setAttribute('aria-hidden', 'true')
  doodleResultPage?.classList.add('is-hidden')
  doodleResultPage?.setAttribute('aria-hidden', 'true')
  cover?.classList.add('is-hidden')
  document.body.classList.add('ar-active')
  document.body.classList.remove('doodle-active', 'doodle-result-active')

  ensureXrModules()

  if (!xrRunning) {
    const canvas = document.getElementById('camerafeed')
    XR8.run({canvas})
    xrRunning = true
  }
}

const openDoodleExperience = () => {
  pendingStartAr = false
  hideEntryConfirm()
  hidePhotoMode()
  stopXrIfRunning()

  const {cover} = getEntryNodes()
  const {page, resultPage, nameDialog} = getDoodleNodes()
  doodleResultToken += 1
  cover?.classList.add('is-hidden')
  page?.classList.remove('is-hidden')
  page?.setAttribute('aria-hidden', 'false')
  nameDialog?.classList.add('is-hidden')
  resultPage?.classList.add('is-hidden')
  resultPage?.querySelector('.doodle-result')?.classList.remove('has-card')
  resultPage?.setAttribute('aria-hidden', 'true')
  document.body.classList.remove('ar-active', 'photo-active', 'doodle-result-active')
  document.body.classList.add('doodle-active')
  initDoodleCanvas()
  syncDoodleSelectedColors()
}

const bindDoodleUi = () => {
  if (doodleUiBound) {
    return
  }

  doodleUiBound = true

  const {
    palette,
    confirmButton,
    nameConfirmButton,
    nameCancelButton,
    nameInput,
    editButton,
    shareButton,
    saveButton,
  } = getDoodleNodes()
  const colorButtons = palette?.querySelectorAll('.doodle-color') || []

  colorButtons.forEach(button => {
    button.addEventListener('pointerdown', beginDoodleDrag)
  })

  confirmButton?.addEventListener('click', openDoodleNameDialog)
  nameConfirmButton?.addEventListener('click', confirmDoodleName)
  nameCancelButton?.addEventListener('click', closeDoodleNameDialog)
  nameInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      confirmDoodleName()
    }
  })
  editButton?.addEventListener('click', returnToDoodleEdit)
  shareButton?.addEventListener('click', saveDoodleCard)
  saveButton?.addEventListener('click', () => {
    showPurchaseModal()
  })
}

const bindPhotoUi = () => {
  if (photoUiBound) {
    return
  }

  photoUiBound = true

  const {page, character, switchButton, captureButton, shareButton, buyButton, doodleButton, result, hint} = getPhotoNodes()

  character.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    activePhotoPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    character.setPointerCapture(event.pointerId)

    if (activePhotoPointers.size >= 2) {
      beginPhotoPinch(character)
      return
    }

    const rect = character.getBoundingClientRect()
    dragState = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    }
  })

  character.addEventListener('pointermove', (event) => {
    if (!activePhotoPointers.has(event.pointerId)) {
      return
    }

    event.preventDefault()
    activePhotoPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })

    if (activePhotoPointers.size >= 2) {
      const pointers = Array.from(activePhotoPointers.values())
      const distance = Math.max(getPointerDistance(pointers[0], pointers[1]), 1)

      if (!pinchState) {
        beginPhotoPinch(character)
      }

      photoScale = clamp(
        pinchState.startScale * (distance / pinchState.startDistance),
        PHOTO_MIN_SCALE,
        PHOTO_MAX_SCALE
      )
      applyPhotoCharacterScale(pinchState.center)
      return
    }

    if (!dragState) {
      return
    }

    const width = character.offsetWidth
    const height = character.offsetHeight
    const stageRect = getPhotoStageRect()
    const x = clamp(
      event.clientX - dragState.offsetX - stageRect.left,
      0,
      Math.max(stageRect.width - width, 0)
    )
    const y = clamp(
      event.clientY - dragState.offsetY - stageRect.top,
      0,
      Math.max(stageRect.height - height, 0)
    )
    character.style.left = `${x}px`
    character.style.top = `${y}px`
    character.style.right = 'auto'
    character.style.bottom = 'auto'
  })

  const endCharacterPointer = (event) => {
    if (character.hasPointerCapture(event.pointerId)) {
      character.releasePointerCapture(event.pointerId)
    }

    activePhotoPointers.delete(event.pointerId)
    pinchState = null

    if (activePhotoPointers.size === 1) {
      const [pointer] = Array.from(activePhotoPointers.values())
      const rect = character.getBoundingClientRect()
      dragState = {
        offsetX: pointer.x - rect.left,
        offsetY: pointer.y - rect.top,
      }
      return
    }

    dragState = null
  }

  character.addEventListener('pointerup', endCharacterPointer)
  character.addEventListener('pointercancel', endCharacterPointer)

  switchButton.addEventListener('click', async () => {
    photoFacingMode = photoFacingMode === 'user' ? 'environment' : 'user'
    result.classList.add('is-hidden')
    page.classList.remove('is-captured')
    shareButton.classList.add('is-hidden')
    buyButton.classList.add('is-hidden')
    doodleButton.classList.add('is-hidden')
    captureButton.textContent = '合影留念'

    if (hint) {
      hint.textContent = '正在切换摄像头'
    }

    await startPhotoCamera()
  })

  captureButton.addEventListener('click', async () => {
    if (!result.classList.contains('is-hidden')) {
      result.classList.add('is-hidden')
      page.classList.remove('is-captured')
      shareButton.classList.add('is-hidden')
      buyButton.classList.add('is-hidden')
      doodleButton.classList.add('is-hidden')
      captureButton.textContent = '合影留念'

      if (hint) {
        hint.textContent = '拖动角色调整位置，双指缩放，点合影留念固定画面'
      }
      return
    }

    await capturePhoto()
  })

  shareButton.addEventListener('click', sharePhoto)

  buyButton.addEventListener('click', () => {
    showPurchaseModal()
  })

  doodleButton.addEventListener('click', openDoodleExperience)

  window.addEventListener('blindbox-start-photo', event => startPhotoMode(event.detail.card))
  window.addEventListener('resize', () => {
    if (!document.body.classList.contains('photo-active')) {
      return
    }

    placePhotoCharacter()
    drawPhotoCharacter()
  })
}

const bindEntryUi = () => {
  if (entryUiBound) {
    return
  }

  entryUiBound = true

  const {
    boxButton,
    doodleButton,
    buyButton: entryBuyButton,
    confirmButton,
    closeButton,
    cancelButton,
  } = getEntryNodes()
  const {toBoxButton, buyButton} = getDoodleNodes()
  const {modal: purchaseModal, closeButton: purchaseCloseButton} = getPurchaseNodes()

  boxButton?.addEventListener('click', () => showEntryConfirm('box'))
  doodleButton?.addEventListener('click', () => showEntryConfirm('doodle'))

  confirmButton?.addEventListener('click', () => {
    if (activeEntryChoice === 'box') {
      startArExperience()
      return
    }

    if (activeEntryChoice === 'doodle') {
      openDoodleExperience()
    }
  })

  cancelButton?.addEventListener('click', hideEntryConfirm)
  closeButton?.addEventListener('click', hideEntryConfirm)
  toBoxButton?.addEventListener('click', startArExperience)
  buyButton?.addEventListener('click', showPurchaseModal)
  entryBuyButton?.addEventListener('click', showPurchaseModal)
  purchaseCloseButton?.addEventListener('click', hidePurchaseModal)
  purchaseModal?.addEventListener('click', (event) => {
    if (event.target === purchaseModal) {
      hidePurchaseModal()
    }
  })
}

const onxrloaded = () => {
  xrReady = true
  bindPhotoUi()

  if (pendingStartAr) {
    startArExperience()
  }
}

bindEntryUi()
bindPhotoUi()
bindDoodleUi()
showCover()

window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)
