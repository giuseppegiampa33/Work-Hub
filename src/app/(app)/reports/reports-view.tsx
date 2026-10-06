'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns'
import { Download } from 'lucide-react'
import { CALENDAR, PAGE_SIZE } from '@/config/app'
import { memberLabel, useClientOptions, useMemberOptions } from '@/features/lookups/queries'
import {
  HoursByCategoryPanel,
  HoursByClientPanel,
  HoursByMemberPanel,
  TicketsBreakdownPanel,
} from '@/features/reports/components/report-panels'
import {
  useDailyHours,
  useHoursByCategory,
  useHoursByClient,
  useHoursByMember,
  useTicketsBreakdown,
} from '@/features/reports/queries'
import { deleteTimeEntry } from '@/features/time/actions'
import { TimeEntryTable } from '@/features/time/components/time-entry-table'
import { useTimeEntries } from '@/features/time/queries'
import { downloadCsv, toCsv } from '@/lib/csv'
import {
  formatDate,
  formatDateRange,
  formatDuration,
  formatHoursDecimal,
  formatWeekdayShort,
  toISODate,
} from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { useUrlState } from '@/lib/use-url-state'
import { Page } from '@/components/app/app-shell'
import { useSession } from '@/components/app/session-provider'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader, StatTile } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { DateInput, DateRangePresets } from '@/components/ui/date-input'
import { ColumnStrip } from '@/components/ui/meter'
import { Pagination } from '@/components/ui/pagination'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/components/ui/toast'

type Preset = 'week' | 'last-week' | 'month' | 'last-month' | 'quarter'

function rangeForPreset(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const weekOptions = { weekStartsOn: CALENDAR.weekStartsOn } as const

  switch (preset) {
    case 'week':
      return {
        from: toISODate(startOfWeek(now, weekOptions)),
        to: toISODate(endOfWeek(now, weekOptions)),
      }
    case 'last-week': {
      const target = subWeeks(now, 1)
      return {
        from: toISODate(startOfWeek(target, weekOptions)),
        to: toISODate(endOfWeek(target, weekOptions)),
      }
    }
    case 'month':
      return { from: toISODate(startOfMonth(now)), to: toISODate(endOfMonth(now)) }
    case 'last-month': {
      const target = subMonths(now, 1)
      return { from: toISODate(startOfMonth(target)), to: toISODate(endOfMonth(target)) }
    }
    case 'quarter':
      return { from: toISODate(startOfMonth(subMonths(now, 2))), to: toISODate(endOfMonth(now)) }
  }
}

/**
 * Reports.
 *
 * Three tabs over one period: the aggregates (computed in Postgres), the raw
 * ledger (paginated), and the ticket breakdown. The period lives in the URL so
 * a month-end figure can be linked to.
 */
export function ReportsView({ canViewAll }: { canViewAll: boolean }) {
  const { organizationId, userId, can } = useSession()
  const queryClient = useQueryClient()
  const { searchParams, setParams, getNumber } = useUrlState()

  const presetParam = (searchParams.get('preset') ?? 'month') as Preset
  const defaults = rangeForPreset(presetParam)
  const from = searchParams.get('from') ?? defaults.from
  const to = searchParams.get('to') ?? defaults.to
  const customRange = Boolean(searchParams.get('from') || searchParams.get('to'))

  const personFilter = searchParams.get('person') ?? (canViewAll ? 'all' : userId)
  const clientFilter = searchParams.get('client')

  const members = useMemberOptions(organizationId)
  const clients = useClientOptions(organizationId)

  const hoursByClient = useHoursByClient(organizationId, from, to)
  const hoursByCategory = useHoursByCategory(organizationId, from, to)
  const hoursByMember = useHoursByMember(organizationId, from, to)
  const daily = useDailyHours(organizationId, from, to)
  const breakdown = useTicketsBreakdown(organizationId)

  const entries = useTimeEntries(organizationId, {
    from,
    to,
    userId: personFilter === 'all' ? null : personFilter,
    clientId: clientFilter,
    page: getNumber('page', 1),
  })

  const totalMinutes = (hoursByClient.data ?? []).reduce((sum, row) => sum + row.minutes, 0)
  const billableMinutes = (hoursByClient.data ?? []).reduce(
    (sum, row) => sum + row.billable_minutes,
    0,
  )
  const activeDays = (daily.data ?? []).filter((day) => day.minutes > 0).length

  const dailyStrip = (daily.data ?? []).slice(-14).map((day) => ({
    label: formatDate(day.day),
    shortLabel: formatWeekdayShort(day.day).slice(0, 2),
    value: day.minutes,
  }))
  const todayIndex = dailyStrip.findIndex((item) => item.label === formatDate(new Date()))

  const exportEntries = () => {
    const rows = (entries.data?.rows ?? []).map((entry) => [
      entry.entry_date,
      entry.user?.full_name ?? entry.user?.email ?? '',
      entry.client?.name ?? '',
      entry.ticket ? `#${entry.ticket.reference} ${entry.ticket.title}` : '',
      entry.category?.name ?? '',
      entry.activity_type?.name ?? '',
      entry.description ?? '',
      entry.start_time?.slice(0, 5) ?? '',
      entry.end_time?.slice(0, 5) ?? '',
      entry.duration_minutes,
      formatHoursDecimal(entry.duration_minutes),
      entry.is_billable ? 'sì' : 'no',
    ])

    downloadCsv(
      `work-hub-ore_${from}_${to}`,
      toCsv(
        [
          'Data',
          'Persona',
          'Cliente',
          'Ticket',
          'Categoria',
          'Attività',
          'Note',
          'Inizio',
          'Fine',
          'Minuti',
          'Ore',
          'Fatturabile',
        ],
        rows,
      ),
    )
  }

  const exportHoursByClient = () => {
    downloadCsv(
      `work-hub-ore-per-cliente_${from}_${to}`,
      toCsv(
        ['Cliente', 'Minuti', 'Ore', 'Minuti fatturabili', 'Registrazioni', 'Ticket'],
        (hoursByClient.data ?? []).map((row) => [
          row.client_name,
          row.minutes,
          formatHoursDecimal(row.minutes),
          row.billable_minutes,
          row.entries,
          row.tickets,
        ]),
      ),
    )
  }

  const onDeleteEntry = async (entryId: string) => {
    const result = await deleteTimeEntry(entryId)
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.time.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all(organizationId) }),
    ])
    notify.success('Registrazione eliminata')
  }

  return (
    <Page
      title="Report"
      description={
        canViewAll
          ? 'Ore per cliente, categoria e persona, più la ripartizione dei ticket.'
          : 'Le tue ore registrate nel periodo selezionato.'
      }
      actions={
        <Button variant="secondary" size="md" icon={<Download />} onClick={exportEntries}>
          Esporta CSV
        </Button>
      }
      toolbar={
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePresets
              active={customRange ? undefined : presetParam}
              onSelect={(preset) => {
                const range = rangeForPreset(preset)
                setParams(
                  { preset, from: range.from, to: range.to, page: null },
                )
              }}
            />
            <span className="text-meta text-fg-muted" aria-live="polite">
              {formatDateRange(new Date(from), new Date(to))}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[160px]">
              <label htmlFor="report-from" className="sr-only">
                Dal
              </label>
              <DateInput
                id="report-from"
                inputSize="sm"
                value={from}
                onChange={(event) => setParams({ from: event.target.value, page: null })}
              />
            </div>
            <div className="w-[160px]">
              <label htmlFor="report-to" className="sr-only">
                Al
              </label>
              <DateInput
                id="report-to"
                inputSize="sm"
                value={to}
                onChange={(event) => setParams({ to: event.target.value, page: null })}
              />
            </div>

            {canViewAll ? (
              <div className="w-[190px]">
                <Combobox
                  inputSize="sm"
                  value={personFilter}
                  onChange={(value) => setParams({ person: value ?? 'all', page: null })}
                  options={[
                    { value: 'all', label: 'Tutto il team' },
                    { value: userId, label: 'Solo io' },
                    ...(members.data ?? [])
                      .filter((member) => member.userId !== userId)
                      .map((member) => ({ value: member.userId, label: memberLabel(member) })),
                  ]}
                  placeholder="Tutto il team"
                  searchPlaceholder="Cerca persona…"
                />
              </div>
            ) : null}

            <div className="w-[190px]">
              <Combobox
                inputSize="sm"
                value={clientFilter}
                onChange={(value) => setParams({ client: value, page: null })}
                options={(clients.data ?? []).map((client) => ({
                  value: client.id,
                  label: client.name,
                }))}
                placeholder="Tutti i clienti"
                searchPlaceholder="Cerca cliente…"
                clearable
              />
            </div>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Ore nel periodo"
          value={formatDuration(totalMinutes)}
          footnote={`${formatHoursDecimal(totalMinutes)} ore decimali`}
        />
        <StatTile
          label="Ore fatturabili"
          value={formatDuration(billableMinutes)}
          footnote={
            totalMinutes > 0
              ? `${Math.round((billableMinutes / totalMinutes) * 100)}% del totale`
              : 'Nessuna ora registrata'
          }
          tone="brand"
        />
        <StatTile
          label="Giorni con attività"
          value={activeDays}
          footnote={`su ${(daily.data ?? []).length} giorni nel periodo`}
        />
        <StatTile
          label="Registrazioni"
          value={entries.data?.total ?? 0}
          footnote="righe nel registro ore"
        />
      </div>

      <Tabs defaultValue={canViewAll ? 'overview' : 'ledger'}>
        <TabsList>
          {canViewAll ? <TabsTrigger value="overview">Panoramica</TabsTrigger> : null}
          <TabsTrigger value="ledger">Registro ore</TabsTrigger>
          {canViewAll ? <TabsTrigger value="tickets">Ticket</TabsTrigger> : null}
        </TabsList>

        {canViewAll ? (
          <TabsContent value="overview" className="pt-4">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader
                  title="Andamento giornaliero"
                  description="Ore registrate negli ultimi giorni del periodo."
                  action={
                    <Button variant="ghost" size="sm" icon={<Download />} onClick={exportHoursByClient}>
                      Ore per cliente
                    </Button>
                  }
                />
                <CardBody>
                  {dailyStrip.length === 0 || totalMinutes === 0 ? (
                    <p className="py-6 text-center text-body-sm text-fg-muted">
                      Nessuna ora registrata nel periodo selezionato.
                    </p>
                  ) : (
                    <ColumnStrip
                      data={dailyStrip}
                      formatValue={(value) => formatDuration(value)}
                      highlightIndex={todayIndex >= 0 ? todayIndex : undefined}
                    />
                  )}
                </CardBody>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <HoursByClientPanel
                  rows={hoursByClient.data ?? []}
                  isPending={hoursByClient.isPending}
                  totalMinutes={totalMinutes}
                />
                <HoursByCategoryPanel
                  rows={hoursByCategory.data ?? []}
                  isPending={hoursByCategory.isPending}
                />
              </div>

              <HoursByMemberPanel
                rows={hoursByMember.data ?? []}
                isPending={hoursByMember.isPending}
              />
            </div>
          </TabsContent>
        ) : null}

        <TabsContent value="ledger" className="pt-4">
          <div className="flex flex-col gap-2">
            <TimeEntryTable
              rows={entries.data?.rows ?? []}
              total={entries.data?.total ?? 0}
              isPending={entries.isPending}
              isError={entries.isError}
              onRetry={() => void entries.refetch()}
              onDelete={(entry) => void onDeleteEntry(entry.id)}
              currentUserId={userId}
              canManageAll={can('org:manage')}
              showPerson={canViewAll && personFilter === 'all'}
            />
            <Pagination
              page={getNumber('page', 1)}
              pageSize={PAGE_SIZE.timeEntries}
              total={entries.data?.total ?? 0}
              loading={entries.isFetching}
              onPageChange={(page) => setParams({ page: page === 1 ? null : page })}
            />
          </div>
        </TabsContent>

        {canViewAll ? (
          <TabsContent value="tickets" className="pt-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <TicketsBreakdownPanel
                rows={breakdown.data ?? []}
                isPending={breakdown.isPending}
              />
            </div>
          </TabsContent>
        ) : null}
      </Tabs>
    </Page>
  )
}
