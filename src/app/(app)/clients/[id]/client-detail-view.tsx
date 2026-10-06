'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock, Mail, MapPin, Pencil, Phone, Plus, Ticket } from 'lucide-react'
import { ClientFormDialog } from '@/features/clients/components/client-form-dialog'
import { useClient, useClientSummary } from '@/features/clients/queries'
import { TicketFormDialog } from '@/features/tickets/components/ticket-form-dialog'
import { useTicketList } from '@/features/tickets/queries'
import { formatDate, formatDuration, formatRelativeDay } from '@/lib/format'
import { Page } from '@/components/app/app-shell'
import { useSession } from '@/components/app/session-provider'
import { Badge, TicketPriorityBadge, TicketStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/states'
import type { ClientRow } from '@/types/database'

export function ClientDetailView({ client: initialClient }: { client: ClientRow }) {
  const { organizationId, can } = useSession()
  const [editing, setEditing] = React.useState(false)
  const [creatingTicket, setCreatingTicket] = React.useState(false)

  const client = useClient(organizationId, initialClient.id)
  const summary = useClientSummary(organizationId, initialClient.id)
  const tickets = useTicketList(organizationId, {
    clientId: initialClient.id,
    page: 1,
    sort: 'updated',
  })

  const record = client.data ?? initialClient

  return (
    <Page
      title={record.name}
      description={
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {record.code ? (
            <span className="flex items-center gap-1.5" data-numeric>
              Codice {record.code}
            </span>
          ) : null}
          {record.email ? (
            <a
              href={`mailto:${record.email}`}
              className="flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <Mail className="size-3.5" aria-hidden />
              {record.email}
            </a>
          ) : null}
          {record.phone ? (
            <a
              href={`tel:${record.phone}`}
              className="flex items-center gap-1.5 underline-offset-2 hover:underline"
            >
              <Phone className="size-3.5" aria-hidden />
              {record.phone}
            </a>
          ) : null}
          {record.address ? (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              {record.address}
            </span>
          ) : null}
        </span>
      }
      actions={
        <>
          <Button asChild variant="ghost" size="md" icon={<ArrowLeft />}>
            <Link href="/clients">Clienti</Link>
          </Button>
          {can('tickets:create') ? (
            <Button
              variant="secondary"
              size="md"
              icon={<Plus />}
              onClick={() => setCreatingTicket(true)}
            >
              Nuovo ticket
            </Button>
          ) : null}
          {can('clients:manage') ? (
            <Button variant="primary" size="md" icon={<Pencil />} onClick={() => setEditing(true)}>
              Modifica
            </Button>
          ) : null}
        </>
      }
    >
      {record.is_archived ? (
        <p className="rounded-md border border-warning-line bg-warning-subtle px-3 py-2 text-body-sm text-warning-text">
          Questo cliente è archiviato: non comparirà nei selettori dei nuovi ticket.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ticket aperti"
          value={summary.isPending ? '—' : summary.data?.openTickets ?? 0}
          footnote={
            summary.data ? `${summary.data.totalTickets} in totale` : 'Caricamento…'
          }
          icon={<Ticket />}
          tone={(summary.data?.openTickets ?? 0) > 0 ? 'brand' : 'neutral'}
        />
        <StatTile
          label="Ore registrate"
          value={summary.isPending ? '—' : formatDuration(summary.data?.loggedMinutes ?? 0)}
          footnote={
            summary.data
              ? `${formatDuration(summary.data.billableMinutes)} fatturabili`
              : 'Caricamento…'
          }
          icon={<Clock />}
        />
        <StatTile
          label="Ultima attività"
          value={
            summary.isPending
              ? '—'
              : summary.data?.lastActivityAt
                ? formatRelativeDay(summary.data.lastActivityAt)
                : 'Nessuna'
          }
          footnote={
            summary.data?.lastActivityAt ? formatDate(summary.data.lastActivityAt) : undefined
          }
        />
        <StatTile label="Cliente dal" value={formatDate(record.created_at)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader
            title="Ticket del cliente"
            description="Ordinati per ultimo aggiornamento."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tickets?client=${record.id}`}>Vedi tutti</Link>
              </Button>
            }
          />
          <CardBody padded={false}>
            {tickets.isPending ? (
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-3 w-8/12" />
                <Skeleton className="h-3 w-6/12" />
                <Skeleton className="h-3 w-7/12" />
              </div>
            ) : (tickets.data?.rows.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={Ticket}
                title="Nessun ticket"
                description="Le richieste di questo cliente compariranno qui."
                action={
                  can('tickets:create') ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Plus />}
                      onClick={() => setCreatingTicket(true)}
                    >
                      Apri un ticket
                    </Button>
                  ) : null
                }
              />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {(tickets.data?.rows ?? []).slice(0, 10).map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets?ticket=${ticket.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-fast hover:bg-surface-hover"
                    >
                      <span className="shrink-0 text-meta text-fg-muted" data-numeric>
                        #{ticket.reference}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm text-fg">
                        {ticket.title}
                      </span>
                      <TicketPriorityBadge priority={ticket.priority} showLabel={false} />
                      <TicketStatusBadge status={ticket.status} short />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Note" />
          <CardBody>
            {record.notes ? (
              <p className="whitespace-pre-wrap text-body-sm leading-[1.5] text-fg-secondary">
                {record.notes}
              </p>
            ) : (
              <p className="text-body-sm text-fg-muted">
                Nessuna nota.{' '}
                {can('clients:manage')
                  ? 'Usa Modifica per aggiungere riferimenti o condizioni.'
                  : null}
              </p>
            )}
            {record.is_archived ? (
              <Badge tone="warning" size="sm" className="mt-3">
                Archiviato
              </Badge>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <ClientFormDialog open={editing} onOpenChange={setEditing} client={record} />
      <TicketFormDialog
        open={creatingTicket}
        onOpenChange={setCreatingTicket}
        defaultClientId={record.id}
      />
    </Page>
  )
}
