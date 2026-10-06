'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { roleLabel } from '@/config/roles'
import { setActiveOrganization } from '@/features/organizations/actions'
import { cn } from '@/lib/utils'
import { OrgMark } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Spinner } from '@/components/ui/spinner'
import { notify } from '@/components/ui/toast'
import { useSession } from './session-provider'

/**
 * Tenant switcher.
 *
 * Switching rewrites the session cookie on the server and refreshes the route,
 * which also drops every cached query for the previous organization because
 * every query key is namespaced by organization id.
 */
export function OrgSwitcher() {
  const { organizations, activeOrganization } = useSession()
  const router = useRouter()
  const [pending, setPending] = React.useState<string | null>(null)

  const switchTo = (organizationId: string) => {
    if (organizationId === activeOrganization.id) return
    setPending(organizationId)
    void setActiveOrganization(organizationId).then((result) => {
      setPending(null)
      if (!result.ok) {
        notify.error(result.error)
        return
      }
      router.refresh()
    })
  }

  const single = organizations.length <= 1

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 min-w-0 items-center gap-2 rounded-md px-1.5 text-left',
            'outline-none transition-colors duration-fast ease-standard',
            'hover:bg-surface-hover',
            'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.45)]',
          )}
          aria-label="Cambia organizzazione"
        >
          <OrgMark name={activeOrganization.name} logoUrl={activeOrganization.logoUrl} size="sm" />
          <span className="hidden min-w-0 flex-col sm:flex">
            <span className="truncate text-body-sm font-medium leading-tight text-fg">
              {activeOrganization.name}
            </span>
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-[260px]">
        <DropdownMenuLabel>
          {single ? 'Organizzazione' : `Organizzazioni (${organizations.length})`}
        </DropdownMenuLabel>
        {organizations.map((organization) => {
          const active = organization.id === activeOrganization.id
          return (
            <DropdownMenuItem
              key={organization.id}
              onSelect={(event) => {
                event.preventDefault()
                switchTo(organization.id)
              }}
              className="gap-2.5"
            >
              <OrgMark name={organization.name} logoUrl={organization.logoUrl} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium text-fg">{organization.name}</span>
                <span className="truncate text-caption text-fg-muted">
                  {roleLabel(organization.role)}
                </span>
              </span>
              {pending === organization.id ? (
                <Spinner size={14} />
              ) : active ? (
                <Check className="size-3.5 !text-brand" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding?mode=create">
            <Plus aria-hidden />
            Nuova organizzazione
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
