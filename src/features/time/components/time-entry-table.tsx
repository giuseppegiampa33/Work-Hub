'use client'

import Link from 'next/link'
import { Clock, MoreHorizontal, Trash2 } from 'lucide-react'
import { formatDate, formatDuration, formatSqlTime } from '@/lib/format'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states'
import type { TimeEntryListItem } from '../queries'

const COLUMNS = [{}, {}, {}, {}, {}, {}, {}] as const

/** Logged-hours ledger. Compact rows: this is a list people scan, not read. */
export function TimeEntryTable({
  rows,
  total,
  isPending,
  isError,
  onRetry,
  onDelete,
  currentUserId,
  canManageAll,
  showPerson,
}: {
  rows: TimeEntryListItem[]
  total: number
  isPending: boolean
  isError: boolean
  onRetry: () => void
  onDelete?: (entry: TimeEntryListItem) => void
  currentUserId: string
  canManageAll: boolean
  showPerson: boolean
}) {
  if (isError) {
    return (
      <TableShell>
        <ErrorState onRetry={onRetry} />
      </TableShell>
    )
  }

  if (!isPending && rows.length === 0) {
    return (
      <TableShell>
        <EmptyState
          icon={Clock}
          title="Nessuna ora nel periodo"
          description="Registra le ore dal calendario, dal dettaglio di un ticket o dal pulsante Registra ore."
        />
      </TableShell>
    )
  }

  return (
    <TableShell>
      <Table>
        <caption className="sr-only">Ore registrate, {total} righe.</caption>
        <TableHead>
          <tr>
            <TableHeaderCell width="104px">Data</TableHeaderCell>
            {showPerson ? <TableHeaderCell width="170px">Persona</TableHeaderCell> : null}
            <TableHeaderCell width="170px">Cliente</TableHeaderCell>
            <TableHeaderCell>Attività</TableHeaderCell>
            <TableHeaderCell width="110px">Orario</TableHeaderCell>
            <TableHeaderCell width="90px" align="right">
              Durata
            </TableHeaderCell>
            <TableHeaderCell width="44px">
              <span className="sr-only">Azioni</span>
            </TableHeaderCell>
          </tr>
        </TableHead>

        {isPending ? (
          <TableSkeleton rows={10} columns={COLUMNS.map(() => ({}))} compact />
        ) : (
          <TableBody>
            {rows.map((entry) => (
              <TableRow key={entry.id} compact>
                <TableCell numeric className="text-fg-secondary">
                  {formatDate(entry.entry_date)}
                </TableCell>

                {showPerson ? (
                  <TableCell truncate>
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar
                        id={entry.user?.id}
                        name={entry.user?.full_name}
                        email={entry.user?.email}
                        src={entry.user?.avatar_url}
                        size="xs"
                      />
                      <span className="truncate text-fg-secondary">
                        {entry.user?.full_name ?? entry.user?.email ?? '—'}
                      </span>
                    </span>
                  </TableCell>
                ) : null}

                <TableCell truncate className="text-fg-secondary">
                  {entry.client ? (
                    <Link
                      href={`/clients/${entry.client.id}`}
                      className="rounded-xs outline-none hover:text-brand-text focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]"
                    >
                      {entry.client.name}
                    </Link>
                  ) : (
                    <span className="text-fg-disabled">—</span>
                  )}
                </TableCell>

                <TableCell truncate>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-fg">
                      {entry.description ?? entry.activity_type?.name ?? 'Attività'}
                    </span>
                    {entry.ticket ? (
                      <Link
                        href={`/tickets?ticket=${entry.ticket.id}`}
                        className="shrink-0 text-caption text-fg-muted underline-offset-2 hover:text-fg-secondary hover:underline"
                        data-numeric
                      >
                        #{entry.ticket.reference}
                      </Link>
                    ) : null}
                    {entry.category ? (
                      <Badge
                        tone={(entry.category.tone as 'neutral') ?? 'neutral'}
                        size="sm"
                        variant="outline"
                        className="hidden shrink-0 lg:inline-flex"
                      >
                        {entry.category.name}
                      </Badge>
                    ) : null}
                    {entry.is_billable ? null : (
                      <Badge tone="neutral" size="sm" className="shrink-0">
                        Non fatt.
                      </Badge>
                    )}
                  </span>
                </TableCell>

                <TableCell numeric className="text-fg-muted">
                  {entry.start_time
                    ? `${formatSqlTime(entry.start_time)}–${formatSqlTime(entry.end_time)}`
                    : '—'}
                </TableCell>

                <TableCell align="right" numeric className="font-medium text-fg">
                  {formatDuration(entry.duration_minutes)}
                </TableCell>

                <TableCell>
                  {onDelete && (entry.user_id === currentUserId || canManageAll) ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <IconButton label="Azioni sulla registrazione" size="sm">
                          <MoreHorizontal aria-hidden />
                        </IconButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem tone="danger" onSelect={() => onDelete(entry)}>
                          <Trash2 aria-hidden />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        )}
      </Table>
    </TableShell>
  )
}
