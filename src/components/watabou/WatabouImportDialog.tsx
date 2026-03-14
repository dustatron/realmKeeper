import { useState, useCallback, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Upload, FileJson, AlertCircle } from 'lucide-react'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import type { WatabouDungeonData } from '@domain/value-objects/WatabouDungeonData'

type WatabouData = WatabouCityData | WatabouDungeonData

interface WatabouImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: WatabouData, seed: string | null) => void
  expectedGenerator?: 'mfcg' | 'opd' | null
}

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
      // Extract metadata from first feature if it has properties with known MFCG keys
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

export function WatabouImportDialog({ open, onOpenChange, onImport, expectedGenerator }: WatabouImportDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string)
        const result = detectFormat(json)
        if ('error' in result) {
          setError(result.error)
          return
        }
        // Warn if format doesn't match expected generator
        if (expectedGenerator) {
          const detected = result.data.type
          if (expectedGenerator === 'mfcg' && detected !== 'mfcg') {
            setError('Expected city map (MFCG) but got dungeon data. Import anyway by re-clicking.')
          }
          if (expectedGenerator === 'opd' && detected !== 'opd') {
            setError('Expected dungeon map (OPD) but got city data. Import anyway by re-clicking.')
          }
        }
        onImport(result.data, result.seed)
        onOpenChange(false)
      } catch {
        setError('Failed to parse JSON file.')
      }
    }
    reader.readAsText(file)
  }, [onImport, onOpenChange, expectedGenerator])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Watabou Map</DialogTitle>
        </DialogHeader>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <FileJson className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drop JSON file here or click to browse</p>
            <p className="text-xs text-muted-foreground">
              Supports MFCG (city) and One Page Dungeon exports
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
