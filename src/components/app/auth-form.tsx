'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Heading block shared by every auth screen. */
export function AuthHeading({
  title,
  description,
}: {
  title: string
  description?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-1.5">
      <h1 className="text-display text-fg">{title}</h1>
      {description ? (
        <p className="max-w-[46ch] text-body-sm text-fg-secondary">{description}</p>
      ) : null}
    </div>
  )
}

/** Form-level error: one line, above the fields, with an icon and a role. */
export function FormAlert({
  tone = 'danger',
  children,
  className,
}: {
  tone?: 'danger' | 'success' | 'info' | 'warning'
  children: React.ReactNode
  className?: string
}) {
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle
  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-md border px-3 py-2 text-body-sm',
        tone === 'danger' && 'border-danger-line bg-danger-subtle text-danger-text',
        tone === 'success' && 'border-success-line bg-success-subtle text-success-text',
        tone === 'info' && 'border-info-line bg-info-subtle text-info-text',
        tone === 'warning' && 'border-warning-line bg-warning-subtle text-warning-text',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/** Footer line linking to the complementary auth action. */
export function AuthFooterLink({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-body-sm text-fg-muted">{children}</p>
}
