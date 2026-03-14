import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '~/components/layout/app-sidebar'
import { Header } from '~/components/layout/header'
import { Main } from '~/components/layout/main'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'
import { useUIStore } from '~/ui/stores/uiStore'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <AppSidebar />
      <SidebarInset className="max-h-svh overflow-y-auto">
        <Header />
        <Main>
          <Outlet />
        </Main>
      </SidebarInset>
    </SidebarProvider>
  )
}
