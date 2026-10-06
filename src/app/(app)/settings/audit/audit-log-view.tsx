'use client'

import * as React from 'react'
import { ScrollText } from 'lucide-react'
import { PAGE_SIZE } from '@/config/app'
import { useAuditLogs } from '@/features/members/queries'
import { formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useSession } from '@/components/app/session-provider'

/** Human labels for the actions written by the database triggers. */
const ACTION_LABELS: Record<string, { label: string; tone: 'neutral' | 'brand' | 'warning' | 'danger' }> = {
  'organization.created': { label: 'Organizzazione creata', tone: 'brand' },
  'member.added': { label: 'Membro aggiunto', tone: 'brand' },
  'member.role_changed': { label: 'Ruolo modificato', tone: 'warning' },
  'member.removed': { label: 'Membro rimosso', tone: 'danger' },
  'invite.accepted': { label: 'Invito accettato', tone: 'brand' },
  'ticket.deleted': { label: 'Ticket eliminato', tone: 'danger' },
  'client.deleted': { label: 'Cliente eliminato', tone: 'danger' },
}

/**
 * Audit trail.
 *
 * Append-only and written by triggers, so the record exists even for changes
 * made outside the UI. Read-only here by design: nothing in the application can
 * edit or remove an entry.
 */
export function AuditLogView() {
  const { organizationId } = useSession()
  const [page, setPage] = React.useState(1)
  const logs = useAuditLogs(organizationId, page)

  return (
    <Card>
      <CardHeader
        title="Registro attività"
        description="Operazioni critiche sul tenant: membri, ruoli ed eliminazioni."
      />
      <CardBody padded={false}>
        {logs.isError ? (
          <ErrorState onRetry={() => void logs.refetch()} />
        ) : logs.isPending ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-3 w-8/12" />
            <Skeleton className="h-3 w-6/12" />
            <Skeleton className="h-3 w-7/12" />
          </div>
        ) : (logs.data?.rows.length ?? 0) === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nessuna operazione registrata"
            description="Qui compariranno cambi di ruolo, rimozioni di membri ed eliminazioni di dati."
          />
        ) : (
          <>
            <ul className="divide-y divide-line-subtle">
              {(logs.data?.rows ?? []).map((entry) => {
                const descriptor = ACTION_LABELS[entry.action] ?? {
                  label: entry.action,
                  tone: 'neutral' as const,
                }
                const metadata =
                  entry.metadata && typeof entry.metadata === 'object'
                    ? (entry.metadata as Record<string, unknown>)
                    : null

                return (
                  <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <Badge tone={descriptor.tone} size="sm" className="shrink-0">
                      {descriptor.label}
                    </Badge>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body-sm text-fg">
                        {entry.actor
                          ? (entry.actor.full_name ?? entry.actor.email)
                          : 'Sistema'}
                      </span>
                      {metadata ? (
                        <span className="truncate text-caption text-fg-muted">
                          {Object.entries(metadata)
                            .filter(([, value]) => value !== null && value !== '')
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(' · ')}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-caption text-fg-muted" data-numeric>
                      {formatDateTime(entry.created_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE.auditLogs}
              total={logs.data?.total ?? 0}
              loading={logs.isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </CardBody>
    </Card>
  )
}
