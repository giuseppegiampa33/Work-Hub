'use client'

import * as React from 'react'
import Link from 'next/link'
import { Building2, LogOut, Settings, User } from 'lucide-react'
import { roleLabel } from '@/config/roles'
import { signOut } from '@/features/auth/actions'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { useSession } from './session-provider'

export function ProfileMenu() {
  const { fullName, email, avatarUrl, userId, activeOrganization, can } = useSession()
  const [signingOut, setSigningOut] = React.useState(false)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu profilo"
          className={cn(
            'inline-flex size-8 items-center justify-center rounded-full outline-none',
            'transition-shadow duration-fast ease-standard',
            'hover:shadow-[0_0_0_3px_rgb(var(--color-surface-active))]',
            'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.45)]',
          )}
        >
          <Avatar id={userId} name={fullName} email={email} src={avatarUrl} size="md" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[240px]">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar id={userId} name={fullName} email={email} src={avatarUrl} size="lg" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-body-sm font-medium text-fg">
              {fullName || 'Il tuo profilo'}
            </span>
            <span className="truncate text-caption text-fg-muted">{email}</span>
            <span className="mt-0.5 truncate text-caption text-fg-muted">
              {roleLabel(activeOrganization.role)} · {activeOrganization.name}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings/profile">
            <User aria-hidden />
            Profilo
          </Link>
        </DropdownMenuItem>

        {can('org:manage') ? (
          <DropdownMenuItem asChild>
            <Link href="/settings/organization">
              <Building2 aria-hidden />
              Organizzazione
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden />
            Impostazioni
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          tone="danger"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault()
            setSigningOut(true)
            void signOut()
          }}
        >
          <LogOut aria-hidden />
          {signingOut ? 'Disconnessione…' : 'Esci'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
