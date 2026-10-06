'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { drawerVariants, scrimVariants, sheetVariants } from '@/config/motion'
import { cn } from '@/lib/utils'
import { IconButton } from './button'

/**
 * Side drawer — the ticket detail surface.
 *
 * Desktop: slides in from the right, 260ms, translateX only.
 * Mobile (<640px): becomes a bottom sheet, because a 560px side panel on a
 * 375px screen is just a full-screen modal with extra steps.
 *
 * The transform is chosen at mount from a media query rather than animated
 * between the two, so resizing mid-animation can't produce a half-state.
 */
function useIsCompact() {
  const [compact, setCompact] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 639px)')
    setCompact(query.matches)
    const listener = (event: MediaQueryListEvent) => setCompact(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])
  return compact
}

export function Drawer({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>{open ? children : null}</AnimatePresence>
    </DialogPrimitive.Root>
  )
}

export function DrawerContent({
  children,
  title,
  description,
  /** Rendered in the header, right of the title (status pickers, actions). */
  headerActions,
  footer,
  className,
  width = 'md',
  titleVisuallyHidden,
}: {
  children: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  headerActions?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  width?: 'sm' | 'md' | 'lg'
  titleVisuallyHidden?: boolean
}) {
  const compact = useIsCompact()
  const widths = {
    sm: 'sm:w-[420px]',
    md: 'sm:w-[var(--drawer-width)]',
    lg: 'sm:w-[min(860px,92vw)]',
  }[width]

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay asChild>
        <motion.div
          variants={scrimVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed inset-0 z-drawer bg-overlay/25"
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content asChild aria-describedby={description ? undefined : ''}>
        <motion.aside
          variants={compact ? sheetVariants : drawerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            'fixed z-drawer flex flex-col overflow-hidden bg-surface shadow-drawer gpu',
            // Mobile: bottom sheet with a safe-area aware footer.
            'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl border-t border-line',
            // Desktop: full-height right rail.
            'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:max-w-full sm:rounded-none sm:border-l sm:border-t-0',
            widths,
            className,
          )}
        >
          {compact ? (
            <div className="flex justify-center pb-1 pt-2" aria-hidden>
              <span className="h-1 w-9 rounded-full bg-line-strong" />
            </div>
          ) : null}

          <header className="flex items-start gap-3 border-b border-line-subtle px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {titleVisuallyHidden ? (
                <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
              ) : (
                <DialogPrimitive.Title className="truncate text-section-title text-fg">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description ? (
                <DialogPrimitive.Description className="text-meta text-fg-muted">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            {headerActions}
            <DialogPrimitive.Close asChild>
              <IconButton label="Chiudi pannello" size="md" className="-mr-1">
                <X aria-hidden />
              </IconButton>
            </DialogPrimitive.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

          {footer ? (
            <footer className="border-t border-line-subtle bg-surface-muted px-4 py-3 pb-safe sm:px-5">
              {footer}
            </footer>
          ) : null}
        </motion.aside>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Section inside a drawer body: quiet heading plus content. */
export function DrawerSection({
  title,
  action,
  children,
  className,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn('border-b border-line-subtle px-4 py-4 last:border-b-0 sm:px-5', className)}
    >
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <h3 className="text-table-heading uppercase text-fg-muted">{title}</h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}
