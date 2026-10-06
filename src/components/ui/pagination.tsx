'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * Offset pagination.
 *
 * Every long list is paginated — there is no "load everything" path in
 * Work-Hub. The control reports the page it is on so the user can tell a slow
 * network from an empty page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  loading,
  className,
}: {
  /** 1-based. */
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  loading?: boolean
  className?: string
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  if (total <= pageSize) {
    return (
      <div className={cn('flex items-center justify-between gap-3 px-3 py-2', className)}>
        <p className="text-meta text-fg-muted" data-numeric>
          {total === 0 ? 'Nessun risultato' : `${total} risultati`}
        </p>
      </div>
    )
  }

  return (
    <nav
      aria-label="Paginazione"
      className={cn(
        'flex flex-col items-center justify-between gap-2 px-3 py-2 sm:flex-row',
        className,
      )}
    >
      <p className="text-meta text-fg-muted" data-numeric aria-live="polite">
        {start}–{end} di {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          icon={<ChevronLeft />}
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Precedente
        </Button>
        <span className="px-2 text-meta text-fg-secondary" data-numeric>
          {page} / {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          iconAfter={<ChevronRight />}
          disabled={page >= pageCount || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Successiva
        </Button>
      </div>
    </nav>
  )
}
