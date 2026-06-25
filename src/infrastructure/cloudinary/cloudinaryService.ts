import { prepareImageForUpload } from '~/lib/image/prepareImageForUpload'

const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export interface CloudinaryResult {
  secure_url: string
  public_id: string
  width: number
  height: number
}

export function isCloudinaryConfigured(): boolean {
  return !!(cloudName && uploadPreset)
}

// Cloudinary's free tier rejects images over 10 MB with a 400. Guard client-side
// so large Watabou exports (hi-res PNG / heavy SVG) fail with a clear, actionable message.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export async function uploadImage(file: File): Promise<CloudinaryResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary not configured')
  }

  // Auto-downscale oversized exports (e.g. Watabou map PNGs) to fit Cloudinary's cap.
  // Aim just under the limit so exact-byte accounting on Cloudinary's side still passes.
  const prepared = await prepareImageForUpload(file, MAX_UPLOAD_BYTES - 512 * 1024)

  if (prepared.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Image is too large (${mb(prepared.size)}) and couldn't be shrunk below ${mb(MAX_UPLOAD_BYTES)}. ` +
        `Try exporting it at a lower resolution.`
    )
  }

  const formData = new FormData()
  formData.append('file', prepared)
  formData.append('upload_preset', uploadPreset)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    // Surface Cloudinary's actual error message instead of a bare status code.
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error?.message ? `: ${body.error.message}` : ''
    } catch {
      // non-JSON body — keep the status only
    }
    throw new Error(`Cloudinary upload failed (${res.status})${detail}`)
  }

  return res.json()
}

export function cloudinaryUrl(
  url: string | null,
  opts?: { width?: number; height?: number }
): string | null {
  if (!url) return null
  // Pass through non-Cloudinary URLs (base64 data URLs, etc.)
  if (!url.includes('res.cloudinary.com')) return url
  if (!opts?.width && !opts?.height) return url

  // Insert transformation before /upload/
  const parts = url.split('/upload/')
  if (parts.length !== 2) return url

  const transforms: string[] = []
  if (opts.width) transforms.push(`w_${opts.width}`)
  if (opts.height) transforms.push(`h_${opts.height}`)
  transforms.push('c_fill', 'q_auto', 'f_auto')

  return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`
}
