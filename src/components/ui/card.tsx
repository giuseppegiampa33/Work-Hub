import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Card.
 *
 * Reserved for dashboard summaries and self-contained panels. Lists, tables and
 * ticket rows are **not** cards: they live directly on a bordered surface.
 * No shadow — grouping is done with a hairline border.
 */
export function Card({
  className,
  children,
  as: Component = 'section',
  ...props
}: React.ComponentPropsWithoutRef<'section'> & { as?: 'section' | 'div' | 'article' }) {
  return (
    <Component
      className={cn('rounded-lg border border-line bg-surface', className)}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardHeader({
  title,
  description,
  action,
  className,
  compact,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <header
      className={cn(
        'flex items-start justify-between gap-3 border-b border-line-subtle',
        compact ? 'px-4 py-2.5' : 'px-4 py-3',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="truncate text-subsection-title text-fg">{title}</h2>
        {description ? <p className="text-meta text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}

export function CardBody({
  className,
  children,
  padded = true,
}: {
  className?: string
  children: React.ReactNode
  padded?: boolean
}) {
  return <div className={cn(padded && 'p-4', className)}>{children}</div>
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <footer
      className={cn(
        'flex items-center justify-between gap-2 border-t border-line-subtle bg-surface-muted px-4 py-2.5',
        className,
      )}
    >
      {children}
    </footer>
  )
}

/**
 * Stat tile.
 *
 * Contract: label (sentence case) · value · optional delta · optional footnote.
 * The value uses proportional figures — `tabular-nums` is for columns of
 * numbers, and at this size it makes short values look loose.
 */
export function StatTile({
  label,
  value,
  unit,
  delta,
  footnote,
  tone = 'neutral',
  icon,
  href,
  className,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  delta?: { value: string; direction: 'up' | 'down' | 'flat'; goodDirection?: 'up' | 'down' }
  footnote?: React.ReactNode
  tone?: 'neutral' | 'warning' | 'danger' | 'brand'
  icon?: React.ReactNode
  href?: string
  className?: string
}) {
  const deltaTone = (() => {
    if (!delta || delta.direction === 'flat') return 'text-fg-muted'
    const good = delta.goodDirection ?? 'up'
    return delta.direction === good ? 'text-success-text' : 'text-danger-text'
  })()

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-label text-fg-secondary">{label}</span>
        {icon ? (
          <span
            className={cn(
              '[&_svg]:size-4',
              tone === 'danger'
                ? 'text-danger'
                : tone === 'warning'
                  ? 'text-warning'
                  : tone === 'brand'
                    ? 'text-brand'
                    : 'text-fg-disabled',
            )}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span
          className={cn(
            'text-metric',
            tone === 'danger' ? 'text-danger-text' : tone === 'warning' ? 'text-warning-text' : 'text-fg',
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-meta text-fg-muted">{unit}</span> : null}
        {delta ? <span className={cn('ml-auto text-meta', deltaTone)}>{delta.value}</span> : null}
      </div>
      {footnote ? <p className="mt-1 text-meta text-fg-muted">{footnote}</p> : null}
    </>
  )

  const shared = cn(
    'block rounded-lg border bg-surface p-3.5 text-left',
    tone === 'danger'
      ? 'border-danger-line'
      : tone === 'warning'
        ? 'border-warning-line'
        : 'border-line',
    href &&
      'transition-colors duration-fast ease-standard hover:border-line-strong hover:bg-surface-hover focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.45)]',
    className,
  )

  if (href) {
    return (
      <Link href={href} className={shared}>
        {body}
      </Link>
    )
  }

  return <div className={shared}>{body}</div>
}
