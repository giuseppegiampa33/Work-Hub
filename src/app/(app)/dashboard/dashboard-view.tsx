'use client'

import * as React from 'react'
import Link from 'next/link'
import { addDays } from 'date-fns'
import {
  AlertTriangle,
  CalendarDays,
  CircleDot,
  Clock,
  Inbox,
  Plus,
  Settings,
  Ticket as TicketIcon,
  UserPlus,
} from 'lucide-react'
import { CALENDAR } from '@/config/app'
import { useCalendarWeek, weekDays, weekStartFor } from '@/features/calendar/queries'
import { useOrganizationOverview } from '@/features/reports/queries'
import { TicketFormDialog } from '@/features/tickets/components/ticket-form-dialog'
import { useTicketList } from '@/features/tickets/queries'
import { TimeEntryDialog } from '@/features/time/components/time-entry-dialog'
import {
  formatDate,
  formatDuration,
  formatDateRange,
  formatRelativeDay,
  formatTime,
  toISODate,
} from '@/lib/format'
import { Page } from '@/components/app/app-shell'
import { useSession } from '@/components/app/session-provider'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/card'
import { EmptyState, Skeleton } from '@/components/ui/states'
import { PersonChip } from '@/components/ui/avatar'

/**
 * Dashboard.
 *
 * Answers four questions and nothing else: what is overdue, what is unassigned,
 * what is on my plate this week, how many hours went in. Every tile links to
 * the filtered list that produced it — no number is a dead end.
 *
 * The figures come from a single `organization_overview` RPC, so the page costs
 * one aggregate query plus two bounded list queries.
 */
export function DashboardView({
  organizationName,
  firstName,
}: {
  organizationName: string
  firstName: string | null
}) {
  const { organizationId, userId, can } = useSession()
  const [creatingTicket, setCreatingTicket] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)

  const weekStart = React.useMemo(() => weekStartFor(new Date()), [])
  const weekEnd = React.useMemo(() => addDays(weekStart, CALENDAR.days - 1), [weekStart])
  const days = React.useMemo(() => weekDays(weekStart), [weekStart])

  const overview = useOrganizationOverview(
    organizationId,
    toISODate(weekStart),
    toISODate(weekEnd),
  )

  const myTickets = useTicketList(organizationId, {
    assigneeId: userId,
    status: ['new', 'to_plan', 'planned', 'in_progress', 'waiting_client', 'waiting_internal'],
    sort: 'due',
    page: 1,
  })

  const overdue = useTicketList(organizationId, {
    status: ['new', 'to_plan', 'planned', 'in_progress', 'waiting_client', 'waiting_internal'],
    dueTo: toISODate(addDays(new Date(), -1)),
    sort: 'due',
    page: 1,
  })

  const myWeek = useCalendarWeek(organizationId, weekStart, userId)

  const tickets = overview.data?.tickets
  const time = overview.data?.time
  const counts = overview.data?.counts

  const isEmptyWorkspace =
    !overview.isPending &&
    (counts?.clients ?? 0) === 0 &&
    (tickets?.by_status ? Object.keys(tickets.by_status).length === 0 : true)

  return (
    <Page
      title={firstName ? `Ciao ${firstName}` : organizationName}
      description={`Settimana ${formatDateRange(weekStart, weekEnd)} · ${organizationName}`}
      actions={
        <>
          {can('time:log') ? (
            <Button variant="secondary" size="md" icon={<Clock />} onClick={() => setLogOpen(true)}>
              Registra ore
            </Button>
          ) : null}
          {can('tickets:create') ? (
            <Button
              variant="primary"
              size="md"
              icon={<Plus />}
              onClick={() => setCreatingTicket(true)}
            >
              Nuovo ticket
            </Button>
          ) : null}
        </>
      }
    >
      {isEmptyWorkspace ? <FirstStepsPanel canManage={can('org:manage')} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ticket aperti"
          value={overview.isPending ? '—' : (tickets?.open ?? 0)}
          footnote={
            tickets ? `${tickets.mine} assegnati a te` : 'Caricamento…'
          }
          icon={<TicketIcon />}
          href="/tickets"
        />
        <StatTile
          label="In ritardo"
          value={overview.isPending ? '—' : (tickets?.overdue ?? 0)}
          footnote="scadenza superata"
          tone={(tickets?.overdue ?? 0) > 0 ? 'danger' : 'neutral'}
          icon={<AlertTriangle />}
          href={`/tickets?sort=due&status=new,to_plan,planned,in_progress,waiting_client,waiting_internal`}
        />
        <StatTile
          label="Da assegnare"
          value={overview.isPending ? '—' : (tickets?.unassigned ?? 0)}
          footnote="nessun responsabile"
          tone={(tickets?.unassigned ?? 0) > 0 ? 'warning' : 'neutral'}
          icon={<Inbox />}
          href="/tickets?assignee=unassigned"
        />
        <StatTile
          label="Ore della settimana"
          value={overview.isPending ? '—' : formatDuration(time?.minutes_in_range ?? 0)}
          footnote={
            time ? `${formatDuration(time.my_minutes_in_range)} registrate da te` : 'Caricamento…'
          }
          icon={<Clock />}
          href="/reports?preset=week"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card>
          <CardHeader
            title="Il tuo lavoro"
            description="Ticket assegnati a te, per scadenza."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href={`/tickets?assignee=${userId}`}>Vedi tutti</Link>
              </Button>
            }
          />
          <CardBody padded={false}>
            {myTickets.isPending ? (
              <ListSkeleton />
            ) : (myTickets.data?.rows.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={CircleDot}
                title="Niente in coda"
                description="Non hai ticket aperti assegnati. Buon momento per pianificare la settimana."
                action={
                  can('calendar:plan') ? (
                    <Button asChild variant="secondary" size="sm" icon={<CalendarDays />}>
                      <Link href="/calendar">Apri il calendario</Link>
                    </Button>
                  ) : null
                }
              />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {(myTickets.data?.rows ?? []).slice(0, 8).map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets?ticket=${ticket.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-fast hover:bg-surface-hover"
                    >
                      <span className="shrink-0 text-meta text-fg-muted" data-numeric>
                        #{ticket.reference}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-sm text-fg">{ticket.title}</span>
                        <span className="truncate text-caption text-fg-muted">
                          {ticket.client?.name ?? 'Nessun cliente'}
                          {ticket.due_date ? ` · ${formatRelativeDay(ticket.due_date)}` : ''}
                        </span>
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
          <CardHeader
            title="La tua settimana"
            description="Attività pianificate da lunedì a venerdì."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link href="/calendar">Calendario</Link>
              </Button>
            }
          />
          <CardBody padded={false}>
            {myWeek.isPending ? (
              <ListSkeleton rows={4} />
            ) : (myWeek.data?.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={CalendarDays}
                title="Settimana libera"
                description="Nessuna attività pianificata per te in questa settimana."
                action={
                  can('calendar:plan') ? (
                    <Button asChild variant="secondary" size="sm" icon={<Plus />}>
                      <Link href="/calendar?new=1">Pianifica</Link>
                    </Button>
                  ) : null
                }
              />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {days.map((day) => {
                  const dayEvents = (myWeek.data ?? []).filter(
                    (event) => new Date(event.starts_at).toDateString() === day.toDateString(),
                  )
                  if (dayEvents.length === 0) return null

                  return (
                    <li key={day.toISOString()} className="px-4 py-2.5">
                      <p className="mb-1.5 text-table-heading uppercase text-fg-muted">
                        {formatDate(day)}
                      </p>
                      <ul className="flex flex-col gap-1.5">
                        {dayEvents.map((event) => (
                          <li key={event.id} className="flex items-center gap-2">
                            <span
                              className="shrink-0 text-caption text-fg-secondary"
                              data-numeric
                            >
                              {formatTime(event.starts_at)}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-body-sm text-fg">
                              {event.title}
                            </span>
                            {event.is_completed ? (
                              <span className="shrink-0 text-caption text-success-text">fatto</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {can('tickets:view_all') ? (
        <Card>
          <CardHeader
            title="Richiede attenzione"
            description="Ticket aperti con scadenza superata, in tutta l'organizzazione."
          />
          <CardBody padded={false}>
            {overdue.isPending ? (
              <ListSkeleton rows={3} />
            ) : (overdue.data?.rows.length ?? 0) === 0 ? (
              <EmptyState
                compact
                title="Nessun ritardo"
                description="Tutti i ticket aperti sono entro la scadenza."
              />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {(overdue.data?.rows ?? []).slice(0, 6).map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets?ticket=${ticket.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors duration-fast hover:bg-surface-hover"
                    >
                      <span className="shrink-0 text-meta text-danger-text" data-numeric>
                        {ticket.due_date ? formatRelativeDay(ticket.due_date) : '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-body-sm text-fg">
                        {ticket.title}
                      </span>
                      <PersonChip
                        id={ticket.assignee?.id}
                        name={ticket.assignee?.full_name}
                        email={ticket.assignee?.email}
                        src={ticket.assignee?.avatar_url}
                        size="xs"
                        hideName
                      />
                      <TicketStatusBadge status={ticket.status} short />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      <TicketFormDialog open={creatingTicket} onOpenChange={setCreatingTicket} />
      <TimeEntryDialog open={logOpen} onOpenChange={setLogOpen} />
    </Page>
  )
}

function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-3" />
      ))}
    </div>
  )
}

/**
 * First-run guidance. Appears only while the workspace is genuinely empty and
 * disappears for good once there is data — it is a checklist, not decoration.
 */
function FirstStepsPanel({ canManage }: { canManage: boolean }) {
  const steps = [
    {
      href: '/settings/taxonomy',
      icon: Settings,
      title: 'Definisci categorie e attività',
      description: 'Servono per classificare ore e pianificazione.',
      show: canManage,
    },
    {
      href: '/clients?new=1',
      icon: Plus,
      title: 'Aggiungi i primi clienti',
      description: 'Ticket, attività e ore si collegano a loro.',
      show: true,
    },
    {
      href: '/settings/members',
      icon: UserPlus,
      title: 'Invita il team',
      description: 'Genera un link di invito e assegna un ruolo.',
      show: canManage,
    },
  ].filter((step) => step.show)

  return (
    <Card>
      <CardHeader
        title="Primi passi"
        description="Tre cose da fare una volta sola: dopo, questo pannello scompare."
      />
      <CardBody padded={false}>
        <ul className="divide-y divide-line-subtle">
          {steps.map((step) => (
            <li key={step.href}>
              <Link
                href={step.href}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surface-hover"
              >
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-line-subtle bg-surface-sunken text-fg-muted"
                  aria-hidden
                >
                  <step.icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-body-sm font-medium text-fg">{step.title}</span>
                  <span className="text-meta text-fg-muted">{step.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}
