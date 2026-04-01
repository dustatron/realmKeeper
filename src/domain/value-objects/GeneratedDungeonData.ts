import type { DungeonTheme, DungeonSize, SpatialDungeon, DungeonGenerationConfig, ResolvedDungeonConfig } from '@generators/dungeon/index'

export type { DungeonTheme, DungeonSize, DungeonGenerationConfig, ResolvedDungeonConfig }

export interface GeneratedDungeonData {
  type: 'spatial_dungeon'
  layout: SpatialDungeon
  config: ResolvedDungeonConfig
  generatedAt: number
}
