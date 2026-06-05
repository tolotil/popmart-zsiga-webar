const PRIZE_BASE_PATH = 'assets/prizes'

const PRIZE_CARDS = [
  {id: '01', name: '紫火 Purple Fire', cardImage: `${PRIZE_BASE_PATH}/card-01.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-01.webp`},
  {id: '02', name: '赤火 Red Fire', cardImage: `${PRIZE_BASE_PATH}/card-02.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-02.webp`},
  {id: '03', name: '荧火 Yellow Fire', cardImage: `${PRIZE_BASE_PATH}/card-03.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-03.webp`},
  {id: '04', name: '薪火 Brown Fire', cardImage: `${PRIZE_BASE_PATH}/card-04.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-04.webp`},
  {id: '05', name: '墨火 Ink Fire', cardImage: `${PRIZE_BASE_PATH}/card-05.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-05.webp`},
  {id: '06', name: '绿火 Green Fire', cardImage: `${PRIZE_BASE_PATH}/card-06.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-06.webp`},
  {id: '07', name: '碧火 Lake Blue Fire', cardImage: `${PRIZE_BASE_PATH}/card-07.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-07.webp`},
  {id: '08', name: '蓝火 Blue Fire', cardImage: `${PRIZE_BASE_PATH}/card-08.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-08.webp`},
  {id: '09', name: '爱火 Love Fire', cardImage: `${PRIZE_BASE_PATH}/card-09.jpg`, characterImage: `${PRIZE_BASE_PATH}/character-09.webp`},
]

const imageCache = new Map()

const loadImage = (src) => {
  if (imageCache.has(src)) {
    return imageCache.get(src)
  }

  const promise = new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })

  imageCache.set(src, promise)
  return promise
}

const createPrizeCardTexture = (THREE, card) => {
  const texture = new THREE.TextureLoader().load(card.cardImage)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

const drawPrizeCharacter = async (ctx, card, x, y, width, height, options = {}) => {
  const {shadow = true} = options
  const character = await loadImage(card.characterImage)
  const scale = Math.min(width / character.naturalWidth, height / character.naturalHeight)
  const drawWidth = character.naturalWidth * scale
  const drawHeight = character.naturalHeight * scale
  const drawX = x + (width - drawWidth) / 2
  const drawY = y + (height - drawHeight) / 2

  ctx.save()

  if (shadow) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)'
    ctx.beginPath()
    ctx.ellipse(
      x + width / 2,
      y + height * 0.9,
      width * 0.24,
      height * 0.04,
      0,
      0,
      Math.PI * 2
    )
    ctx.fill()
  }

  ctx.drawImage(character, drawX, drawY, drawWidth, drawHeight)
  ctx.restore()
}

const preloadPrizeCharacter = (card) => loadImage(card.characterImage)

export {
  PRIZE_CARDS,
  drawPrizeCharacter,
  createPrizeCardTexture,
  preloadPrizeCharacter,
}
