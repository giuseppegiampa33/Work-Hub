import * as React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

export const Separator = React.forwardRef<
  React.ComponentRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(function Separator({ className, orientation = 'horizontal', ...props }, ref) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-line-subtle',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
})

/** Keyboard hint, used in the command palette and tooltips. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-xs px-1',
        'border border-line bg-surface-sunken font-sans text-caption font-medium text-fg-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

/** Page section heading used inside settings and detail pages. */
export function SectionHeading({
  title,
  description,
  action,
  className,
  level = 2,
}: {
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
  level?: 2 | 3
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <Heading className="text-section-title text-fg">{title}</Heading>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** Definition row: label on the left, value on the right. Used in drawers. */
export function DetailRow({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 py-1', className)}>
      <dt className="pt-0.5 text-meta text-fg-muted">{label}</dt>
      <dd className="min-w-0 text-body-sm text-fg">{children}</dd>
    </div>
  )
}

/** Monospaced, copyable identifier (invite links, ticket references). */
export function CodeBlock({
  value,
  className,
  wrap,
}: {
  value: string
  className?: string
  wrap?: boolean
}) {
  return (
    <code
      className={cn(
        'block rounded-sm border border-line-subtle bg-surface-sunken px-2 py-1.5',
        'font-mono text-caption text-fg-secondary',
        wrap ? 'break-all' : 'truncate',
        className,
      )}
    >
      {value}
    </code>
  )
}
