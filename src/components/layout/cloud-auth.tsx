import { useObservable } from 'dexie-react-hooks'
import { Cloud, CloudOff, LogOut } from 'lucide-react'
import { db } from '~/infrastructure/dexie/db'
import { Button } from '~/components/ui/button'

const cloudEnabled = !!import.meta.env.VITE_DEXIE_CLOUD_URL

export function CloudAuth() {
  const currentUser = useObservable(cloudEnabled ? db.cloud.currentUser : undefined)

  if (!cloudEnabled) return null

  const isLoggedIn = currentUser?.isLoggedIn

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-1">
        <Cloud className="size-4 text-green-500" />
        <span className="text-xs text-muted-foreground hidden sm:inline max-w-24 truncate">
          {currentUser.name || currentUser.email}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => db.cloud.logout()}
        >
          <LogOut className="size-4" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={() => db.cloud.login()}
    >
      <CloudOff className="size-4" />
      <span className="sr-only">Login to sync</span>
    </Button>
  )
}
