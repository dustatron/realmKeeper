export interface WatabouDungeonRect {
  x: number
  y: number
  w: number
  h: number
  rotunda?: boolean
  ending?: boolean
}

export interface WatabouDungeonDoor {
  x: number
  y: number
  type: string
  dir: { x: number; y: number }
}

export interface WatabouDungeonColumn {
  x: number
  y: number
}

export interface WatabouDungeonNote {
  x: number
  y: number
  text: string
  ref?: string
}

export interface WatabouDungeonData {
  type: 'opd'
  rects: WatabouDungeonRect[]
  doors: WatabouDungeonDoor[]
  columns: WatabouDungeonColumn[]
  water: unknown[]
  notes: WatabouDungeonNote[]
  version?: number
  seed?: string
}
