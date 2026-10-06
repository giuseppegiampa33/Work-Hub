'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import {
  TICKET_PRIORITY_DESCRIPTORS,
  TICKET_STATUS_DESCRIPTORS,
  type TicketPriority,
  type TicketStatus,
  type Tone,
} from '@/config/tickets'
import { cn } from '@/lib/utils'

/**
 * Badges carry state. Three rules, applied everywhere:
 *  - the label is always rendered, so meaning never depends on colour;
 *  - 6px radius, not a pill — this is a dense data UI, not a marketing page;
 *  - the tone maps to a semantic token, never to a raw hue.
 */
const badgeVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-sm border font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'border-neutral-line bg-neutral-subtle text-neutral-text',
        brand: 'border-brand-line bg-brand-subtle text-brand-text',
        info: 'border-info-line bg-info-subtle text-info-text',
        success: 'border-success-line bg-success-subtle text-success-text',
        warning: 'border-warning-line bg-warning-subtle text-warning-text',
        danger: 'border-danger-line bg-danger-subtle text-danger-text',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-caption',
        md: 'px-2 py-1 text-meta',
      },
      variant: {
        soft: '',
        outline: 'bg-surface',
        solid: '',
      },
    },
    compoundVariants: [
      { variant: 'solid', tone: 'brand', class: 'border-brand bg-brand text-brand-contrast' },
      { variant: 'solid', tone: 'info', class: 'border-info bg-info text-fg-inverse' },
      { variant: 'solid', tone: 'success', class: 'border-success bg-success text-fg-inverse' },
      { variant: 'solid', tone: 'warning', class: 'border-warning bg-warning text-fg-inverse' },
      { variant: 'solid', tone: 'danger', class: 'border-danger bg-danger text-fg-inverse' },
      { variant: 'solid', tone: 'neutral', class: 'border-neutral bg-neutral text-fg-inverse' },
    ],
    defaultVariants: { tone: 'neutral', size: 'sm', variant: 'soft' },
  },
)

export type BadgeProps = React.ComponentPropsWithoutRef<'span'> &
  VariantProps<typeof badgeVariants> & {
    /** A 6px dot before the label — the second channel next to the text. */
    dot?: boolean
  }

export function Badge({ className, tone, size, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size, variant }), className)} {...props}>
      {dot ? (
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            tone === 'brand' && 'bg-brand',
            tone === 'info' && 'bg-info',
            tone === 'success' && 'bg-success',
            tone === 'warning' && 'bg-warning',
            tone === 'danger' && 'bg-danger',
            (!tone || tone === 'neutral') && 'bg-neutral',
          )}
          aria-hidden
        />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  )
}

export function TicketStatusBadge({
  status,
  size = 'sm',
  short = false,
  className,
}: {
  status: TicketStatus
  size?: 'sm' | 'md'
  short?: boolean
  className?: string
}) {
  const descriptor = TICKET_STATUS_DESCRIPTORS[status]
  return (
    <Badge tone={descriptor.tone} size={size} dot className={className}>
      {short ? descriptor.short : descriptor.label}
    </Badge>
  )
}

/**
 * Priority indicator: four marks, filled up to the level, plus the label.
 * The marks make the ordering readable at a glance; the label makes it
 * readable without colour.
 */
export function TicketPriorityBadge({
  priority,
  showLabel = true,
  className,
}: {
  priority: TicketPriority
  showLabel?: boolean
  className?: string
}) {
  const descriptor = TICKET_PRIORITY_DESCRIPTORS[priority]
  const fill =
    descriptor.tone === 'danger'
      ? 'bg-danger'
      : descriptor.tone === 'warning'
        ? 'bg-warning'
        : 'bg-fg-muted'

  return (
    <span
      className={cn('inline-flex items-center gap-1.5', className)}
      title={`Priorità: ${descriptor.label}`}
    >
      <span className="flex items-end gap-px" aria-hidden>
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={cn(
              'w-1 rounded-[1px]',
              level === 1 && 'h-1.5',
              level === 2 && 'h-2',
              level === 3 && 'h-2.5',
              level === 4 && 'h-3',
              level <= descriptor.marks ? fill : 'bg-line',
            )}
          />
        ))}
      </span>
      {showLabel ? (
        <span
          className={cn(
            'text-meta',
            descriptor.tone === 'danger'
              ? 'text-danger-text'
              : descriptor.tone === 'warning'
                ? 'text-warning-text'
                : 'text-fg-secondary',
          )}
        >
          {descriptor.label}
        </span>
      ) : (
        <span className="sr-only">Priorità {descriptor.label}</span>
      )}
    </span>
  )
}

/** Removable filter chip shown in a table toolbar. */
export function FilterChip({
  label,
  value,
  onRemove,
  tone = 'neutral',
}: {
  label: string
  value: string
  onRemove: () => void
  tone?: Tone
}) {
  return (
    <span
      className={cn(
        badgeVariants({ tone, size: 'sm', variant: 'outline' }),
        'pr-0.5 transition-colors duration-fast',
      )}
    >
      <span className="text-fg-muted">{label}:</span>
      <span className="truncate font-medium">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Rimuovi filtro ${label}`}
        className={cn(
          'ml-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-xs',
          'text-fg-muted transition-colors duration-fast',
          'hover:bg-surface-active hover:text-fg',
          'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
        )}
      >
        <X className="size-3" aria-hidden />
      </button>
    </span>
  )
}

/** Small count next to a tab or nav item. */
export function CountBadge({
  value,
  tone = 'neutral',
  className,
}: {
  value: number
  tone?: Tone
  className?: string
}) {
  if (value <= 0) return null
  return (
    <span
      data-numeric
      className={cn(
        'inline-flex min-w-4 items-center justify-center rounded-sm px-1 text-caption font-medium',
        tone === 'danger' ? 'bg-danger-subtle text-danger-text' : 'bg-surface-sunken text-fg-secondary',
        className,
      )}
    >
      {value > 99 ? '99+' : value}
    </span>
  )
}

export { badgeVariants }
