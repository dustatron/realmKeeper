import { createContext, useContext, useMemo } from 'react'
import { useStore } from '@livestore/react'
import { type Container, createContainer } from '@infrastructure/container'

const ContainerContext = createContext<Container | null>(null)

export function ContainerProvider({ children }: { children: React.ReactNode }) {
  const { store } = useStore()
  const container = useMemo(() => createContainer(store as any), [store])
  return (
    <ContainerContext.Provider value={container}>
      {children}
    </ContainerContext.Provider>
  )
}

export function useContainer(): Container {
  const ctx = useContext(ContainerContext)
  if (!ctx) throw new Error('useContainer must be used within ContainerProvider')
  return ctx
}
