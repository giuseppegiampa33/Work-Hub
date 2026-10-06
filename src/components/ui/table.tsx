'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Data table primitives.
 *
 * Rows are 44px by default (36px in compact mode) so a laptop screen shows ~18
 * tickets without scrolling. Hover and selection are colour changes only — no
 * lift, no shadow. The header is sticky inside its own scroll container.
 */

export function TableShell({
  className,
  children,
  /** Set when the table owns its own scroll area (tickets, time entries). */
  scroll = true,
}: {
  className?: string
  children: React.ReactNode
  scroll?: boolean
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-line bg-surface',
        className,
      )}
    >
      <div className={cn(scroll && 'overflow-x-auto')}>{children}</div>
    </div>
  )
}

export function Table({ className, ...props }: React.ComponentPropsWithoutRef<'table'>) {
  return (
    <table
      className={cn('w-full border-collapse text-body-sm', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ComponentPropsWithoutRef<'thead'>) {
  return (
    <thead
      className={cn('sticky top-0 z-sticky bg-surface-muted', className)}
      {...props}
    />
  )
}

export function TableBody({ className, ...props }: React.ComponentPropsWithoutRef<'tbody'>) {
  return <tbody className={cn('divide-y divide-line-subtle', className)} {...props} />
}

export function TableRow({
  className,
  selected,
  interactive,
  compact,
  ...props
}: React.ComponentPropsWithoutRef<'tr'> & {
  selected?: boolean
  interactive?: boolean
  compact?: boolean
}) {
  return (
    <tr
      data-selected={selected || undefined}
      className={cn(
        compact ? 'h-row-compact' : 'h-row',
        'transition-colors duration-fast ease-standard',
        interactive && 'cursor-pointer hover:bg-surface-hover',
        selected && 'bg-surface-selected hover:bg-surface-selected',
        'focus-within:bg-surface-hover',
        className,
      )}
      {...props}
    />
  )
}

export function TableHeaderCell({
  className,
  children,
  align = 'left',
  width,
  numeric,
  ...props
}: React.ComponentPropsWithoutRef<'th'> & {
  align?: 'left' | 'right' | 'center'
  width?: string
  numeric?: boolean
}) {
  // `aria-sort` is read from the header cell, so sortable columns pass it here.
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(
        'whitespace-nowrap border-b border-line px-3 py-2 text-table-heading uppercase text-fg-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        align === 'left' && 'text-left',
        numeric && 'tabular-nums',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}

/** Sortable column header: one click cycles asc -> desc -> none. */
export function SortableHeaderCell({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  align = 'left',
  width,
  className,
}: {
  label: string
  columnKey: string
  activeKey: string | null
  direction: 'asc' | 'desc'
  onSort: (key: string, direction: 'asc' | 'desc') => void
  align?: 'left' | 'right' | 'center'
  width?: string
  className?: string
}) {
  const active = activeKey === columnKey
  const nextDirection: 'asc' | 'desc' = active && direction === 'asc' ? 'desc' : 'asc'
  const Icon = !active ? ChevronsUpDown : direction === 'asc' ? ArrowUp : ArrowDown

  return (
    <TableHeaderCell
      align={align}
      width={width}
      className={cn('p-0', className)}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey, nextDirection)}
        aria-label={`Ordina per ${label}, ${nextDirection === 'asc' ? 'crescente' : 'decrescente'}`}
        className={cn(
          'flex w-full items-center gap-1 px-3 py-2 text-table-heading uppercase',
          'transition-colors duration-fast ease-standard outline-none',
          'hover:text-fg-secondary focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
          active ? 'text-fg-secondary' : 'text-fg-muted',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
        )}
      >
        {label}
        <Icon className={cn('size-3', active ? 'text-brand' : 'text-fg-disabled')} aria-hidden />
      </button>
    </TableHeaderCell>
  )
}

export function TableCell({
  className,
  children,
  align = 'left',
  numeric,
  truncate,
  ...props
}: React.ComponentPropsWithoutRef<'td'> & {
  align?: 'left' | 'right' | 'center'
  numeric?: boolean
  truncate?: boolean
}) {
  return (
    <td
      data-numeric={numeric ? 'true' : undefined}
      className={cn(
        'px-3 py-1.5 align-middle text-fg',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        numeric && 'tabular-nums',
        truncate && 'max-w-0 truncate',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}

/** Toolbar above a table: search on the left, filters and actions on the right. */
export function TableToolbar({
  children,
  className,
  secondRow,
}: {
  children: React.ReactNode
  className?: string
  /** Active filter chips or a bulk-selection bar. */
  secondRow?: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {secondRow ? <div className="flex flex-wrap items-center gap-1.5">{secondRow}</div> : null}
    </div>
  )
}

/** Caption announcing the result count to screen readers and to the eye. */
export function TableSummary({
  total,
  rangeStart,
  rangeEnd,
  noun = 'risultati',
  className,
}: {
  total: number
  rangeStart?: number
  rangeEnd?: number
  noun?: string
  className?: string
}) {
  const detail =
    rangeStart !== undefined && rangeEnd !== undefined && total > 0
      ? `${rangeStart}–${rangeEnd} di ${total}`
      : `${total}`

  return (
    <p className={cn('text-meta text-fg-muted', className)} aria-live="polite" data-numeric>
      {detail} {noun}
    </p>
  )
}
