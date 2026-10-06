'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export function SettingsNav({
  items,
}: {
  items: { href: string; label: string; description: string }[]
}) {
  const pathname = usePathname()

  return (
    <nav aria-label="Sezioni delle impostazioni">
      {/* Horizontal scroller on small screens, vertical rail from lg up. */}
      <ul className="flex gap-1 overflow-x-auto scrollbar-none lg:flex-col lg:overflow-visible">
        {items.map((item) => {
          const active = pathname === item.href
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-2.5 py-2 outline-none',
                  'transition-colors duration-fast ease-standard',
                  'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-canvas)),0_0_0_4px_rgb(var(--color-focus)/0.45)]',
                  active
                    ? 'bg-surface text-fg shadow-[inset_0_0_0_1px_rgb(var(--color-line))]'
                    : 'text-fg-secondary hover:bg-surface-hover hover:text-fg',
                )}
              >
                <span className="block whitespace-nowrap text-body-sm font-medium lg:whitespace-normal">
                  {item.label}
                </span>
                <span className="hidden text-caption text-fg-muted lg:block">
                  {item.description}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
