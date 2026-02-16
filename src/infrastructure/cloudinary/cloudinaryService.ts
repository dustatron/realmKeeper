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

export async function uploadImage(file: File): Promise<CloudinaryResult> {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary not configured')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${res.status}`)
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
