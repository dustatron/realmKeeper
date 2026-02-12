import type { RealmExport } from '@application/use-cases/ExportRealm'

export function downloadRealmExport(data: RealmExport) {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.realm.name.toLowerCase().replace(/\s+/g, '-')}-export.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function readImportFile(file: File): Promise<RealmExport> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as RealmExport
        if (!data.version || !data.realm) {
          reject(new Error('Invalid realm export file'))
          return
        }
        resolve(data)
      } catch {
        reject(new Error('Failed to parse file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
