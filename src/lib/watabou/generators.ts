export interface MapGeneratorLink {
  label: string
  url: string
}

/**
 * Watabou Arcana generators surfaced as "open generator → export PNG → upload" links.
 * These are image-based (we upload the exported PNG); City and One Page Dungeon also have
 * a separate interactive vector path on POIs (see the Generate tab in MapUploadDialog).
 */
export const IMAGE_MAP_GENERATORS: MapGeneratorLink[] = [
  { label: 'Region (Perilous Shores)', url: 'https://watabou.github.io/perilous-shores/' },
  { label: 'City', url: 'https://watabou.github.io/city-generator/' },
  { label: 'Village', url: 'https://watabou.github.io/village.html' },
  { label: 'Cave', url: 'https://watabou.github.io/cave.html' },
  { label: 'Dwelling (building)', url: 'https://watabou.github.io/dwelling.html' },
]
