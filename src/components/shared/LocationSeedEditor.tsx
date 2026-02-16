import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import type { PoiType } from '@shared/constants'

interface LocationSeedEditorProps {
  seed: LocationSeed | null
  poiType: PoiType
  onChange: (seed: LocationSeed) => void
  readOnly?: boolean
}

interface FieldDef {
  key: keyof LocationSeed
  label: string
  placeholder: string
}

const constructedFields: FieldDef[] = [
  { key: 'purpose', label: 'Purpose', placeholder: 'What was this place originally?' },
  { key: 'creator', label: 'Creator', placeholder: 'Who built or established it?' },
  { key: 'entrance', label: 'Entrance', placeholder: 'How do you get inside?' },
  { key: 'composition', label: 'Composition', placeholder: 'What is it made of?' },
  { key: 'condition', label: 'Condition', placeholder: 'What state is it in now?' },
  { key: 'ruinCause', label: 'Ruin Cause', placeholder: 'What caused its downfall?' },
]

const natureFields: FieldDef[] = [
  { key: 'ecology', label: 'Ecology', placeholder: 'What lives here? What grows?' },
  { key: 'terrain', label: 'Terrain', placeholder: 'What does the landscape look like?' },
  { key: 'hazards', label: 'Hazards', placeholder: 'What dangers exist naturally?' },
  { key: 'resources', label: 'Resources', placeholder: 'What can be harvested or found?' },
]

const universalFields: FieldDef[] = [
  { key: 'lore', label: 'Lore', placeholder: 'What do locals say about this place?' },
  { key: 'secret', label: 'Secret', placeholder: 'What truth is hidden here?' },
]

function getFieldsForType(poiType: PoiType): FieldDef[] {
  switch (poiType) {
    case 'ruin':
    case 'dungeon':
    case 'fortification':
      return [...constructedFields, ...universalFields]
    case 'natural':
    case 'landmark':
    case 'shrine':
      return [...natureFields, ...universalFields]
    case 'camp':
      return [
        constructedFields[0], // purpose
        constructedFields[1], // creator
        ...natureFields,
        ...universalFields,
      ]
    default:
      return [...universalFields]
  }
}

export function LocationSeedEditor({ seed, poiType, onChange, readOnly }: LocationSeedEditorProps) {
  const fields = getFieldsForType(poiType)
  const current = seed ?? {}

  const handleChange = (key: keyof LocationSeed, value: string) => {
    onChange({ ...current, [key]: value || undefined })
  }

  return (
    <details className="rounded-md border p-3">
      <summary className="text-sm font-medium cursor-pointer">Location Seed</summary>
      <div className="space-y-3 mt-3">
        {fields.map((field) => (
          <div key={field.key} className="space-y-1">
            <Label className="text-xs">{field.label}</Label>
            {readOnly ? (
              <p className="text-sm text-muted-foreground">
                {current[field.key] || <span className="italic">—</span>}
              </p>
            ) : (
              <Input
                value={current[field.key] ?? ''}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="h-8 text-sm"
              />
            )}
          </div>
        ))}
      </div>
    </details>
  )
}
