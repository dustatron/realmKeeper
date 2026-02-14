import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'

export interface DeletePOICascadeInfo {
  childPois: { id: string; name: string }[]
  npcsAtPoi: { id: string; name: string }[]
  factionPresences: { id: string; factionId: string }[]
  paths: { id: string; name: string }[]
  poiEvents: { id: string; name: string }[]
}

export interface DeletePOIWithChildrenDeps {
  poiRepo: IPOIRepository
  npcRepo: INPCRepository
  pathRepo: IPathRepository
  factionPresenceRepo: IFactionPresenceRepository
  poiEventRepo: IPOIEventRepository
}

/** Get cascade info (for showing in modal before confirming) */
export async function getDeletePOICascadeInfo(
  poiId: string,
  deps: DeletePOIWithChildrenDeps
): Promise<DeletePOICascadeInfo> {
  const [children, npcs, presences, paths, events] = await Promise.all([
    deps.poiRepo.getChildren(poiId),
    deps.npcRepo.getByPoiId(poiId),
    deps.factionPresenceRepo.getByPoiId(poiId),
    deps.pathRepo.getByPoi(poiId),
    deps.poiEventRepo.getByPoiId(poiId),
  ])

  return {
    childPois: children.map((p) => ({ id: p.id, name: p.name })),
    npcsAtPoi: npcs.map((n) => ({ id: n.id, name: n.name })),
    factionPresences: presences.map((fp) => ({ id: fp.id, factionId: fp.factionId })),
    paths: paths.map((p) => ({ id: p.id, name: p.name })),
    poiEvents: events.map((e) => ({ id: e.id, name: e.name })),
  }
}

/** Execute deletion with selected cascade targets */
export async function executeDeletePOIWithChildren(
  poiId: string,
  childPoiIdsToDelete: string[],
  deps: DeletePOIWithChildrenDeps
): Promise<void> {
  // Delete selected children (recursively)
  for (const childId of childPoiIdsToDelete) {
    const grandchildren = await deps.poiRepo.getChildren(childId)
    await executeDeletePOIWithChildren(
      childId,
      grandchildren.map((c) => c.id),
      deps
    )
  }

  // Unlink NPCs (set poiId to null)
  const npcs = await deps.npcRepo.getByPoiId(poiId)
  for (const npc of npcs) {
    await deps.npcRepo.update({ ...npc, poiId: null, updatedAt: Date.now() } as Parameters<typeof deps.npcRepo.update>[0])
  }

  // Delete faction presences
  const presences = await deps.factionPresenceRepo.getByPoiId(poiId)
  for (const p of presences) {
    await deps.factionPresenceRepo.delete(p.id)
  }

  // Delete paths
  const paths = await deps.pathRepo.getByPoi(poiId)
  for (const p of paths) {
    await deps.pathRepo.delete(p.id)
  }

  // Delete POI events
  const events = await deps.poiEventRepo.getByPoiId(poiId)
  for (const e of events) {
    await deps.poiEventRepo.delete(e.id)
  }

  // Delete the POI itself
  await deps.poiRepo.delete(poiId)
}
