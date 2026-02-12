import type { LucideIcon } from 'lucide-react'

export interface NavLink {
  title: string
  url: string
  icon: LucideIcon
  badge?: string
}

export interface NavCollapsible {
  title: string
  icon: LucideIcon
  items: { title: string; url: string }[]
}

export type NavItem = NavLink | NavCollapsible

export function isNavCollapsible(item: NavItem): item is NavCollapsible {
  return 'items' in item
}

export interface NavGroup {
  title: string
  items: NavItem[]
}
