'use client'

import * as React from 'react'
import { isSameDay, isToday } from 'date-fns'
import { Check, Plus } from 'lucide-react'
import { CALENDAR, CALENDAR_HOURS } from '@/config/app'
import { formatDuration, formatTime, formatWeekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { IconButton } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/menu'
import type { CalendarEventItem } from '../queries'

const DAY_START_MINUTES = CALENDAR.dayStartHour * 60
const DAY_END_MINUTES = CALENDAR.dayEndHour * 60
const MINUTES_IN_VIEW = DAY_END_MINUTES - DAY_START_MINUTES
const PIXELS_PER_MINUTE = CALENDAR.slotHeight / CALENDAR.slotMinutes
const GRID_HEIGHT = MINUTES_IN_VIEW * PIXELS_PER_MINUTE

type PositionedEvent = {
  event: CalendarEventItem
  top: number
  height: number
  lane: number
  lanes: number
}

/**
 * Weekly grid, Monday–Friday, 08:00–18:00.
 *
 * Geometry comes from the tokens in `config/app.ts`: a 30-minute slot is 36px,
 * so one minute is 1.2px and every block is positioned arithmetically rather
 * than by flow. Overlapping events are laid out in lanes, which keeps a double
 * booking visible instead of hiding one block behind another.
 *
 * Clicking empty space creates an event at that time; the per-day “+” button in
 * the header is the keyboard equivalent.
 */
export function WeekGrid({
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
  const perDay = React.useMemo(() => layoutWeek(days, events), [days, events])

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {/* Day headers */}
      <div
        className="grid border-b border-line bg-surface-muted"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        <div className="border-r border-line-subtle" />
        {days.map((day) => {
          const today = isToday(day)
          const dayEvents = perDay.get(day.toDateString()) ?? []
          const plannedMinutes = dayEvents.reduce(
            (total, item) => total + durationMinutes(item.event),
            0,
          )

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex items-center justify-between gap-1 border-r border-line-subtle px-2 py-1.5 last:border-r-0',
                today && 'bg-brand-subtle/50',
              )}
            >
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    'text-table-heading uppercase',
                    today ? 'text-brand-text' : 'text-fg-muted',
                  )}
                >
                  {formatWeekdayShort(day)}
                </span>
                <span
                  className={cn(
                    'text-body-sm font-medium',
                    today ? 'text-brand-text' : 'text-fg',
                  )}
                  data-numeric
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {plannedMinutes > 0 ? (
                  <span className="text-caption text-fg-muted" data-numeric>
                    {formatDuration(plannedMinutes)}
                  </span>
                ) : null}
                {canPlan ? (
                  <IconButton
                    label={`Aggiungi attività il ${day.getDate()}`}
                    size="sm"
                    onClick={() => onCreateAt(day, 9 * 60)}
                  >
                    <Plus aria-hidden />
                  </IconButton>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div
        className="grid"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }}
      >
        {/* Hour gutter */}
        <div className="relative border-r border-line-subtle" style={{ height: GRID_HEIGHT }}>
          {CALENDAR_HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute right-1.5 -translate-y-1/2 text-caption text-fg-muted"
              style={{ top: (hour * 60 - DAY_START_MINUTES) * PIXELS_PER_MINUTE }}
              data-numeric
            >
              {hour === CALENDAR.dayStartHour ? null : `${String(hour).padStart(2, '0')}:00`}
            </div>
          ))}
        </div>

        {days.map((day) => (
          <DayColumn
            key={day.toISOString()}
            day={day}
            positioned={perDay.get(day.toDateString()) ?? []}
            onCreateAt={onCreateAt}
            onOpenEvent={onOpenEvent}
            canPlan={canPlan}
          />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  day,
  positioned,
  onCreateAt,
  onOpenEvent,
  canPlan,
}: {
  day: Date
  positioned: PositionedEvent[]
  onCreateAt: (date: Date, startMinutes: number) => void
  onOpenEvent: (event: CalendarEventItem) => void
  canPlan: boolean
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  const handleBackgroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!canPlan) return
    const node = ref.current
    if (!node) return
    const bounds = node.getBoundingClientRect()
    const offset = event.clientY - bounds.top
    const rawMinutes = DAY_START_MINUTES + offset / PIXELS_PER_MINUTE
    const snapped =
      Math.floor(rawMinutes / CALENDAR.slotMinutes) * CALENDAR.slotMinutes
    onCreateAt(day, Math.min(Math.max(snapped, DAY_START_MINUTES), DAY_END_MINUTES - 60))
  }

  return (
    <div
      ref={ref}
      onClick={handleBackgroundClick}
      className={cn(
        'relative border-r border-line-subtle last:border-r-0',
        isToday(day) && 'bg-brand-subtle/20',
        canPlan && 'cursor-copy',
      )}
      style={{ height: GRID_HEIGHT }}
    >
      {/* Hour lines: solid hairlines, half-hours one step lighter. */}
      {Array.from({ length: MINUTES_IN_VIEW / CALENDAR.slotMinutes }).map((_, index) => (
        <div
          key={index}
          aria-hidden
          className={cn(
            'absolute inset-x-0 border-t',
            index % 2 === 0 ? 'border-line-subtle' : 'border-line-subtle/50',
          )}
          style={{ top: index * CALENDAR.slotHeight }}
        />
      ))}

      <NowIndicator day={day} />

      {positioned.map((item) => (
        <EventBlock key={item.event.id} item={item} onOpen={onOpenEvent} />
      ))}
    </div>
  )
}

/** Thin brand rule showing the current time, only on today's column. */
function NowIndicator({ day }: { day: Date }) {
  const [minutes, setMinutes] = React.useState<number | null>(null)

  React.useEffect(() => {
    const update = () => {
      const now = new Date()
      if (!isSameDay(now, day)) {
        setMinutes(null)
        return
      }
      const current = now.getHours() * 60 + now.getMinutes()
      setMinutes(current >= DAY_START_MINUTES && current <= DAY_END_MINUTES ? current : null)
    }
    update()
    const timer = setInterval(update, 60_000)
    return () => clearInterval(timer)
  }, [day])

  if (minutes === null) return null

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-raised flex items-center"
      style={{ top: (minutes - DAY_START_MINUTES) * PIXELS_PER_MINUTE }}
      aria-hidden
    >
      <span className="size-1.5 shrink-0 rounded-full bg-brand" />
      <span className="h-px flex-1 bg-brand" />
    </div>
  )
}

function EventBlock({
  item,
  onOpen,
}: {
  item: PositionedEvent
  onOpen: (event: CalendarEventItem) => void
}) {
  const { event, top, height, lane, lanes } = item
  const tone = (event.category?.tone ?? 'brand') as
    | 'brand'
    | 'info'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'

  const toneClasses = {
    brand: 'border-l-brand bg-brand-subtle text-brand-text',
    info: 'border-l-info bg-info-subtle text-info-text',
    success: 'border-l-success bg-success-subtle text-success-text',
    warning: 'border-l-warning bg-warning-subtle text-warning-text',
    danger: 'border-l-danger bg-danger-subtle text-danger-text',
    neutral: 'border-l-neutral bg-neutral-subtle text-neutral-text',
  }[tone]

  const width = `calc(${100 / lanes}% - 3px)`
  const left = `calc(${(100 / lanes) * lane}% + 2px)`

  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{event.title}</span>
          <span>
            {formatTime(event.starts_at)}–{formatTime(event.ends_at)} ·{' '}
            {formatDuration(durationMinutes(event))}
          </span>
          {event.client ? <span>{event.client.name}</span> : null}
        </span>
      }
      side="right"
    >
      <button
        type="button"
        onClick={(clickEvent) => {
          clickEvent.stopPropagation()
          onOpen(event)
        }}
        className={cn(
          'absolute z-raised flex flex-col items-start gap-0.5 overflow-hidden rounded-sm border-l-2 px-1.5 py-1',
          'text-left outline-none transition-[filter,box-shadow] duration-fast ease-standard',
          'hover:brightness-[0.97]',
          'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.5)]',
          toneClasses,
          event.is_completed && 'opacity-90',
        )}
        style={{ top, height: Math.max(height, 20), left, width }}
      >
        <span className="flex w-full items-center gap-1">
          {event.is_completed ? (
            <Check className="size-3 shrink-0" aria-hidden />
          ) : null}
          <span className="truncate text-caption font-medium" data-numeric>
            {formatTime(event.starts_at)}
          </span>
        </span>
        <span className="line-clamp-2 w-full text-caption leading-[1.25]">{event.title}</span>
        {height > 56 && event.client ? (
          <span className="w-full truncate text-caption opacity-80">{event.client.name}</span>
        ) : null}
        <span className="sr-only">
          {event.is_completed ? 'Consuntivato' : 'Pianificato'},{' '}
          {formatDuration(durationMinutes(event))}
          {event.owner?.full_name ? `, ${event.owner.full_name}` : ''}
        </span>
      </button>
    </Tooltip>
  )
}

function durationMinutes(event: CalendarEventItem): number {
  return Math.round(
    (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
  )
}

/** Assigns each event a lane so overlapping blocks sit side by side. */
function layoutWeek(days: Date[], events: CalendarEventItem[]): Map<string, PositionedEvent[]> {
  const result = new Map<string, PositionedEvent[]>()

  for (const day of days) {
    const dayEvents = events
      .filter((event) => isSameDay(new Date(event.starts_at), day))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))

    const laneEnds: number[] = []
    const positioned: PositionedEvent[] = []

    for (const event of dayEvents) {
      const start = new Date(event.starts_at)
      const end = new Date(event.ends_at)
      const startMinutes = Math.max(
        DAY_START_MINUTES,
        Math.min(start.getHours() * 60 + start.getMinutes(), DAY_END_MINUTES - CALENDAR.minEventMinutes),
      )
      const rawEnd = end.getHours() * 60 + end.getMinutes()
      // An event ending after the visible window (or past midnight) is clipped.
      const endMinutes =
        rawEnd <= startMinutes ? DAY_END_MINUTES : Math.min(rawEnd, DAY_END_MINUTES)

      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= startMinutes)
      if (lane === -1) {
        lane = laneEnds.length
        laneEnds.push(endMinutes)
      } else {
        laneEnds[lane] = endMinutes
      }

      positioned.push({
        event,
        top: (startMinutes - DAY_START_MINUTES) * PIXELS_PER_MINUTE,
        height: Math.max(endMinutes - startMinutes, CALENDAR.minEventMinutes) * PIXELS_PER_MINUTE,
        lane,
        lanes: 1,
      })
    }

    // Lane count is per cluster of overlapping events, not per day.
    for (const item of positioned) {
      const overlapping = positioned.filter(
        (other) =>
          other.top < item.top + item.height && other.top + other.height > item.top,
      )
      item.lanes = Math.max(...overlapping.map((other) => other.lane + 1), 1)
    }

    result.set(day.toDateString(), positioned)
  }

  return result
}
