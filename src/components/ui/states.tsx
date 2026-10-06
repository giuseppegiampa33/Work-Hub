'use client'

import * as React from 'react'
import { AlertTriangle, DatabaseZap, RefreshCw, WifiOff } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * The four non-happy states every data surface must handle. Having them as
 * components (instead of inline markup per page) is what keeps them consistent
 * — and what makes it obvious when a new page forgot one.
 */

/**
 * Skeleton. A quiet opacity pulse, not a sweeping highlight: a gradient sweep
 * is decoration, and on a dense table it animates dozens of elements at once.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('block animate-pulse rounded-sm bg-surface-sunken', className)}
    />
  )
}

/**
 * Placeholder rows matching the table geometry, so the real rows land without a
 * layout jump. Widths are deterministic but uneven, which reads as content
 * rather than as a grid of grey boxes.
 */
const SKELETON_WIDTHS = ['w-full', 'w-10/12', 'w-8/12', 'w-9/12', 'w-7/12', 'w-11/12'] as const

export function TableSkeleton({
  rows = 8,
  columns,
  compact,
}: {
  rows?: number
  columns: { width?: string; align?: 'left' | 'right' }[]
  compact?: boolean
}) {
  return (
    <tbody className="divide-y divide-line-subtle" aria-busy>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex} className={compact ? 'h-row-compact' : 'h-row'}>
          {columns.map((column, columnIndex) => (
            <td key={columnIndex} className="px-3 py-1.5">
              <Skeleton
                className={cn(
                  'h-3',
                  SKELETON_WIDTHS[(rowIndex + columnIndex * 2) % SKELETON_WIDTHS.length],
                  column.align === 'right' && 'ml-auto',
                )}
              />
            </td>
          ))}
        </tr>
      ))}
      <tr className="sr-only">
        <td colSpan={columns.length}>Caricamento in corso…</td>
      </tr>
    </tbody>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact,
}: {
  icon?: LucideIcon
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
        className,
      )}
    >
      {Icon ? (
        <span
          className="inline-flex size-9 items-center justify-center rounded-md border border-line-subtle bg-surface-sunken text-fg-muted"
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
      ) : null}
      <div className="flex max-w-[46ch] flex-col gap-1">
        <p className="text-subsection-title text-fg">{title}</p>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>
      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = 'Non è stato possibile caricare i dati',
  description,
  onRetry,
  className,
  compact,
}: {
  title?: string
  description?: React.ReactNode
  onRetry?: () => void
  className?: string
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className,
      )}
    >
      <span
        className="inline-flex size-9 items-center justify-center rounded-md border border-danger-line bg-danger-subtle text-danger"
        aria-hidden
      >
        <AlertTriangle className="size-4" />
      </span>
      <div className="flex max-w-[46ch] flex-col gap-1">
        <p className="text-subsection-title text-fg">{title}</p>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button variant="secondary" size="sm" icon={<RefreshCw />} onClick={onRetry}>
          Riprova
        </Button>
      ) : null}
    </div>
  )
}

/**
 * Shown when the Supabase project is reachable but the Work-Hub schema has not
 * been applied yet. Distinguishing this from a generic error saves the first
 * five minutes of every new deployment.
 */
export function SchemaMissingState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-6 py-12 text-center',
        className,
      )}
      role="alert"
    >
      <span
        className="inline-flex size-9 items-center justify-center rounded-md border border-warning-line bg-warning-subtle text-warning"
        aria-hidden
      >
        <DatabaseZap className="size-4" />
      </span>
      <div className="flex max-w-[52ch] flex-col gap-1">
        <p className="text-subsection-title text-fg">Database da inizializzare</p>
        <p className="text-body-sm text-fg-muted">
          Lo schema di Work-Hub non è ancora presente su questo progetto Supabase. Apri il SQL
          editor del progetto e applica il contenuto di{' '}
          <code className="rounded-xs bg-surface-sunken px-1 text-caption text-fg-secondary">
            supabase/schema.sql
          </code>
          , poi ricarica la pagina.
        </p>
      </div>
    </div>
  )
}

/** Persistent banner while the browser reports no connectivity. */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false)

  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className={cn(
        'flex items-center justify-center gap-2 border-b border-warning-line bg-warning-subtle',
        'px-4 py-1.5 text-meta text-warning-text',
      )}
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      Sei offline. Le modifiche non verranno salvate finché la connessione non torna.
    </div>
  )
}

/** Inline “nothing here yet” row used inside drawers and small panels. */
export function InlineEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-body-sm text-fg-muted">{children}</p>
}
