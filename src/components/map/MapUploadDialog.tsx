import { useState, useRef, type ReactNode } from 'react'
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
import { ImagePlus, Loader2, ExternalLink } from 'lucide-react'
import { useImageUpload } from '~/ui/hooks/useImageUpload'
import type { MapGeneratorLink } from '~/lib/watabou/generators'

interface MapUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (data: { name: string; imageUrl: string; width: number; height: number }) => void
  defaultName?: string
  /** Shows "generate a map" helper links above the image picker (open a Watabou generator, export PNG, upload). */
  imageGenerators?: MapGeneratorLink[]
  /** Optional actions shown above the upload form. */
  actions?: ReactNode
}

export function MapUploadDialog({
  open,
  onOpenChange,
  onUpload,
  defaultName = '',
  imageGenerators,
  actions,
}: MapUploadDialogProps) {
  const [name, setName] = useState(defaultName)
  const [file, setFile] = useState<File | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, error } = useImageUpload()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    const url = URL.createObjectURL(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(url)
    setFile(f)

    const img = new Image()
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.src = url

    if (!name) {
      const stem = f.name.replace(/\.[^.]+$/, '')
      setName(stem)
    }
  }

  const handleSubmit = async () => {
    if (!file || !dimensions || !name.trim()) return
    const imageUrl = await upload(file)
    onUpload({ name: name.trim(), imageUrl, ...dimensions })
    setName('')
    setFile(null)
    setDimensions(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onOpenChange(false)
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
      setFile(null)
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
          {actions && (
            <div className="rounded-md border bg-muted/40 p-3">
              {actions}
            </div>
          )}
          {imageGenerators && imageGenerators.length > 0 && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3">
              <p className="text-sm font-medium">Need a map?</p>
              <p className="text-xs text-muted-foreground">
                Generate one in a Watabou generator, export it as a PNG, then upload it below.
              </p>
              <div className="flex flex-wrap gap-2">
                {imageGenerators.map((g) => (
                  <Button
                    key={g.url}
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(g.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="mr-1.5 size-3.5" />
                    {g.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
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
                  className="max-h-48 w-full rounded-md border bg-muted object-contain"
                />
                <div className="text-xs text-muted-foreground">
                  {dimensions?.width} × {dimensions?.height}px
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Choose Different Image
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 flex h-32 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <ImagePlus className="size-8" />
                <span className="text-sm">Click to select an image</span>
              </button>
            )}
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!file || !name.trim() || uploading}>
              {uploading ? <><Loader2 className="mr-2 size-4 animate-spin" />Uploading…</> : 'Upload'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
