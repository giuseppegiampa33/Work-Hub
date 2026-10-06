'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex size-4 shrink-0 items-center justify-center rounded-xs border',
        'border-line-strong bg-surface',
        'transition-colors duration-fast ease-standard',
        'hover:border-brand',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.5)]',
        'data-[state=checked]:border-brand data-[state=checked]:bg-brand',
        'data-[state=indeterminate]:border-brand data-[state=indeterminate]:bg-brand',
        'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-brand-contrast">
        {props.checked === 'indeterminate' ? (
          <Minus className="size-3" strokeWidth={3} aria-hidden />
        ) : (
          <Check className="size-3" strokeWidth={3} aria-hidden />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})

/** Checkbox + label + optional description, with the whole row clickable. */
export function CheckboxField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(next) => onCheckedChange(next === true)}
        disabled={disabled}
        className="mt-0.5"
      />
      <div className="flex flex-col gap-0.5">
        <label
          htmlFor={id}
          className={cn(
            'cursor-pointer text-body-sm text-fg',
            disabled && 'cursor-not-allowed text-fg-disabled',
          )}
        >
          {label}
        </label>
        {description ? <span className="text-meta text-fg-muted">{description}</span> : null}
      </div>
    </div>
  )
}

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(function RadioGroup({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Root ref={ref} className={cn('flex flex-col gap-2', className)} {...props} />
  )
})

export const RadioGroupItem = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(function RadioGroupItem({ className, ...props }, ref) {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
        'border-line-strong bg-surface',
        'transition-colors duration-fast ease-standard',
        'hover:border-brand',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.5)]',
        'data-[state=checked]:border-brand',
        'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="size-2 rounded-full bg-brand" />
    </RadioGroupPrimitive.Item>
  )
})

/**
 * Radio presented as a selectable card — used where the choice carries an
 * explanation (onboarding: create vs join an organization).
 */
export function RadioCard({
  value,
  id,
  title,
  description,
  icon,
  disabled,
}: {
  value: string
  id: string
  title: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'group flex cursor-pointer items-start gap-3 rounded-md border border-line bg-surface p-3',
        'transition-colors duration-fast ease-standard',
        'hover:border-line-strong hover:bg-surface-hover',
        'has-[:checked]:border-brand has-[:checked]:bg-brand-subtle/50',
        'has-[:focus-visible]:shadow-[0_0_0_3px_rgb(var(--color-focus)/0.14)]',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <RadioGroupItem value={value} id={id} disabled={disabled} className="mt-0.5" />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-body-sm font-medium text-fg">
          {icon ? (
            <span className="text-fg-muted [&_svg]:size-4" aria-hidden>
              {icon}
            </span>
          ) : null}
          {title}
        </span>
        {description ? <span className="text-meta text-fg-muted">{description}</span> : null}
      </div>
    </label>
  )
}

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
        'bg-line-strong p-0.5',
        'transition-colors duration-fast ease-standard',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.5)]',
        'data-[state=checked]:bg-brand',
        'disabled:cursor-not-allowed disabled:bg-line',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-surface',
          'transition-transform duration-fast ease-standard gpu',
          'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitive.Root>
  )
})

/** Switch + label row, used in settings and in the quick time-entry form. */
export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-body-sm text-fg">
          {label}
        </label>
        {description ? <span className="text-meta text-fg-muted">{description}</span> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-0.5"
      />
    </div>
  )
}
