'use client'

import { Clock, Users } from 'lucide-react'
import {
  TICKET_PRIORITY_DESCRIPTORS,
  TICKET_STATUSES,
  TICKET_STATUS_DESCRIPTORS,
  type TicketPriority,
} from '@/config/tickets'
import { formatDuration, formatHoursDecimal, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { BarMeter, MeterRow } from '@/components/ui/meter'
import { EmptyState, Skeleton } from '@/components/ui/states'
import type {
  HoursByCategoryRow,
  HoursByClientRow,
  HoursByMemberRow,
  TicketsBreakdownRow,
} from '@/types/database'

function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-6/12" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  )
}

/**
 * Hours per client.
 *
 * One hue for every bar — the length already encodes the magnitude, so tinting
 * by value would spend the colour channel on information the chart repeats.
 * The decimal figure sits next to the duration because that is what ends up on
 * an invoice.
 */
export function HoursByClientPanel({
  rows,
  isPending,
  totalMinutes,
}: {
  rows: HoursByClientRow[]
  isPending: boolean
  totalMinutes: number
}) {
  const max = Math.max(1, ...rows.map((row) => row.minutes))

  return (
    <Card>
      <CardHeader
        title="Ore per cliente"
        description={
          totalMinutes > 0
            ? `${formatDuration(totalMinutes)} nel periodo selezionato`
            : 'Nessuna ora registrata nel periodo'
        }
      />
      <CardBody padded={false}>
        {isPending ? (
          <PanelSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title="Nessuna ora nel periodo"
            description="Registra le ore dal calendario o dal dettaglio di un ticket."
          />
        ) : (
          <div className="flex flex-col gap-1 p-3">
            {rows.slice(0, 12).map((row) => (
              <MeterRow
                key={row.client_id ?? 'none'}
                label={row.client_name}
                sublabel={`${formatNumber(row.tickets)} ticket`}
                value={row.minutes}
                max={max}
                formattedValue={formatDuration(row.minutes)}
                secondaryValue={`${formatHoursDecimal(row.minutes)} h`}
                href={row.client_id ? `/clients/${row.client_id}` : undefined}
              />
            ))}
            {rows.length > 12 ? (
              <p className="px-1 pt-2 text-caption text-fg-muted">
                Mostrati i 12 clienti con più ore su {rows.length}.
              </p>
            ) : null}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

/** Hours per category, with the activity breakdown folded into the sublabel. */
export function HoursByCategoryPanel({
  rows,
  isPending,
}: {
  rows: HoursByCategoryRow[]
  isPending: boolean
}) {
  const grouped = new Map<
    string,
    { name: string; tone: HoursByCategoryRow['tone']; minutes: number; activities: string[] }
  >()

  for (const row of rows) {
    const key = row.category_id ?? 'none'
    const existing = grouped.get(key)
    if (existing) {
      existing.minutes += row.minutes
      if (row.activity_type_name !== '—') existing.activities.push(row.activity_type_name)
    } else {
      grouped.set(key, {
        name: row.category_name,
        tone: row.tone,
        minutes: row.minutes,
        activities: row.activity_type_name !== '—' ? [row.activity_type_name] : [],
      })
    }
  }

  const list = [...grouped.values()].sort((a, b) => b.minutes - a.minutes)
  const max = Math.max(1, ...list.map((item) => item.minutes))

  return (
    <Card>
      <CardHeader
        title="Ore per categoria"
        description="Dove è andato il tempo del team nel periodo."
      />
      <CardBody padded={false}>
        {isPending ? (
          <PanelSkeleton rows={4} />
        ) : list.length === 0 ? (
          <EmptyState
            compact
            icon={Clock}
            title="Nessuna ora categorizzata"
            description="Assegna una categoria alle ore per vedere questa ripartizione."
          />
        ) : (
          <div className="flex flex-col gap-1 p-3">
            {list.map((item) => (
              <MeterRow
                key={item.name}
                label={item.name}
                sublabel={
                  item.activities.length > 0
                    ? `${item.activities.length} tipi di attività`
                    : undefined
                }
                value={item.minutes}
                max={max}
                tone={item.tone === 'neutral' ? 'brand' : item.tone}
                formattedValue={formatDuration(item.minutes)}
              />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}

export function HoursByMemberPanel({
  rows,
  isPending,
}: {
  rows: HoursByMemberRow[]
  isPending: boolean
}) {
  const max = Math.max(1, ...rows.map((row) => row.minutes))

  return (
    <Card>
      <CardHeader title="Ore per persona" description="Carico di lavoro registrato nel periodo." />
      <CardBody padded={false}>
        {isPending ? (
          <PanelSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="Nessuna ora registrata"
            description="Le ore compaiono qui appena qualcuno le registra."
          />
        ) : (
          <ul className="flex flex-col gap-2 p-3">
            {rows.map((row) => (
              <li key={row.user_id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar
                      id={row.user_id}
                      name={row.full_name}
                      email={row.email}
                      src={row.avatar_url}
                      size="xs"
                    />
                    <span className="truncate text-body-sm text-fg">
                      {row.full_name ?? row.email}
                    </span>
                    <span className="shrink-0 text-caption text-fg-muted" data-numeric>
                      {row.days_logged} gg
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2">
                    <span className="text-body-sm font-medium text-fg" data-numeric>
                      {formatDuration(row.minutes)}
                    </span>
                    <span className="text-caption text-fg-muted" data-numeric>
                      {formatPercent(row.minutes === 0 ? 0 : row.billable_minutes / row.minutes)}{' '}
                      fatt.
                    </span>
                  </span>
                </div>
                <BarMeter
                  value={row.minutes}
                  max={max}
                  label={`${row.full_name ?? row.email}: ${formatDuration(row.minutes)}`}
                />
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

/**
 * Tickets by status and priority.
 *
 * Status colours are *status* tokens, not a categorical palette — and every
 * row carries its label, so the state never depends on the colour alone.
 */
export function TicketsBreakdownPanel({
  rows,
  isPending,
}: {
  rows: TicketsBreakdownRow[]
  isPending: boolean
}) {
  const byStatus = new Map<string, number>()
  const byPriority = new Map<TicketPriority, number>()
  let total = 0

  for (const row of rows) {
    byStatus.set(row.status, (byStatus.get(row.status) ?? 0) + row.total)
    byPriority.set(row.priority, (byPriority.get(row.priority) ?? 0) + row.total)
    total += row.total
  }

  const maxStatus = Math.max(1, ...byStatus.values())

  return (
    <Card>
      <CardHeader
        title="Ticket per stato"
        description={total > 0 ? `${formatNumber(total)} ticket in totale` : 'Nessun ticket'}
      />
      <CardBody padded={false}>
        {isPending ? (
          <PanelSkeleton rows={6} />
        ) : total === 0 ? (
          <EmptyState
            compact
            title="Nessun ticket"
            description="La ripartizione compare appena apri il primo ticket."
          />
        ) : (
          <div className="flex flex-col gap-3 p-3">
            <div className="flex flex-col gap-1">
              {TICKET_STATUSES.filter((status) => (byStatus.get(status) ?? 0) > 0).map((status) => {
                const descriptor = TICKET_STATUS_DESCRIPTORS[status]
                const count = byStatus.get(status) ?? 0
                return (
                  <div key={status} className="flex flex-col gap-1.5 px-1 py-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <Badge tone={descriptor.tone} size="sm" dot>
                        {descriptor.label}
                      </Badge>
                      <span className="text-body-sm font-medium text-fg" data-numeric>
                        {formatNumber(count)}
                      </span>
                    </div>
                    <BarMeter
                      value={count}
                      max={maxStatus}
                      tone={descriptor.tone}
                      label={`${descriptor.label}: ${count} ticket`}
                    />
                  </div>
                )
              })}
            </div>

            <div className="border-t border-line-subtle pt-3">
              <h3 className="mb-2 text-table-heading uppercase text-fg-muted">
                Priorità dei ticket aperti
              </h3>
              <ul className="flex flex-wrap gap-2">
                {(Object.keys(TICKET_PRIORITY_DESCRIPTORS) as TicketPriority[]).map((priority) => {
                  const descriptor = TICKET_PRIORITY_DESCRIPTORS[priority]
                  const count = byPriority.get(priority) ?? 0
                  return (
                    <li
                      key={priority}
                      className={cn(
                        'flex items-center gap-2 rounded-sm border border-line-subtle bg-surface-muted px-2 py-1',
                        count === 0 && 'opacity-60',
                      )}
                    >
                      <span className="text-meta text-fg-secondary">{descriptor.label}</span>
                      <span className="text-body-sm font-medium text-fg" data-numeric>
                        {formatNumber(count)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
