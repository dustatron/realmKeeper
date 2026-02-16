import { useRef } from 'react'
import { useImageUpload } from '~/ui/hooks/useImageUpload'
import { Button } from '~/components/ui/button'
import { ImageIcon, X, Loader2 } from 'lucide-react'

interface ImagePickerProps {
  imageUrl: string | null
  onImageChange: (url: string | null) => void
  label?: string
}

export function ImagePicker({ imageUrl, onImageChange, label = 'Image' }: ImagePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, error } = useImageUpload()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const url = await upload(file)
      onImageChange(url)
    } catch {
      // error state handled by hook
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {imageUrl ? (
        <div className="relative inline-block">
          <img
            src={imageUrl}
            alt={label}
            className="max-h-40 rounded-md border object-cover"
          />
          <div className="absolute top-1 right-1 flex gap-1">
            <Button
              size="icon"
              variant="secondary"
              className="size-6"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="size-3 animate-spin" /> : <ImageIcon className="size-3" />}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="size-6"
              onClick={() => onImageChange(null)}
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <ImageIcon className="mr-1.5 size-3.5" />
          )}
          {uploading ? 'Uploading...' : `Add ${label}`}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
