'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/button'
import { Kbd } from '@/components/ui/misc'
import { useCommandPalette } from './command-palette'
import { NotificationsMenu } from './notifications-menu'
import { OrgSwitcher } from './org-switcher'
import { ProfileMenu } from './profile-menu'

/**
 * Top bar: tenant on the left, global search in the middle, notifications and
 * profile on the right. Sticky, 56px, opaque with a hairline bottom border —
 * no blur and no shadow, so nothing appears to float over the content.
 *
 * There is no burger menu: on mobile the primary destinations live in the
 * bottom bar, which is reachable with a thumb.
 */
export function Topbar() {
  const palette = useCommandPalette()

  return (
    <header
      className={cn(
        'sticky top-0 z-header flex h-topbar shrink-0 items-center gap-2',
        'border-b border-line bg-canvas px-2 sm:px-3',
      )}
    >
      <OrgSwitcher />

      <div className="mx-auto hidden w-full max-w-[420px] sm:block">
        <button
          type="button"
          onClick={palette.open}
          className={cn(
            'flex h-8 w-full items-center gap-2 rounded-md border border-line bg-surface px-2.5',
            'text-left text-body-sm text-fg-disabled',
            'transition-colors duration-fast ease-standard',
            'hover:border-line-strong hover:text-fg-muted',
            'focus-visible:border-brand focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgb(var(--color-focus)/0.14)]',
          )}
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 truncate">Cerca ticket, clienti, persone…</span>
          <span className="hidden items-center gap-0.5 lg:flex" aria-hidden>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-0.5 sm:ml-0">
        <IconButton label="Cerca" size="md" className="sm:hidden" onClick={palette.open}>
          <Search aria-hidden />
        </IconButton>
        <NotificationsMenu />
        <ProfileMenu />
      </div>
    </header>
  )
}
