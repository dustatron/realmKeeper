import { Outlet, createFileRoute } from '@tanstack/react-router'
import { AppSidebar } from '~/components/layout/app-sidebar'
import { Header } from '~/components/layout/header'
import { Main } from '~/components/layout/main'
import { SidebarInset, SidebarProvider } from '~/components/ui/sidebar'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <Main>
          <Outlet />
        </Main>
      </SidebarInset>
    </SidebarProvider>
  )
}
