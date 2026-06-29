import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld, type GenerateWorldDeps } from './GenerateWorld'

// Determinism guard for the central-table-source migration. Captures a
// timestamp/id-free TEXT fingerprint of a generated world for fixed seeds. The
// migration routes generators through the table provider; with an empty Dexie
// (static-only registry) the provider must reproduce the literal arrays in the
// same order, so this fingerprint must stay byte-identical across the migration.
const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.worlds.clear(), db.gameMaps.clear(), db.factions.clear(), db.factionPresences.clear(),
    db.factionRelationships.clear(), db.npcs.clear(), db.connections.clear(), db.hooks.clear(),
    db.notices.clear(), db.rumors.clear(), db.worldEvents.clear(), db.poiEvents.clear(),
    db.regions.clear(), db.pois.clear(), db.paths.clear(), db.tableDefs.clear(),
  ])
  await db.systemConfigs.put(cairnSystemConfig)
})

const deps = (): GenerateWorldDeps => ({
  realmRepo: container.realmRepo,
  regionRepo: container.regionRepo,
  factionRepo: container.factionRepo,
  realmNoteRepo: container.realmNoteRepo,
  poiRepo: container.poiRepo,
  npcRepo: container.npcRepo,
  pathRepo: container.pathRepo,
  factionPresenceRepo: container.factionPresenceRepo,
  poiEventRepo: container.poiEventRepo,
  hookRepo: container.hookRepo,
  rumorRepo: container.rumorRepo,
  noticeRepo: container.noticeRepo,
  tableRepo: container.tableRepo,
})

// Fingerprints only the DETERMINISTIC core world (regions, factions, and
// settlement/portal POIs) — the output of the seeded main generation pass that
// this PR's migrated generators (region names/flavor, faction names, settlement
// names, portal names) feed. Post-transaction pregen (dungeon/ruin/landmark
// monsters, treasure-lead rewards) is intentionally excluded: it's seeded by
// ULID stub ids and so varies run-to-run, unrelated to the table migration.
async function fingerprint(realmId: string): Promise<string> {
  const regions = await db.regions.where('worldId').equals(realmId).toArray()
  const regionIds = new Set(regions.map((r) => r.id))
  const pois = (await db.pois.toArray()).filter(
    (p) => regionIds.has(p.regionId) && (p.type === 'settlement' || p.type === 'portal'),
  )
  const factions = await db.factions.where('worldId').equals(realmId).toArray()

  const lines: string[] = []
  for (const r of regions) {
    lines.push(`REGION ${r.terrain} | ${r.name} | ${r.problem} | ${r.people} | ${r.resources}`)
    lines.push(`  features: ${r.features.join(', ')}`)
    lines.push(`  dangers: ${r.dangers.join(', ')}`)
  }
  for (const p of pois) lines.push(`POI ${p.type}/${p.subtypeLabel ?? ''} | ${p.name}`)
  for (const f of factions) lines.push(`FACTION | ${f.name}`)
  // Sort so the fingerprint is independent of IndexedDB key (ULID) ordering,
  // which varies run-to-run; we are guarding text content, not row order.
  return lines.sort().join('\n')
}

describe('generateWorld determinism fingerprint', () => {
  it('small seed=gold-small is stable', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Gold', systemId: 'system-cairn-2e', seed: 'gold-small', size: 'small' },
      deps(),
    )
    expect(await fingerprint(realmId)).toMatchSnapshot()
  })

  it('medium seed=gold-medium is stable', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Gold', systemId: 'system-cairn-2e', seed: 'gold-medium', size: 'medium' },
      deps(),
    )
    expect(await fingerprint(realmId)).toMatchSnapshot()
  })
})
