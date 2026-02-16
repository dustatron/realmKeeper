import {
  MapPin,
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  Landmark,
  LayoutGrid,
  Map,
  Tent,
  Sparkles,
} from 'lucide-react'
import type { PoiType } from '@shared/constants'

export const POI_TYPE_ICONS: Record<PoiType, React.ComponentType<{ className?: string }>> = {
  settlement: Building2,
  building: Home,
  interior: DoorOpen,
  fortification: Castle,
  dungeon: Skull,
  natural: TreePine,
  landmark: Flag,
  district: LayoutGrid,
  zone: Map,
  ruin: Landmark,
  camp: Tent,
  shrine: Sparkles,
  other: MapPin,
}
