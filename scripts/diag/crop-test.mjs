import sharp from 'sharp'
const out = process.argv[2]
await sharp('assets/brand/brochure_page1.jpg')
  .extract({ left: 876, top: 478, width: 700, height: 155 })
  .trim({ threshold: 30 })
  .toFile(out + '/wordmark-crop.png')
const m = await sharp(out + '/wordmark-crop.png').metadata()
console.log('trimmed to', m.width, 'x', m.height)
