'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fieldSurface, inputSizes } from './input'

export const Select = SelectPrimitive.Root
export const SelectGroup = SelectPrimitive.Group
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    inputSize?: keyof typeof inputSizes
    invalid?: boolean
  }
>(function SelectTrigger({ className, children, inputSize = 'md', invalid, ...props }, ref) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldSurface,
        inputSizes[inputSize],
        'flex items-center justify-between gap-2 text-left',
        'data-[placeholder]:text-fg-disabled',
        '[&>span]:truncate',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-fg-muted" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})

export const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(function SelectContent({ className, children, position = 'popper', ...props }, ref) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={4}
        className={cn(
          'relative z-popover max-h-80 min-w-[var(--radix-select-trigger-width)] overflow-hidden',
          'rounded-md border border-line bg-surface shadow-popover',
          'data-[state=open]:animate-popover-in',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="max-h-80 overflow-y-auto p-1">
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})

export const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(function SelectLabel({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn('px-2 pb-1 pt-2 text-table-heading uppercase text-fg-muted', className)}
      {...props}
    />
  )
})

export const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { hint?: React.ReactNode }
>(function SelectItem({ className, children, hint, ...props }, ref) {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-sm',
        'py-1.5 pl-2 pr-7 text-body-sm text-fg outline-none',
        'data-[highlighted]:bg-surface-hover data-[highlighted]:text-fg',
        'data-[state=checked]:font-medium',
        'data-[disabled]:pointer-events-none data-[disabled]:text-fg-disabled',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      {hint ? <span className="ml-auto text-caption text-fg-muted">{hint}</span> : null}
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex">
        <Check className="size-3.5 text-brand" aria-hidden />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
})

export const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(function SelectSeparator({ className, ...props }, ref) {
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-line-subtle', className)}
      {...props}
    />
  )
})

/**
 * Convenience wrapper for the common case: a flat list of options with an
 * optional empty placeholder. Avoids 15 lines of primitives per form field.
 */
export function SimpleSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Seleziona…',
  inputSize,
  invalid,
  disabled,
  id,
  className,
  allowEmpty,
  emptyLabel = 'Nessuno',
  'aria-describedby': describedBy,
}: {
  value: string | null | undefined
  onValueChange: (value: string | null) => void
  options: { value: string; label: string; hint?: string; disabled?: boolean }[]
  placeholder?: string
  inputSize?: keyof typeof inputSizes
  invalid?: boolean
  disabled?: boolean
  id?: string
  className?: string
  allowEmpty?: boolean
  emptyLabel?: string
  'aria-describedby'?: string
}) {
  const EMPTY = '__empty__'
  return (
    <Select
      value={value ?? (allowEmpty ? EMPTY : undefined)}
      onValueChange={(next) => onValueChange(next === EMPTY ? null : next)}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        inputSize={inputSize}
        invalid={invalid}
        className={className}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty ? (
          <SelectItem value={EMPTY} className="text-fg-muted">
            {emptyLabel}
          </SelectItem>
        ) : null}
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            hint={option.hint}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
