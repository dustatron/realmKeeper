import { createFileRoute } from '@tanstack/react-router'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { useRealmMaps } from '~/ui/hooks/useGameMaps'
import { executeCreateGameMap } from '@application/use-cases/CreateGameMap'
import { EmptyState } from '~/components/shared/EmptyState'
import { MultiMapViewer } from '~/components/map/MultiMapViewer'
import { MapPinned } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/maps')({
  component: MapsPage,
})

function MapsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realmMaps = useRealmMaps(activeRealmId)
  const container = useContainer()

  const handleUpload = async (data: { name: string; imageUrl: string; width: number; height: number }) => {
    if (!activeRealmId) return
    await executeCreateGameMap(
      { ...data, ownerRealmId: activeRealmId },
      { gameMapRepo: container.gameMapRepo }
    )
  }

  if (!activeRealmId) {
    return (
      <EmptyState
        icon={MapPinned}
        title="No realm selected"
        description="Select a realm to manage maps"
      />
    )
  }

  return (
    <div className="-mx-4 -my-6 h-[calc(100vh-4rem)] min-h-0 overflow-hidden">
      <MultiMapViewer
        maps={realmMaps}
        onUpload={handleUpload}
        className="h-full"
        framed={false}
        emptyTitle="No realm map"
        emptyDescription="Upload a map image to get started"
      />
    </div>
  )
}
