'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { PRIMARY_NAV, type NavItem } from '@/config/navigation'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/menu'
import { useSession } from './session-provider'

/**
 * Primary navigation.
 *
 * Collapsible to a 60px icon rail; the preference is written to a cookie so the
 * server renders the correct width on the next request and the layout does not
 * shift after hydration.
 */
export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const items = useVisibleNavItems()

  return (
    <nav
      aria-label="Navigazione principale"
      className={cn(
        'hidden h-full shrink-0 flex-col border-r border-line bg-canvas md:flex',
        'transition-[width] duration-moderate ease-inout',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar',
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
        {items.map((item) => (
          <SidebarLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </div>

      <div className={cn('border-t border-line-subtle p-2', collapsed && 'flex justify-center')}>
        <IconButton
          label={collapsed ? 'Espandi la barra laterale' : 'Comprimi la barra laterale'}
          size="md"
          onClick={onToggle}
        >
          {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
        </IconButton>
      </div>
    </nav>
  )
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname()
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-2 text-body-sm font-medium',
        'h-9 outline-none transition-colors duration-fast ease-standard',
        'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-canvas)),0_0_0_4px_rgb(var(--color-focus)/0.45)]',
        active
          ? 'bg-surface text-fg shadow-[inset_0_0_0_1px_rgb(var(--color-line))]'
          : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
        collapsed && 'justify-center px-0',
      )}
    >
      <Icon
        className={cn('size-4 shrink-0', active ? 'text-brand' : 'text-fg-muted')}
        aria-hidden
      />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span>{item.label}</span>}
    </Link>
  )

  if (!collapsed) return link
  return (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  )
}

/** Nav entries the active role is allowed to open. */
export function useVisibleNavItems(): NavItem[] {
  const { canAny } = useSession()
  return React.useMemo(
    () => PRIMARY_NAV.filter((item) => !item.permissions || canAny(item.permissions)),
    [canAny],
  )
}

/**
 * Mobile navigation: a bottom bar with the four most used destinations plus
 * settings. 44px touch targets, safe-area padding for the home indicator.
 */
export function MobileNav() {
  const pathname = usePathname()
  const items = useVisibleNavItems().filter((item) => item.mobile)

  return (
    <nav
      aria-label="Navigazione principale"
      className={cn(
        'fixed inset-x-0 bottom-0 z-header border-t border-line bg-surface pb-safe md:hidden',
      )}
    >
      <ul className="flex items-stretch">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-touch flex-col items-center justify-center gap-0.5 px-1 py-2',
                  'text-caption font-medium outline-none transition-colors duration-fast',
                  active ? 'text-brand-text' : 'text-fg-muted',
                  'focus-visible:bg-surface-hover',
                )}
              >
                <Icon className={cn('size-5', active && 'text-brand')} aria-hidden />
                <span className="truncate">{item.mobileLabel ?? item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
