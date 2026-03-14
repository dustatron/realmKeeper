import { useState, useRef, useCallback } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { ImagePlus, Loader2, ExternalLink, FileJson, AlertCircle } from 'lucide-react'
import { useImageUpload } from '~/ui/hooks/useImageUpload'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import type { WatabouDungeonData } from '@domain/value-objects/WatabouDungeonData'

type WatabouData = WatabouCityData | WatabouDungeonData

function detectFormat(json: unknown): { data: WatabouData; seed: string | null } | { error: string } {
  if (!json || typeof json !== 'object') return { error: 'Invalid JSON' }

  const obj = json as Record<string, unknown>

  // OPD format: has rects array
  if (Array.isArray(obj.rects)) {
    const data: WatabouDungeonData = {
      type: 'opd',
      rects: obj.rects as WatabouDungeonData['rects'],
      doors: Array.isArray(obj.doors) ? obj.doors as WatabouDungeonData['doors'] : [],
      columns: Array.isArray(obj.columns) ? obj.columns as WatabouDungeonData['columns'] : [],
      water: Array.isArray(obj.water) ? obj.water : [],
      notes: Array.isArray(obj.notes) ? obj.notes as WatabouDungeonData['notes'] : [],
      version: typeof obj.version === 'number' ? obj.version : undefined,
      seed: typeof obj.seed === 'string' ? obj.seed : undefined,
    }
    return { data, seed: data.seed ?? null }
  }

  // MFCG GeoJSON format: has features array with type=Feature entries
  if (Array.isArray(obj.features) && obj.features.length > 0) {
    const features = obj.features as Array<Record<string, unknown>>
    const isGeoJSON = features.some(f => f.type === 'Feature' && f.geometry)
    if (isGeoJSON) {
      let metadata: WatabouCityData['metadata']
      const first = features[0]?.properties as Record<string, unknown> | undefined
      if (first) {
        metadata = {
          roadWidth: typeof first.roadWidth === 'number' ? first.roadWidth : undefined,
          towerRadius: typeof first.towerRadius === 'number' ? first.towerRadius : undefined,
          wallThickness: typeof first.wallThickness === 'number' ? first.wallThickness : undefined,
          riverWidth: typeof first.riverWidth === 'number' ? first.riverWidth : undefined,
          version: typeof first.version === 'number' ? first.version : undefined,
        }
      }
      const seed = typeof (first?.seed) === 'string' ? first.seed as string
        : typeof obj.seed === 'string' ? obj.seed as string
        : null
      const data: WatabouCityData = {
        type: 'mfcg',
        features: obj.features as WatabouCityData['features'],
        metadata,
      }
      return { data, seed }
    }
  }

  return { error: 'Unrecognized format. Expected MFCG GeoJSON or One Page Dungeon JSON.' }
}

function generateSeed() {
  return Math.floor(Math.random() * 1000000000).toString()
}

function getGeneratorUrl(generator: 'mfcg' | 'opd', seed: string): string {
  if (generator === 'mfcg') {
    return `https://watabou.github.io/city-generator/?seed=${seed}&export=json`
  }
  return `https://watabou.github.io/one-page-dungeon/?seed=${seed}&export=json`
}

interface MapUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (data: { name: string; imageUrl: string; width: number; height: number }) => void
  defaultName?: string
  generator?: 'mfcg' | 'opd' | null
  onWatabouImport?: (data: WatabouData, seed: string | null) => void
  existingWatabouData?: WatabouData | null
  existingSeed?: string | null
}

export function MapUploadDialog({
  open,
  onOpenChange,
  onUpload,
  defaultName = '',
  generator,
  onWatabouImport,
  existingWatabouData,
  existingSeed,
}: MapUploadDialogProps) {
  const [name, setName] = useState(defaultName)
  const [file, setFile] = useState<File | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, error } = useImageUpload()

  // Generate tab state
  const [seed, setSeed] = useState(existingSeed ?? '')
  const [importError, setImportError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const jsonFileRef = useRef<HTMLInputElement>(null)

  const hasGenerateTab = !!generator && !!onWatabouImport

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
      setImportError(null)
      setDragOver(false)
    }
    onOpenChange(open)
  }

  // Generate tab handlers
  const processJsonFile = useCallback((file: File) => {
    if (!onWatabouImport || !generator) return
    setImportError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        const result = detectFormat(json)
        if ('error' in result) {
          setImportError(result.error)
          return
        }
        if (generator === 'mfcg' && result.data.type !== 'mfcg') {
          setImportError('Expected city map (MFCG) but got dungeon data.')
          return
        }
        if (generator === 'opd' && result.data.type !== 'opd') {
          setImportError('Expected dungeon map (OPD) but got city data.')
          return
        }
        onWatabouImport(result.data, result.seed)
        onOpenChange(false)
      } catch {
        setImportError('Failed to parse JSON file.')
      }
    }
    reader.readAsText(file)
  }, [onWatabouImport, generator, onOpenChange])

  const handleJsonDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processJsonFile(file)
  }, [processJsonFile])

  const handleJsonFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processJsonFile(file)
  }, [processJsonFile])

  const handleOpenWatabou = () => {
    const s = seed || generateSeed()
    if (!seed) setSeed(s)
    window.open(getGeneratorUrl(generator!, s), '_blank')
  }

  const generatorLabel = generator === 'mfcg' ? 'City' : 'Dungeon'

  const uploadContent = (
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
              disabled={uploading}
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
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
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
  )

  const generateContent = hasGenerateTab ? (
    <div className="space-y-4">
      <div>
        <Label htmlFor="watabou-seed">Seed (optional)</Label>
        <Input
          id="watabou-seed"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          placeholder="Leave empty for random"
          className="font-mono"
        />
      </div>

      <Button size="sm" onClick={handleOpenWatabou} className="w-full">
        <ExternalLink className="mr-1.5 size-3.5" />
        Open in Watabou ({generatorLabel})
      </Button>

      <div className="text-xs text-muted-foreground text-center">
        Export JSON from Watabou, then import it below
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleJsonDrop}
        onClick={() => jsonFileRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <FileJson className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drop JSON file here or click to browse</p>
        </div>
        <input
          ref={jsonFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleJsonFileChange}
        />
      </div>

      {importError && (
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{importError}</span>
        </div>
      )}

      {existingWatabouData && (
        <p className="text-xs text-muted-foreground text-center">
          A Watabou map is already imported. Importing again will replace it.
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => handleClose(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </div>
  ) : null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasGenerateTab ? 'Add Map' : 'Upload Map Image'}</DialogTitle>
        </DialogHeader>
        {hasGenerateTab ? (
          <Tabs defaultValue="upload">
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1">Upload</TabsTrigger>
              <TabsTrigger value="generate" className="flex-1">Generate</TabsTrigger>
            </TabsList>
            <TabsContent value="upload" className="pt-3">
              {uploadContent}
            </TabsContent>
            <TabsContent value="generate" className="pt-3">
              {generateContent}
            </TabsContent>
          </Tabs>
        ) : (
          uploadContent
        )}
      </DialogContent>
    </Dialog>
  )
}
