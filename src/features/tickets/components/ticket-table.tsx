'use client'

import * as React from 'react'
import { MoreHorizontal, Pencil, Ticket as TicketIcon, Trash2 } from 'lucide-react'
import { formatDateShort, formatDueDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { IconButton } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { PersonChip } from '@/components/ui/avatar'
import {
  SortableHeaderCell,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states'
import type { TicketListItem, TicketSortKey } from '../queries'
import { PriorityPicker, StatusPicker } from './pickers'

const COLUMNS = [
  { width: '72px' },
  { width: undefined },
  { width: '180px' },
  { width: '150px' },
  { width: '136px' },
  { width: '124px' },
  { width: '112px' },
  { width: '44px' },
] as const

/**
 * Ticket list.
 *
 * A real table, not a stack of cards: the point of this screen is to compare
 * twenty rows at a glance. Row height is 44px, status and priority are editable
 * in place, and the row itself opens the detail drawer.
 *
 * The list is paginated at 25 rows, which is why the body is not virtualized;
 * `VIRTUALIZE_THRESHOLD` in config/app.ts records where that would change.
 */
export function TicketTable({
  rows,
  total,
  isPending,
  isError,
  onRetry,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onEdit,
  onDelete,
  canUpdate,
  canAssign,
  canDelete,
  sort,
  onSortChange,
  emptyAction,
  searching,
}: {
  rows: TicketListItem[]
  total: number
  isPending: boolean
  isError: boolean
  onRetry: () => void
  onOpen: (ticketId: string) => void
  onStatusChange: (ticket: TicketListItem, status: TicketListItem['status']) => void
  onPriorityChange: (ticket: TicketListItem, priority: TicketListItem['priority']) => void
  onEdit: (ticketId: string) => void
  onDelete: (ticket: TicketListItem) => void
  canUpdate: boolean
  canAssign: boolean
  canDelete: boolean
  sort: TicketSortKey
  onSortChange: (sort: TicketSortKey) => void
  emptyAction?: React.ReactNode
  searching: boolean
}) {
  const sortColumn: Record<string, TicketSortKey> = {
    reference: 'reference',
    due_date: 'due',
    priority: 'priority',
    created_at: 'recent',
    updated_at: 'updated',
  }

  const activeColumn =
    Object.entries(sortColumn).find(([, key]) => key === sort)?.[0] ?? 'created_at'

  const handleSort = (columnKey: string) => {
    const next = sortColumn[columnKey]
    if (next) onSortChange(next)
  }

  if (isError) {
    return (
      <TableShell>
        <ErrorState
          onRetry={onRetry}
          description="Controlla la connessione oppure riprova fra qualche istante."
        />
      </TableShell>
    )
  }

  if (!isPending && rows.length === 0) {
    return (
      <TableShell>
        <EmptyState
          icon={TicketIcon}
          title={searching ? 'Nessun ticket corrisponde ai filtri' : 'Nessun ticket'}
          description={
            searching
              ? 'Prova ad allargare i filtri o ad azzerare la ricerca.'
              : 'Quando arriva una richiesta da un cliente, apri un ticket: resterà tracciato con stato, priorità, responsabile e ore.'
          }
          action={searching ? undefined : emptyAction}
        />
      </TableShell>
    )
  }

  return (
    <TableShell>
      <Table>
        <caption className="sr-only">
          Elenco ticket, {total} risultati. Attiva il titolo di una riga per aprire il dettaglio.
        </caption>
        <TableHead>
          <tr>
            <SortableHeaderCell
              label="N."
              columnKey="reference"
              activeKey={activeColumn}
              direction="desc"
              onSort={handleSort}
              width={COLUMNS[0].width}
              align="left"
            />
            <TableHeaderCell>Titolo</TableHeaderCell>
            <TableHeaderCell width={COLUMNS[2].width}>Cliente</TableHeaderCell>
            <TableHeaderCell width={COLUMNS[3].width}>Stato</TableHeaderCell>
            <SortableHeaderCell
              label="Priorità"
              columnKey="priority"
              activeKey={activeColumn}
              direction="asc"
              onSort={handleSort}
              width={COLUMNS[4].width}
            />
            <TableHeaderCell width={COLUMNS[5].width}>Assegnato a</TableHeaderCell>
            <SortableHeaderCell
              label="Scadenza"
              columnKey="due_date"
              activeKey={activeColumn}
              direction="asc"
              onSort={handleSort}
              width={COLUMNS[6].width}
            />
            <TableHeaderCell width={COLUMNS[7].width}>
              <span className="sr-only">Azioni</span>
            </TableHeaderCell>
          </tr>
        </TableHead>

        {isPending ? (
          <TableSkeleton rows={8} columns={COLUMNS.map(() => ({}))} />
        ) : (
          <TableBody>
            {rows.map((ticket) => (
              <TicketRow
                key={ticket.id}
                ticket={ticket}
                onOpen={onOpen}
                onStatusChange={onStatusChange}
                onPriorityChange={onPriorityChange}
                onEdit={onEdit}
                onDelete={onDelete}
                canUpdate={canUpdate}
                canAssign={canAssign}
                canDelete={canDelete}
              />
            ))}
          </TableBody>
        )}
      </Table>
    </TableShell>
  )
}

const TicketRow = React.memo(function TicketRow({
  ticket,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onEdit,
  onDelete,
  canUpdate,
  canAssign,
  canDelete,
}: {
  ticket: TicketListItem
  onOpen: (ticketId: string) => void
  onStatusChange: (ticket: TicketListItem, status: TicketListItem['status']) => void
  onPriorityChange: (ticket: TicketListItem, priority: TicketListItem['priority']) => void
  onEdit: (ticketId: string) => void
  onDelete: (ticket: TicketListItem) => void
  canUpdate: boolean
  canAssign: boolean
  canDelete: boolean
}) {
  const due = formatDueDate(ticket.due_date)

  return (
    <TableRow interactive onClick={() => onOpen(ticket.id)}>
      <TableCell numeric className="text-fg-muted">
        #{ticket.reference}
      </TableCell>

      <TableCell truncate>
        <span className="flex min-w-0 items-center gap-2">
          {/* The row is clickable for the mouse; this button is the keyboard path. */}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onOpen(ticket.id)
            }}
            className={cn(
              'min-w-0 truncate rounded-xs text-left font-medium text-fg outline-none',
              'hover:text-brand-text focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
            )}
          >
            {ticket.title}
          </button>
          {ticket.category ? (
            <Badge
              tone={(ticket.category.tone as 'neutral') ?? 'neutral'}
              size="sm"
              variant="outline"
              className="hidden shrink-0 lg:inline-flex"
            >
              {ticket.category.name}
            </Badge>
          ) : null}
        </span>
      </TableCell>

      <TableCell truncate className="text-fg-secondary">
        {ticket.client?.name ?? <span className="text-fg-disabled">—</span>}
      </TableCell>

      <TableCell onClick={(event) => event.stopPropagation()}>
        <StatusPicker
          value={ticket.status}
          onChange={(status) => onStatusChange(ticket, status)}
          disabled={!canUpdate}
          short
        />
      </TableCell>

      <TableCell onClick={(event) => event.stopPropagation()}>
        <PriorityPicker
          value={ticket.priority}
          onChange={(priority) => onPriorityChange(ticket, priority)}
          disabled={!canUpdate}
        />
      </TableCell>

      <TableCell truncate>
        <PersonChip
          id={ticket.assignee?.id}
          name={ticket.assignee?.full_name}
          email={ticket.assignee?.email}
          src={ticket.assignee?.avatar_url}
          size="sm"
        />
      </TableCell>

      <TableCell numeric>
        {ticket.due_date ? (
          <span
            className={cn(
              'text-meta',
              due.tone === 'danger'
                ? 'font-medium text-danger-text'
                : due.tone === 'warning'
                  ? 'text-warning-text'
                  : 'text-fg-secondary',
            )}
            title={formatDateShort(ticket.due_date)}
          >
            {due.label}
          </span>
        ) : (
          <span className="text-fg-disabled">—</span>
        )}
      </TableCell>

      <TableCell onClick={(event) => event.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label={`Azioni per il ticket #${ticket.reference}`} size="sm">
              <MoreHorizontal aria-hidden />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onOpen(ticket.id)}>Apri dettaglio</DropdownMenuItem>
            {canUpdate ? (
              <DropdownMenuItem onSelect={() => onEdit(ticket.id)}>
                <Pencil aria-hidden />
                Modifica
              </DropdownMenuItem>
            ) : null}
            {canAssign || canDelete ? <DropdownMenuSeparator /> : null}
            {canDelete ? (
              <DropdownMenuItem tone="danger" onSelect={() => onDelete(ticket)}>
                <Trash2 aria-hidden />
                Elimina
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
})
