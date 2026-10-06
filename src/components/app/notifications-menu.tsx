'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { useMarkNotificationsRead, useNotifications } from '@/features/notifications/queries'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Button, IconButton } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/menu'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useSession } from './session-provider'

export function NotificationsMenu() {
  const { organizationId, userId } = useSession()
  const [open, setOpen] = React.useState(false)
  const { data, isPending, isError, refetch } = useNotifications(organizationId, userId)
  const markRead = useMarkNotificationsRead(organizationId, userId)

  const unread = (data ?? []).filter((item) => !item.read_at)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton
          label={unread.length > 0 ? `Notifiche (${unread.length} da leggere)` : 'Notifiche'}
          size="md"
          className="relative"
        >
          <Bell aria-hidden />
          {unread.length > 0 ? (
            <span
              className={cn(
                'absolute right-1 top-1 inline-flex min-w-3 items-center justify-center',
                'rounded-full bg-danger px-0.5 text-caption font-medium leading-none text-fg-inverse',
              )}
              data-numeric
            >
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          ) : null}
        </IconButton>
      </PopoverTrigger>

      <PopoverContent align="end" padded={false} className="w-[min(360px,calc(100vw-32px))]">
        <header className="flex items-center justify-between gap-2 border-b border-line-subtle px-3 py-2">
          <h2 className="text-subsection-title text-fg">Notifiche</h2>
          {unread.length > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              icon={<CheckCheck />}
              loading={markRead.isPending}
              onClick={() => markRead.mutate('all')}
            >
              Segna tutte
            </Button>
          ) : null}
        </header>

        <div className="max-h-[min(420px,60dvh)] overflow-y-auto">
          {isPending ? (
            <ul className="flex flex-col gap-2 p-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <li key={index} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3 w-7/12" />
                  <Skeleton className="h-2.5 w-4/12" />
                </li>
              ))}
            </ul>
          ) : isError ? (
            <ErrorState compact onRetry={() => void refetch()} />
          ) : (data ?? []).length === 0 ? (
            <EmptyState
              compact
              icon={Bell}
              title="Nessuna notifica"
              description="Qui arrivano le assegnazioni e i commenti sui ticket che ti riguardano."
            />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {(data ?? []).map((notification) => {
                const body = (
                  <>
                    <span className="flex items-start gap-2">
                      <span
                        className={cn(
                          'mt-1.5 size-1.5 shrink-0 rounded-full',
                          notification.read_at ? 'bg-transparent' : 'bg-brand',
                        )}
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-body-sm font-medium text-fg">
                          {notification.title}
                        </span>
                        {notification.body ? (
                          <span className="line-clamp-2 text-meta text-fg-secondary">
                            {notification.body}
                          </span>
                        ) : null}
                        <span className="text-caption text-fg-muted">
                          {formatTimeAgo(notification.created_at)}
                          {notification.read_at ? null : ' · da leggere'}
                        </span>
                      </span>
                    </span>
                  </>
                )

                return (
                  <li key={notification.id}>
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        onClick={() => {
                          setOpen(false)
                          if (!notification.read_at) markRead.mutate([notification.id])
                        }}
                        className="block px-3 py-2.5 transition-colors duration-fast hover:bg-surface-hover"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className="px-3 py-2.5">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
