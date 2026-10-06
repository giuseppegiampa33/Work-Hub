'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { optional?: boolean }
>(function Label({ className, optional, children, ...props }, ref) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      className={cn(
        'inline-flex items-baseline gap-1.5 text-label text-fg-secondary',
        'peer-disabled:text-fg-disabled',
        className,
      )}
      {...props}
    >
      {children}
      {optional ? <span className="text-caption text-fg-muted">facoltativo</span> : null}
    </LabelPrimitive.Root>
  )
})

/**
 * Form row. Owns the label/control/description/error wiring so no page has to
 * remember `aria-describedby` by hand, and so the error state looks identical
 * everywhere.
 */
export function Field({
  label,
  htmlFor,
  description,
  error,
  optional,
  required,
  className,
  children,
  /** Renders label and control side by side (settings rows). */
  orientation = 'vertical',
  action,
}: {
  label?: React.ReactNode
  htmlFor?: string
  description?: React.ReactNode
  error?: React.ReactNode
  optional?: boolean
  required?: boolean
  className?: string
  children: React.ReactNode
  orientation?: 'vertical' | 'horizontal'
  action?: React.ReactNode
}) {
  const descriptionId = description && htmlFor ? `${htmlFor}-description` : undefined
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined

  return (
    <div
      className={cn(
        orientation === 'vertical'
          ? 'flex flex-col gap-1.5'
          : 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)] sm:items-center sm:gap-4',
        className,
      )}
      data-field-error={error ? 'true' : undefined}
    >
      {label || action ? (
        <div className="flex items-baseline justify-between gap-2">
          {label ? (
            <Label htmlFor={htmlFor} optional={optional}>
              {label}
              {required ? (
                <span className="text-danger" aria-hidden>
                  *
                </span>
              ) : null}
            </Label>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}

      <div className={cn('flex flex-col gap-1.5', orientation === 'horizontal' && 'sm:order-2')}>
        <FieldControlContext.Provider value={{ descriptionId, errorId, invalid: Boolean(error) }}>
          {children}
        </FieldControlContext.Provider>

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-start gap-1.5 text-meta text-danger-text"
          >
            <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        ) : description ? (
          <p id={descriptionId} className="text-meta text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

type FieldControlValue = {
  descriptionId?: string
  errorId?: string
  invalid: boolean
}

const FieldControlContext = React.createContext<FieldControlValue>({ invalid: false })

/** Lets a control inherit the `aria-*` wiring from its `Field`. */
export function useFieldControl(id?: string) {
  const context = React.useContext(FieldControlContext)
  return {
    id,
    'aria-invalid': context.invalid || undefined,
    'aria-describedby': context.errorId ?? context.descriptionId,
  } as const
}

/** Section heading inside a settings or form card. */
export function FieldSet({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <fieldset className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-1">
        <legend className="text-subsection-title text-fg">{title}</legend>
        {description ? <p className="text-meta text-fg-muted">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  )
}
