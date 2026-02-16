import { useState, useCallback } from 'react'
import { uploadImage, isCloudinaryConfigured } from '@infrastructure/cloudinary/cloudinaryService'

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<string> => {
    setError(null)

    if (!isCloudinaryConfigured()) {
      // Fallback: base64 data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
    }

    setUploading(true)
    try {
      const result = await uploadImage(file)
      return result.secure_url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setError(msg)
      throw err
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, error }
}
