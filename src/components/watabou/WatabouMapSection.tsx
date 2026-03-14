import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Map, ExternalLink, Trash2, Copy, Upload } from 'lucide-react'
import { WatabouCityRenderer } from './WatabouCityRenderer'
import { WatabouDungeonRenderer } from './WatabouDungeonRenderer'
import { WatabouImportDialog } from './WatabouImportDialog'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import type { WatabouDungeonData } from '@domain/value-objects/WatabouDungeonData'

type WatabouData = WatabouCityData | WatabouDungeonData

interface WatabouMapSectionProps {
  data: WatabouData | null
  seed: string | null
  generator: 'mfcg' | 'opd'
  onImport: (data: WatabouData, seed: string | null) => void
  onClear: () => void
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

function getViewUrl(generator: 'mfcg' | 'opd', seed: string): string {
  if (generator === 'mfcg') {
    return `https://watabou.github.io/city-generator/?seed=${seed}`
  }
  return `https://watabou.github.io/one-page-dungeon/?seed=${seed}`
}

export function WatabouMapSection({ data, seed, generator, onImport, onClear }: WatabouMapSectionProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    const s = seed || generateSeed()
    const url = getGeneratorUrl(generator, s)
    window.open(url, '_blank')
    // Open import dialog so user can drop the downloaded file
    setImportOpen(true)
  }

  const handleCopySeed = () => {
    if (!seed) return
    navigator.clipboard.writeText(seed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const generatorLabel = generator === 'mfcg' ? 'City' : 'Dungeon'

  // No data — show generate/import controls
  if (!data) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Map className="size-4" />
            Watabou {generatorLabel} Map
          </h4>
        </div>
        <div className="border border-dashed rounded-lg p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Generate a {generatorLabel.toLowerCase()} map with Watabou, then import the JSON export.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleGenerate}>
              <ExternalLink className="mr-1.5 size-3.5" />
              Generate in Watabou
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-1.5 size-3.5" />
              Import JSON
            </Button>
          </div>
        </div>
        <WatabouImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImport={onImport}
          expectedGenerator={generator}
        />
      </div>
    )
  }

  // Data exists — render the SVG map
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Map className="size-4" />
          Watabou {generatorLabel} Map
        </h4>
        <div className="flex items-center gap-1">
          {seed && (
            <>
              <span className="text-xs text-muted-foreground font-mono mr-1">seed: {seed.slice(0, 12)}</span>
              <Button size="sm" variant="ghost" className="size-7 p-0" onClick={handleCopySeed} title="Copy seed">
                <Copy className={`size-3.5 ${copied ? 'text-green-500' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0"
                onClick={() => window.open(getViewUrl(generator, seed), '_blank')}
                title="Open in Watabou"
              >
                <ExternalLink className="size-3.5" />
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="size-7 p-0 text-muted-foreground hover:text-destructive" onClick={onClear} title="Clear map">
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden" style={{ height: 400 }}>
        {data.type === 'mfcg' ? (
          <WatabouCityRenderer data={data} className="w-full h-full" />
        ) : (
          <WatabouDungeonRenderer data={data} className="w-full h-full" />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="mr-1.5 size-3.5" />
          Re-import
        </Button>
        <Button size="sm" variant="outline" onClick={handleGenerate}>
          <ExternalLink className="mr-1.5 size-3.5" />
          Regenerate
        </Button>
      </div>

      <WatabouImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={onImport}
        expectedGenerator={generator}
      />
    </div>
  )
}
