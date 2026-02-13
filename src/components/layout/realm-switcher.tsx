import { ChevronsUpDown, Crown, Plus, Settings2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '~/components/ui/sidebar'
import { useRealms } from '~/ui/hooks/useRealms'
import { useSystemConfigs } from '~/ui/hooks/useSystemConfigs'
import { useUIStore } from '~/ui/stores/uiStore'
import { useNavigate } from '@tanstack/react-router'

export function RealmSwitcher() {
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const realms = useRealms()
  const systemConfigs = useSystemConfigs()
  const activeRealmId = useUIStore((state) => state.activeRealmId)
  const setActiveRealmId = useUIStore((state) => state.setActiveRealmId)

  const activeRealm = realms.find((r) => r.id === activeRealmId)
  const activeSystem = systemConfigs.find((s) => s.id === activeRealm?.systemId)

  const displayName = activeRealm?.name ?? 'No Realm'
  const displaySystem = activeSystem?.name ?? activeRealm?.systemId ?? 'Create one to begin'

  const handleRealmClick = (realmId: string) => {
    setActiveRealmId(realmId)
    navigate({ to: '/realms' })
  }

  const handleNewRealm = () => {
    setActiveRealmId(null)
    navigate({ to: '/realms' })
  }

  const handleManageRealms = () => {
    setActiveRealmId(null)
    navigate({ to: '/realms' })
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Crown className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {displayName}
                </span>
                <span className="truncate text-xs">{displaySystem}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Realms
            </DropdownMenuLabel>
            {realms.map((realm) => {
              const system = systemConfigs.find((s) => s.id === realm.systemId)
              return (
                <DropdownMenuItem
                  key={realm.id}
                  className="gap-2 p-2"
                  onClick={() => handleRealmClick(realm.id)}
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center rounded-md">
                    <Crown className="size-3" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{realm.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {system?.name ?? realm.systemId}
                    </span>
                  </div>
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleManageRealms}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Settings2 className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Manage Realms
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 p-2" onClick={handleNewRealm}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                New Realm
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
