// Browsable TableDefs for the ruin/landmark generator flavor content.
//
// These are a thin VIEW over the canonical string arrays in
// `~/lib/worldgen/siteHistory`, `./ruin-tables`, and `./landmark-tables` — the
// generators read the arrays directly, while these defs expose the same content
// in the in-app table browser (single source: edit the arrays, both update).
import type { TableDef, TableSet } from '@domain/entities/TableDef'
import {
  BUILDER_CULTURES,
  ERAS,
  FATES,
  OCCUPANT_ACTIVITIES,
} from '~/lib/worldgen/siteHistory'
import {
  RUIN_PURPOSES,
  RUIN_AREA_NAMES,
  RUIN_AREA_READALOUD,
  RUIN_AREA_DETAILS,
  RUIN_DISCOVERIES,
  RUIN_FAILED_PARTY_DISCOVERY,
  RUIN_HOOKS,
} from './ruin-tables'
import {
  LANDMARK_LEGENDS,
  LANDMARK_TRUTHS,
  LANDMARK_SECRETS,
  LANDMARK_TRIGGERS,
  LANDMARK_EFFECTS,
  LANDMARK_QUEST_HOOKS,
} from './landmark-tables'

const RUIN_SET_ID = 'tableset-rk-ruins'
const LANDMARK_SET_ID = 'tableset-rk-landmarks'

function entries(items: readonly string[]) {
  return items.map((text, i) => ({ min: i + 1, max: i + 1, text }))
}

function def(
  id: string,
  setId: string,
  name: string,
  tags: string[],
  items: readonly string[],
): TableDef {
  return {
    id,
    setId,
    name,
    diceFormula: `1d${items.length}`,
    entries: entries(items),
    tags,
    systemId: null, // system-agnostic flavor
  }
}

export const ruinLandmarkTableSets: TableSet[] = [
  {
    id: RUIN_SET_ID,
    name: 'Ruins & Ancient History',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [
      'table-rk-ruin-purpose',
      'table-rk-ruin-area-name',
      'table-rk-ruin-area-readaloud',
      'table-rk-ruin-area-detail',
      'table-rk-ruin-discovery',
      'table-rk-ruin-failed-party',
      'table-rk-ruin-hook',
      'table-rk-builder-culture',
      'table-rk-era',
      'table-rk-fate',
      'table-rk-occupant-activity',
    ],
  },
  {
    id: LANDMARK_SET_ID,
    name: 'Landmarks & Wonders',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [
      'table-rk-landmark-legend',
      'table-rk-landmark-truth',
      'table-rk-landmark-secret',
      'table-rk-landmark-trigger',
      'table-rk-landmark-effect',
      'table-rk-landmark-quest-hook',
    ],
  },
]

export const ruinLandmarkTableDefs: TableDef[] = [
  // Ruins & Ancient History
  def('table-rk-ruin-purpose', RUIN_SET_ID, 'Ruin: What Was It', ['ruin', 'history'], RUIN_PURPOSES),
  def('table-rk-ruin-area-name', RUIN_SET_ID, 'Ruin: Area Name', ['ruin', 'area'], RUIN_AREA_NAMES),
  def('table-rk-ruin-area-readaloud', RUIN_SET_ID, 'Ruin: Area Read-Aloud', ['ruin', 'area', 'read-aloud'], RUIN_AREA_READALOUD),
  def('table-rk-ruin-area-detail', RUIN_SET_ID, 'Ruin: Area Detail / Hazard', ['ruin', 'area', 'hazard'], RUIN_AREA_DETAILS),
  def('table-rk-ruin-discovery', RUIN_SET_ID, 'Ruin: Discovery', ['ruin', 'discovery'], RUIN_DISCOVERIES),
  def('table-rk-ruin-failed-party', RUIN_SET_ID, 'Ruin: Failed Party Remains', ['ruin', 'discovery'], RUIN_FAILED_PARTY_DISCOVERY),
  def('table-rk-ruin-hook', RUIN_SET_ID, 'Ruin: Hook (templated)', ['ruin', 'hook'], RUIN_HOOKS),
  def('table-rk-builder-culture', RUIN_SET_ID, 'Builder Culture', ['ruin', 'history'], BUILDER_CULTURES),
  def('table-rk-era', RUIN_SET_ID, 'Era', ['ruin', 'history'], ERAS),
  def('table-rk-fate', RUIN_SET_ID, 'Fate (How It Fell)', ['ruin', 'history'], FATES),
  def('table-rk-occupant-activity', RUIN_SET_ID, 'Occupant Activity', ['ruin', 'occupant'], OCCUPANT_ACTIVITIES),
  // Landmarks & Wonders
  def('table-rk-landmark-legend', LANDMARK_SET_ID, 'Landmark: Legend', ['landmark', 'legend'], LANDMARK_LEGENDS),
  def('table-rk-landmark-truth', LANDMARK_SET_ID, 'Landmark: Truth', ['landmark', 'truth'], LANDMARK_TRUTHS),
  def('table-rk-landmark-secret', LANDMARK_SET_ID, 'Landmark: Secret', ['landmark', 'secret'], LANDMARK_SECRETS),
  def('table-rk-landmark-trigger', LANDMARK_SET_ID, 'Landmark: Interaction Trigger', ['landmark', 'interaction'], LANDMARK_TRIGGERS),
  def('table-rk-landmark-effect', LANDMARK_SET_ID, 'Landmark: Interaction Effect', ['landmark', 'interaction'], LANDMARK_EFFECTS),
  def('table-rk-landmark-quest-hook', LANDMARK_SET_ID, 'Landmark: Quest Hook', ['landmark', 'hook'], LANDMARK_QUEST_HOOKS),
]
