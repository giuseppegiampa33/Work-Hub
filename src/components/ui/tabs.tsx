'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/**
 * Tabs. An underline indicator rather than a filled pill: it keeps the row
 * aligned with the content below and adds no extra radius to the page.
 */
export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'relative flex items-center gap-1 overflow-x-auto border-b border-line-subtle scrollbar-none',
        className,
      )}
      {...props}
    />
  )
})

export const TabsTrigger = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, children, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'relative inline-flex shrink-0 items-center gap-2 px-2.5 pb-2.5 pt-2',
        'text-body-sm font-medium text-fg-muted outline-none',
        'transition-colors duration-fast ease-standard',
        'hover:text-fg-secondary',
        'focus-visible:rounded-sm focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
        'data-[state=active]:text-fg',
        'after:absolute after:inset-x-1.5 after:-bottom-px after:h-0.5 after:rounded-t-[1px]',
        'after:bg-transparent after:transition-colors after:duration-fast',
        'data-[state=active]:after:bg-brand',
        'disabled:text-fg-disabled',
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
})

export const TabsContent = React.forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('outline-none focus-visible:shadow-none', className)}
      {...props}
    />
  )
})

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: React.ReactNode
  /** Accessible name when the option renders icon-only. */
  srLabel?: string
}

/**
 * Segmented control for mutually exclusive view switches (week owner filter,
 * report period). Keyboard-navigable via native radio semantics.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  name,
  size = 'md',
  className,
  iconOnly,
}: {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  name: string
  size?: 'sm' | 'md'
  className?: string
  iconOnly?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={iconOnly ? (option.srLabel ?? option.label) : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-sm font-medium',
              'transition-colors duration-fast ease-standard outline-none',
              'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
              size === 'sm' ? 'h-6 px-2 text-caption' : 'h-7 px-2.5 text-meta',
              iconOnly && (size === 'sm' ? 'w-6 px-0' : 'w-7 px-0'),
              active
                ? 'bg-surface text-fg shadow-[0_1px_1px_rgb(28_28_26/0.04)]'
                : 'text-fg-muted hover:text-fg-secondary',
              '[&_svg]:size-3.5',
            )}
          >
            {option.icon}
            {iconOnly ? null : option.label}
          </button>
        )
      })}
    </div>
  )
}
