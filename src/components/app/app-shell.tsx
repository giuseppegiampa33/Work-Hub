'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { SIDEBAR_COOKIE } from '@/config/app'
import { pageVariants } from '@/config/motion'
import { cn } from '@/lib/utils'
import { OfflineBanner } from '@/components/ui/states'
import { TooltipProvider } from '@/components/ui/menu'
import { CommandPaletteProvider } from './command-palette'
import { MobileNav, Sidebar } from './sidebar'
import { SessionProvider, type SessionView } from './session-provider'
import { Topbar } from './topbar'

/**
 * Application shell.
 *
 * Layout: fixed-height viewport, a sidebar rail, a sticky top bar and a single
 * scroll container for the content. Keeping the scroll on the content (not the
 * document) is what lets tables have sticky headers and the drawer sit still
 * while the list behind it scrolls.
 */
export function AppShell({
  session,
  defaultCollapsed,
  children,
}: {
  session: SessionView
  defaultCollapsed: boolean
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed)

  const toggle = React.useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous
      // Persisted so the server renders the right width on the next request.
      document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      return next
    })
  }, [])

  return (
    <SessionProvider value={session}>
      <TooltipProvider delayDuration={320} skipDelayDuration={200}>
        <CommandPaletteProvider>
          <div className="flex h-dvh w-full overflow-hidden bg-canvas">
            <Sidebar collapsed={collapsed} onToggle={toggle} />

            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <OfflineBanner />
              <main
                id="main"
                className={cn(
                  'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
                  // Clears the mobile bottom bar plus the home indicator.
                  'pb-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom,0px))] md:pb-0',
                )}
              >
                <PageTransition>{children}</PageTransition>
              </main>
            </div>

            <MobileNav />
          </div>
        </CommandPaletteProvider>
      </TooltipProvider>
    </SessionProvider>
  )
}

/**
 * Route transition: fade plus a 6px lift, 220ms in / 140ms out.
 *
 * Keyed on the pathname only — not on search params — so opening a ticket
 * drawer (`?ticket=…`) or changing a filter does not re-animate the page.
 */
function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  if (reduceMotion) return <>{children}</>

  /*
   * Enter-only, and deliberately *not* wrapped in `AnimatePresence`.
   *
   * With `mode="wait"` the outgoing tree is held until its exit animation
   * finishes. A page that reads `useSearchParams()` can re-suspend while that
   * is happening — the boundary falls back, the incoming tree never commits,
   * and the user is left with a blank column. Animating only the entrance
   * removes the window in which that can happen, and the exit was never
   * visible anyway: the new page covers it.
   */
  return (
    <motion.div
      key={pathname}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="gpu"
    >
      {children}
    </motion.div>
  )
}

/**
 * Standard page frame: a title row that can hold filters and actions, and a
 * content column capped so a 32" monitor does not produce 3000px-wide tables.
 */
export function Page({
  title,
  description,
  actions,
  toolbar,
  children,
  className,
  maxWidth = 'content',
}: {
  title: string
  description?: React.ReactNode
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  className?: string
  maxWidth?: 'content' | 'narrow' | 'full'
}) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-3 py-4 sm:px-5 sm:py-6',
        maxWidth === 'content' && 'max-w-content',
        maxWidth === 'narrow' && 'max-w-[840px]',
        className,
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-page-title text-fg">{title}</h1>
            {description ? (
              <p className="max-w-[72ch] text-body-sm text-fg-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>

        {toolbar}

        {children}
      </div>
    </div>
  )
}
