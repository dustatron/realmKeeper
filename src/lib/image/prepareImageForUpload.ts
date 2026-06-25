/**
 * Downscales/re-encodes an image so it fits under a byte budget before upload.
 *
 * Watabou map exports (and other hi-res PNGs) routinely exceed Cloudinary's 10 MB
 * free-tier cap. Maps are used as a backdrop whose coordinate space comes from the
 * stored GameMap.width/height — NOT the uploaded pixels — so shrinking the actual
 * image (aspect ratio preserved) does not affect POI placement.
 *
 * Returns the original file untouched if it already fits or if downscaling isn't
 * possible (e.g. SSR, decode failure); the caller still guards on the final size.
 */
const MAX_DIM_STEPS = [4096, 3072, 2048, 1536]

// Try lossless first (crisp line-art maps), then progressively smaller lossy encodings.
// Safari may not encode webp and falls back to png; the size check skips those.
const ENCODINGS: Array<[type: string, quality: number | undefined]> = [
  ['image/png', undefined],
  ['image/webp', 0.9],
  ['image/jpeg', 0.85],
  ['image/webp', 0.8],
  ['image/jpeg', 0.7],
]

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

function rename(name: string, type: string): string {
  const ext = type === 'image/png' ? 'png' : type === 'image/jpeg' ? 'jpg' : 'webp'
  return `${name.replace(/\.[^.]+$/, '')}.${ext}`
}

export async function prepareImageForUpload(file: File, maxBytes: number): Promise<File> {
  if (file.size <= maxBytes) return file
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  const { width, height } = bitmap
  const longest = Math.max(width, height)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close?.()
    return file
  }

  try {
    for (const maxDim of MAX_DIM_STEPS) {
      const scale = Math.min(1, maxDim / longest)
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const [type, quality] of ENCODINGS) {
        const blob = await toBlob(canvas, type, quality)
        if (blob && blob.type === type && blob.size <= maxBytes) {
          return new File([blob], rename(file.name, type), { type })
        }
      }
    }
  } finally {
    bitmap.close?.()
  }

  return file
}
