import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Crown } from 'lucide-react'
import { useUIStore } from '~/ui/stores/uiStore'

export const Route = createFileRoute('/_app/')({
  component: Home,
})

function Home() {
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)

  useEffect(() => {
    if (activeRealmId) {
      navigate({ to: '/realms' })
    }
  }, [activeRealmId, navigate])

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <Crown className="size-12 text-muted-foreground/50" />
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Realm Keeper</h1>
      <p className="mt-2 text-muted-foreground">Local-first sandbox world manager for GMs</p>
      <Button className="mt-6" size="lg" asChild>
        <Link to="/realms">Get Started</Link>
      </Button>
    </div>
  )
}
