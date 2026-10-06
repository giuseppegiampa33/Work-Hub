'use client'

import { isToday } from 'date-fns'
import { CalendarDays, Check, Plus } from 'lucide-react'
import { formatDuration, formatTime, formatWeekday } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import type { CalendarEventItem } from '../queries'

/**
 * Mobile agenda.
 *
 * Below 768px a five-column time grid is unreadable, so the same week is shown
 * as a day-by-day list: the information is identical, the interaction is a tap.
 */
export function AgendaList({
  days,
  events,
  onCreateAt,
  onOpenEvent,
  canPlan,
}: {
  days: Date[]
  events: CalendarEventItem[]
  onCreateAt: (date: Date, startMinutes: number) => void
  onOpenEvent: (event: CalendarEventItem) => void
  canPlan: boolean
}) {
  const hasAny = events.length > 0

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          icon={CalendarDays}
          title="Settimana libera"
          description="Nessuna attività pianificata in questa settimana."
          action={
            canPlan ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus />}
                onClick={() => onCreateAt(days[0], 9 * 60)}
              >
                Pianifica attività
              </Button>
            ) : null
          }
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const dayEvents = events
          .filter((event) => new Date(event.starts_at).toDateString() === day.toDateString())
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

        const totalMinutes = dayEvents.reduce(
          (sum, event) =>
            sum +
            Math.round(
              (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
            ),
          0,
        )

        return (
          <section
            key={day.toISOString()}
            className="overflow-hidden rounded-lg border border-line bg-surface"
          >
            <header
              className={cn(
                'flex items-center justify-between gap-2 border-b border-line-subtle px-3 py-2',
                isToday(day) ? 'bg-brand-subtle/50' : 'bg-surface-muted',
              )}
            >
              <h3
                className={cn(
                  'text-subsection-title capitalize',
                  isToday(day) ? 'text-brand-text' : 'text-fg',
                )}
              >
                {formatWeekday(day)} {day.getDate()}
                {isToday(day) ? ' · oggi' : ''}
              </h3>
              <div className="flex items-center gap-2">
                {totalMinutes > 0 ? (
                  <span className="text-meta text-fg-muted" data-numeric>
                    {formatDuration(totalMinutes)}
                  </span>
                ) : null}
                {canPlan ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    icon={<Plus />}
                    onClick={() => onCreateAt(day, 9 * 60)}
                  >
                    Aggiungi
                  </Button>
                ) : null}
              </div>
            </header>

            {dayEvents.length === 0 ? (
              <p className="px-3 py-3 text-body-sm text-fg-muted">Nessuna attività.</p>
            ) : (
              <ul className="divide-y divide-line-subtle">
                {dayEvents.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event)}
                      className="flex w-full min-h-touch items-center gap-3 px-3 py-2 text-left transition-colors duration-fast hover:bg-surface-hover"
                    >
                      <span className="shrink-0 text-meta text-fg-secondary" data-numeric>
                        {formatTime(event.starts_at)}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-sm font-medium text-fg">
                          {event.title}
                        </span>
                        <span className="truncate text-caption text-fg-muted">
                          {[
                            event.client?.name,
                            event.ticket ? `#${event.ticket.reference}` : null,
                            event.owner?.full_name ?? undefined,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </span>
                      {event.is_completed ? (
                        <Badge tone="success" size="sm">
                          <Check className="size-3" aria-hidden />
                          Fatto
                        </Badge>
                      ) : (
                        <Badge tone="brand" size="sm">
                          Pianificato
                        </Badge>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
