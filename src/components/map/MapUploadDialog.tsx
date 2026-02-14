import { useState, useRef } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { ImagePlus } from 'lucide-react'

interface MapUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (data: { name: string; imageBlob: Blob; width: number; height: number }) => void
  defaultName?: string
}

export function MapUploadDialog({
  open,
  onOpenChange,
  onUpload,
  defaultName = '',
}: MapUploadDialogProps) {
  const [name, setName] = useState(defaultName)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create preview
    const url = URL.createObjectURL(file)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setImageBlob(file)

    // Get dimensions
    const img = new Image()
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = url

    // Default name from filename if empty
    if (!name) {
      const stem = file.name.replace(/\.[^.]+$/, '')
      setName(stem)
    }
  }

  const handleSubmit = () => {
    if (!imageBlob || !dimensions || !name.trim()) return
    onUpload({ name: name.trim(), imageBlob, ...dimensions })
    // Reset
    setName('')
    setImageBlob(null)
    setDimensions(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onOpenChange(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setImageBlob(null)
      setDimensions(null)
      setName(defaultName)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Map Image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="map-name">Map Name *</Label>
            <Input
              id="map-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., World Map, Tavern Floor 1"
            />
          </div>
          <div>
            <Label>Image *</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {previewUrl ? (
              <div className="mt-2 space-y-2">
                <img
                  src={previewUrl}
                  alt="Map preview"
                  className="w-full max-h-48 object-contain rounded-md border bg-muted"
                />
                <div className="text-xs text-muted-foreground">
                  {dimensions?.width} × {dimensions?.height}px
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Different Image
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 w-full h-32 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="size-8" />
                <span className="text-sm">Click to select an image</span>
              </button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!imageBlob || !name.trim()}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
