'use client'

import * as React from 'react'
import { addDays, addWeeks } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react'
import { CALENDAR } from '@/config/app'
import {
  useCalendarWeek,
  weekDays,
  weekStartFor,
  type CalendarEventItem,
} from '@/features/calendar/queries'
import { AgendaList } from '@/features/calendar/components/agenda-list'
import { CalendarEventDialog, type EventDraft } from '@/features/calendar/components/event-dialog'
import { WeekGrid } from '@/features/calendar/components/week-grid'
import { memberLabel, useMemberOptions } from '@/features/lookups/queries'
import { TimeEntryDialog } from '@/features/time/components/time-entry-dialog'
import { formatDateRange, formatDuration, minutesToTime, toISODate } from '@/lib/format'
import { useIsHydrated, useUrlState } from '@/lib/use-url-state'
import { Page } from '@/components/app/app-shell'
import { useSession } from '@/components/app/session-provider'
import { Button, IconButton } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ErrorState, Skeleton } from '@/components/ui/states'

/**
 * Weekly planning board.
 *
 * The visible week and the owner filter live in the URL. Only one week is ever
 * fetched, so the query stays the same size whether the tenant has fifty events
 * or fifty thousand.
 */
export function CalendarView() {
  const { organizationId, userId, can } = useSession()
  const { searchParams, setParams } = useUrlState()
  const hydrated = useIsHydrated()

  const weekParam = searchParams.get('week')
  const weekStart = React.useMemo(
    () => weekStartFor(weekParam ? new Date(weekParam) : new Date()),
    [weekParam],
  )
  const days = React.useMemo(() => weekDays(weekStart), [weekStart])

  const ownerParam = searchParams.get('owner')
  const ownerFilter = ownerParam === 'all' ? null : (ownerParam ?? userId)

  const members = useMemberOptions(organizationId)
  const week = useCalendarWeek(organizationId, weekStart, ownerFilter)

  const [draft, setDraft] = React.useState<EventDraft | null>(null)
  const [activeEvent, setActiveEvent] = React.useState<CalendarEventItem | null>(null)
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)

  // `?new=1` / `?log=1` let the command palette and the ticket drawer link here.
  // Gated on hydration so the panel opens in its own commit: see useIsHydrated.
  React.useEffect(() => {
    if (!hydrated) return
    if (searchParams.get('new') === '1') {
      setDraft({
        date: toISODate(new Date()),
        startTime: '09:00',
        endTime: '10:00',
        ticketId: searchParams.get('ticket'),
      })
      setActiveEvent(null)
      setEventDialogOpen(true)
      setParams({ new: null })
    }
    if (searchParams.get('log') === '1') {
      setLogOpen(true)
      setParams({ log: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the query flags only
  }, [searchParams, hydrated])

  const openCreate = (date: Date, startMinutes: number) => {
    setActiveEvent(null)
    setDraft({
      date: toISODate(date),
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(Math.min(startMinutes + 60, CALENDAR.dayEndHour * 60)),
    })
    setEventDialogOpen(true)
  }

  const openEvent = (event: CalendarEventItem) => {
    setDraft(null)
    setActiveEvent(event)
    setEventDialogOpen(true)
  }

  const events = week.data ?? []
  const plannedMinutes = events
    .filter((event) => !event.is_completed)
    .reduce(
      (sum, event) =>
        sum +
        Math.round(
          (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
        ),
      0,
    )
  const completedMinutes = events
    .filter((event) => event.is_completed)
    .reduce(
      (sum, event) =>
        sum +
        Math.round(
          (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
        ),
      0,
    )

  return (
    <Page
      title="Calendario"
      description="Pianificazione settimanale, da lunedì a venerdì, 08:00–18:00."
      actions={
        <>
          {can('time:log') ? (
            <Button
              variant="secondary"
              size="md"
              icon={<Clock />}
              onClick={() => setLogOpen(true)}
            >
              Registra ore
            </Button>
          ) : null}
          {can('calendar:plan') ? (
            <Button
              variant="primary"
              size="md"
              icon={<Plus />}
              onClick={() => openCreate(days[0], 9 * 60)}
            >
              Pianifica
            </Button>
          ) : null}
        </>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5">
            <IconButton
              label="Settimana precedente"
              size="md"
              variant="secondary"
              onClick={() => setParams({ week: toISODate(addWeeks(weekStart, -1)) })}
            >
              <ChevronLeft aria-hidden />
            </IconButton>
            <IconButton
              label="Settimana successiva"
              size="md"
              variant="secondary"
              onClick={() => setParams({ week: toISODate(addWeeks(weekStart, 1)) })}
            >
              <ChevronRight aria-hidden />
            </IconButton>
            <Button
              variant="ghost"
              size="sm"
              icon={<CalendarDays />}
              onClick={() => setParams({ week: null })}
            >
              Oggi
            </Button>
          </div>

          <p className="text-body-sm font-medium text-fg" aria-live="polite">
            {formatDateRange(weekStart, addDays(weekStart, CALENDAR.days - 1))}
          </p>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-meta text-fg-muted sm:inline" data-numeric>
              {formatDuration(plannedMinutes)} pianificate
              {completedMinutes > 0 ? ` · ${formatDuration(completedMinutes)} consuntivate` : ''}
            </span>
            <div className="w-[200px]">
              <Combobox
                inputSize="sm"
                value={ownerParam ?? userId}
                onChange={(value) => setParams({ owner: value ?? 'all' })}
                options={[
                  { value: userId, label: 'Le mie attività' },
                  { value: 'all', label: 'Tutto il team' },
                  ...(members.data ?? [])
                    .filter((member) => member.userId !== userId)
                    .map((member) => ({ value: member.userId, label: memberLabel(member) })),
                ]}
                placeholder="Le mie attività"
                searchPlaceholder="Cerca persona…"
              />
            </div>
          </div>
        </div>
      }
    >
      {week.isError ? (
        <div className="rounded-lg border border-line bg-surface">
          <ErrorState onRetry={() => void week.refetch()} />
        </div>
      ) : week.isPending ? (
        <Skeleton className="h-[480px] w-full rounded-lg" />
      ) : (
        <>
          <div className="hidden md:block">
            <WeekGrid
              days={days}
              events={events}
              onCreateAt={openCreate}
              onOpenEvent={openEvent}
              canPlan={can('calendar:plan')}
            />
          </div>
          <div className="md:hidden">
            <AgendaList
              days={days}
              events={events}
              onCreateAt={openCreate}
              onOpenEvent={openEvent}
              canPlan={can('calendar:plan')}
            />
          </div>
        </>
      )}

      <CalendarEventDialog
        open={eventDialogOpen}
        onOpenChange={(open) => {
          setEventDialogOpen(open)
          if (!open) {
            setActiveEvent(null)
            setDraft(null)
          }
        }}
        event={activeEvent}
        draft={draft}
      />

      <TimeEntryDialog open={logOpen} onOpenChange={setLogOpen} />
    </Page>
  )
}
