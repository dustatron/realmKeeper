import { createContext, useContext } from 'react'
import { type Container, createContainer } from '@infrastructure/container'

const ContainerContext = createContext<Container | null>(null)

// Singleton — created once
const container = createContainer()

export function ContainerProvider({ children }: { children: React.ReactNode }) {
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
