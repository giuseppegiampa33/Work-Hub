'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared field surface. Inputs, selects, textareas and the combobox trigger all
 * use this recipe so a form row never has two different box models in it.
 */
export const fieldSurface = [
  'w-full rounded-md border bg-surface text-fg',
  'border-line',
  'transition-[border-color,box-shadow] duration-fast ease-standard',
  'hover:border-line-strong',
  'focus-visible:outline-none focus-visible:border-brand',
  'focus-visible:shadow-[0_0_0_3px_rgb(var(--color-focus)/0.14)]',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-disabled disabled:border-line-subtle',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:border-danger',
  'aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_rgb(var(--color-danger)/0.14)]',
].join(' ')

export const inputSizes = {
  sm: 'h-8 px-2.5 text-meta',
  md: 'h-9 px-3 text-body-sm',
  lg: 'h-10 px-3 text-body',
} as const

export type InputProps = Omit<React.ComponentPropsWithoutRef<'input'>, 'size'> & {
  inputSize?: keyof typeof inputSizes
  /** Icon or short unit rendered inside the field, before the value. */
  leading?: React.ReactNode
  /** Icon or short unit rendered inside the field, after the value. */
  trailing?: React.ReactNode
  invalid?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = 'md', leading, trailing, invalid, type = 'text', ...props },
  ref,
) {
  const control = (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      data-numeric={type === 'number' ? 'true' : undefined}
      className={cn(
        fieldSurface,
        inputSizes[inputSize],
        leading ? 'pl-8' : undefined,
        trailing ? 'pr-8' : undefined,
        'placeholder:text-fg-disabled',
        className,
      )}
      {...props}
    />
  )

  if (!leading && !trailing) return control

  return (
    <span className="relative block">
      {leading ? (
        <span
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-muted [&_svg]:size-4"
          aria-hidden
        >
          {leading}
        </span>
      ) : null}
      {control}
      {trailing ? (
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted [&_svg]:size-4"
          aria-hidden
        >
          {trailing}
        </span>
      ) : null}
    </span>
  )
})

export type TextareaProps = React.ComponentPropsWithoutRef<'textarea'> & {
  invalid?: boolean
  /** Grows with the content up to this many rows. */
  autoGrow?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, autoGrow, rows = 4, onChange, ...props },
  ref,
) {
  const innerRef = React.useRef<HTMLTextAreaElement | null>(null)

  const resize = React.useCallback(() => {
    const node = innerRef.current
    if (!node || !autoGrow) return
    node.style.height = 'auto'
    node.style.height = `${Math.min(node.scrollHeight, 420)}px`
  }, [autoGrow])

  React.useEffect(resize, [resize, props.value])

  return (
    <textarea
      ref={(node) => {
        innerRef.current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      rows={rows}
      aria-invalid={invalid || undefined}
      onChange={(event) => {
        onChange?.(event)
        resize()
      }}
      className={cn(
        fieldSurface,
        'min-h-20 resize-y px-3 py-2 text-body-sm leading-[1.45]',
        'placeholder:text-fg-disabled',
        autoGrow && 'resize-none overflow-hidden',
        className,
      )}
      {...props}
    />
  )
})
