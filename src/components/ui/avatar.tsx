'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, initials, toneFromId } from '@/lib/utils'

const sizeClasses = {
  xs: 'size-5 text-caption',
  sm: 'size-6 text-caption',
  md: 'size-7 text-caption',
  lg: 'size-9 text-meta',
  xl: 'size-16 text-section-title',
} as const

const toneClasses = {
  brand: 'bg-brand-subtle text-brand-text',
  info: 'bg-info-subtle text-info-text',
  success: 'bg-success-subtle text-success-text',
  warning: 'bg-warning-subtle text-warning-text',
  danger: 'bg-danger-subtle text-danger-text',
} as const

export type AvatarProps = {
  name?: string | null
  email?: string | null
  src?: string | null
  /** Used to derive a stable tint; falls back to the name. */
  id?: string
  size?: keyof typeof sizeClasses
  className?: string
}

/**
 * Avatar. Circular by exception — it is the one element in Work-Hub that is
 * allowed a full radius, because it represents a person.
 */
export function Avatar({ name, email, src, id, size = 'md', className }: AvatarProps) {
  const displayName = name?.trim() || email?.trim() || ''
  const tone = toneClasses[toneFromId(id ?? displayName ?? 'anon')]

  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 select-none overflow-hidden rounded-full',
        'ring-1 ring-inset ring-fg/5',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={displayName}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 200 : 0}
        className={cn('flex size-full items-center justify-center font-medium', tone)}
      >
        <span aria-hidden>{initials(displayName)}</span>
        <span className="sr-only">{displayName || 'Non assegnato'}</span>
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

/** Avatar + name, the standard way an assignee appears in a row. */
export function PersonChip({
  name,
  email,
  src,
  id,
  size = 'sm',
  emptyLabel = 'Non assegnato',
  className,
  hideName,
}: AvatarProps & { emptyLabel?: string; hideName?: boolean }) {
  const label = name?.trim() || email?.trim()

  if (!label) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-fg-muted', className)}>
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-full',
            'border border-dashed border-line-strong',
            sizeClasses[size],
          )}
          aria-hidden
        />
        {hideName ? null : <span className="truncate text-body-sm">{emptyLabel}</span>}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <Avatar name={name} email={email} src={src} id={id} size={size} />
      {hideName ? null : <span className="truncate text-body-sm text-fg">{label}</span>}
    </span>
  )
}

/** Overlapping avatars with a `+N` overflow marker. */
export function AvatarGroup({
  people,
  max = 4,
  size = 'sm',
  className,
}: {
  people: { id: string; name?: string | null; email?: string | null; avatarUrl?: string | null }[]
  max?: number
  size?: keyof typeof sizeClasses
  className?: string
}) {
  const visible = people.slice(0, max)
  const overflow = people.length - visible.length

  return (
    <span className={cn('inline-flex items-center', className)}>
      {visible.map((person) => (
        <Avatar
          key={person.id}
          id={person.id}
          name={person.name}
          email={person.email}
          src={person.avatarUrl}
          size={size}
          className="-ml-1.5 ring-2 ring-surface first:ml-0"
        />
      ))}
      {overflow > 0 ? (
        <span
          data-numeric
          className={cn(
            '-ml-1.5 inline-flex items-center justify-center rounded-full',
            'bg-surface-sunken text-fg-secondary ring-2 ring-surface',
            sizeClasses[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </span>
  )
}

/** Organization mark: a square with the initial, or the uploaded logo. */
export function OrgMark({
  name,
  logoUrl,
  size = 'md',
  className,
}: {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dimensions = { sm: 'size-6 text-caption', md: 'size-7 text-meta', lg: 'size-10 text-body' }[
    size
  ]

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-sm',
        'bg-brand font-semibold text-brand-contrast',
        dimensions,
        className,
      )}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- storage URLs are already sized; next/image would add a loader round trip for a 28px mark.
        <img src={logoUrl} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials(name).slice(0, 1)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  )
}
