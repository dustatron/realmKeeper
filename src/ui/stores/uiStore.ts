import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  // Active realm
  activeRealmId: string | null
  setActiveRealmId: (id: string | null) => void

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
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeRealmId: null,
      setActiveRealmId: (id) => set({ activeRealmId: id }),

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
    }),
    {
      name: 'rk-ui-store',
      partialize: (state) => ({
        activeRealmId: state.activeRealmId,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)
