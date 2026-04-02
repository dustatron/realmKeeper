import type { ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Active realm
  activeRealmId: string | null
  setActiveRealmId: (id: string | null) => void

  // Dynamic header title (set by detail pages, cleared on unmount)
  headerTitle: ReactNode | null
  setHeaderTitle: (title: ReactNode | null) => void

  // Global search palette
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // Modal stack
  modalStack: string[]
  pushModal: (modalId: string) => void
  popModal: () => void
  clearModals: () => void

  // Filters (generic key-value for any list view)
  activeFilters: Record<string, string>
  setFilter: (key: string, value: string) => void
  clearFilter: (key: string) => void
  clearAllFilters: () => void

  // Map settings
  mapShowLabels: boolean
  setMapShowLabels: (show: boolean) => void
  mapShowRegions: boolean
  setMapShowRegions: (show: boolean) => void
  mapViewStates: Record<string, { zoom: number; center: [number, number] }>
  setMapViewState: (mapId: string, zoom: number, center: [number, number]) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeRealmId: null,
      setActiveRealmId: (id) => set({ activeRealmId: id }),

      headerTitle: null,
      setHeaderTitle: (title) => set({ headerTitle: title }),

      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      modalStack: [],
      pushModal: (modalId) =>
        set((s) => ({ modalStack: [...s.modalStack, modalId] })),
      popModal: () =>
        set((s) => ({ modalStack: s.modalStack.slice(0, -1) })),
      clearModals: () => set({ modalStack: [] }),

      activeFilters: {},
      setFilter: (key, value) =>
        set((s) => ({ activeFilters: { ...s.activeFilters, [key]: value } })),
      clearFilter: (key) =>
        set((s) => {
          const { [key]: _, ...rest } = s.activeFilters
          return { activeFilters: rest }
        }),
      clearAllFilters: () => set({ activeFilters: {} }),

      mapShowLabels: false,
      setMapShowLabels: (show) => set({ mapShowLabels: show }),
      mapShowRegions: true,
      setMapShowRegions: (show) => set({ mapShowRegions: show }),
      mapViewStates: {},
      setMapViewState: (mapId, zoom, center) =>
        set((s) => ({
          mapViewStates: { ...s.mapViewStates, [mapId]: { zoom, center } },
        })),
    }),
    {
      name: 'rk-ui-store',
      partialize: (state) => ({
        activeRealmId: state.activeRealmId,
        sidebarOpen: state.sidebarOpen,
        mapShowLabels: state.mapShowLabels,
        mapShowRegions: state.mapShowRegions,
        mapViewStates: state.mapViewStates,
      }),
    }
  )
)
