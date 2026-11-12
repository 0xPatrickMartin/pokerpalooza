/** Loads a picked file. The caller owns `img.src` (an object URL) and should revoke it when done. */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('This browser could not read that image. Try a JPG or PNG.'))
    }
    img.src = url
  })
}

/** Square crop in the image's natural pixel coordinates. */
export interface CropRect {
  x: number
  y: number
  size: number
}

/**
 * Approximates a chip's base color from the ring between its inlay and edge.
 * Uses the middle half of pixels by brightness so white edge spots and glare don't skew it.
 */
export function sampleRingColor(img: HTMLImageElement, crop: CropRect): string {
  const n = 48
  const canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = n
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#7a1f1f'
  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, n, n)
  const { data } = ctx.getImageData(0, 0, n, n)

  const ring: [number, number, number][] = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const r = Math.hypot((x + 0.5) / n - 0.5, (y + 0.5) / n - 0.5) * 2
      if (r < 0.62 || r > 0.92) continue
      const i = (y * n + x) * 4
      ring.push([data[i], data[i + 1], data[i + 2]])
    }
  }
  const lum = ([r, g, b]: [number, number, number]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
  ring.sort((a, b) => lum(a) - lum(b))
  const middle = ring.slice(Math.floor(ring.length * 0.25), Math.ceil(ring.length * 0.75))
  const avg = [0, 1, 2].map((c) => Math.round(middle.reduce((sum, px) => sum + px[c], 0) / middle.length))
  return `#${avg.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Renders the crop to a small JPEG so a handful of chip photos fit in localStorage. */
export function cropToDataUrl(img: HTMLImageElement, crop: CropRect, outputSize = 320): string {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')
  ctx.fillStyle = '#120a05'
  ctx.fillRect(0, 0, outputSize, outputSize)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, crop.x, crop.y, crop.size, crop.size, 0, 0, outputSize, outputSize)
  return canvas.toDataURL('image/jpeg', 0.86)
}
