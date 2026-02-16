import { cloudinaryUrl } from '@infrastructure/cloudinary/cloudinaryService'

interface CloudinaryImageProps {
  src: string | null
  alt: string
  width?: number
  height?: number
  className?: string
}

export function CloudinaryImage({ src, alt, width, height, className }: CloudinaryImageProps) {
  if (!src) return null

  const url = cloudinaryUrl(src, { width, height })
  if (!url) return null

  return <img src={url} alt={alt} className={className} />
}
