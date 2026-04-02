/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { LiveStoreProvider } from '@livestore/react'
import { TooltipProvider } from '~/components/ui/tooltip'
import { ContainerProvider } from '~/ui/hooks/useContainer'
import { schema } from '@infrastructure/livestore/schema'
import { adapter } from '@infrastructure/livestore/store'
import { bootStore } from '@infrastructure/livestore/seed'
import { unstable_batchedUpdates as batchUpdates } from 'react-dom'
import * as React from 'react'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
      },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'description',
        content: 'Local-first sandbox world manager for GMs',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
    ],
  }),
  component: RootComponent,
  shellComponent: RootShell,
  notFoundComponent: NotFound,
})

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-svh bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootComponent() {
  React.useEffect(() => {
    import('@infrastructure/dev/devApi').then(({ installDevApi }) => {
      installDevApi()
    })
  }, [])

  return (
    <LiveStoreProvider schema={schema} adapter={adapter} boot={bootStore as any} batchUpdates={batchUpdates}>
      <ContainerProvider>
        <TooltipProvider>
          <Outlet />
        </TooltipProvider>
      </ContainerProvider>
    </LiveStoreProvider>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found</p>
      <Link to="/" className="text-primary underline">
        Go home
      </Link>
    </div>
  )
}
