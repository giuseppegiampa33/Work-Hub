'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spinner } from './spinner'

/**
 * Buttons.
 *
 * Hover and active states change colour only — never scale. Focus is a 2px ring
 * with a surface-coloured offset so it stays visible on any background.
 * `loading` keeps the button's width stable by swapping the leading icon slot
 * for a spinner instead of replacing the label.
 */
const buttonVariants = cva(
  [
    'relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap',
    'font-sans font-medium outline-none',
    'transition-colors duration-fast ease-standard',
    'disabled:pointer-events-none disabled:cursor-not-allowed',
    'focus-visible:ring-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand text-brand-contrast',
          'hover:bg-brand-hover active:bg-brand-active',
          'disabled:bg-surface-sunken disabled:text-fg-disabled',
        ],
        secondary: [
          'border border-line bg-surface text-fg',
          'hover:bg-surface-hover hover:border-line-strong active:bg-surface-active',
          'disabled:bg-surface-muted disabled:text-fg-disabled disabled:border-line-subtle',
        ],
        ghost: [
          'text-fg-secondary',
          'hover:bg-surface-hover hover:text-fg active:bg-surface-active',
          'disabled:text-fg-disabled disabled:bg-transparent',
        ],
        subtle: [
          'bg-brand-subtle text-brand-text',
          'hover:bg-brand-subtle-hover active:bg-brand-line',
          'disabled:bg-surface-sunken disabled:text-fg-disabled',
        ],
        destructive: [
          'bg-danger text-fg-inverse',
          'hover:bg-danger-text active:bg-danger-text',
          'disabled:bg-surface-sunken disabled:text-fg-disabled',
        ],
        'destructive-outline': [
          'border border-danger-line bg-surface text-danger-text',
          'hover:bg-danger-subtle active:bg-danger-subtle',
          'disabled:bg-surface-muted disabled:text-fg-disabled disabled:border-line-subtle',
        ],
        link: [
          'text-brand-text underline decoration-brand-line underline-offset-2',
          'hover:decoration-brand active:text-brand-active',
          'disabled:text-fg-disabled disabled:no-underline',
        ],
      },
      size: {
        xs: 'h-7 rounded-sm px-2 text-caption',
        sm: 'h-8 rounded-sm px-2.5 text-meta',
        md: 'h-9 rounded-md px-3 text-body-sm',
        lg: 'h-10 rounded-md px-4 text-body',
        /** Full-width primary action on mobile forms. */
        block: 'h-11 w-full rounded-md px-4 text-body',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    /** Rendered before the label; replaced by a spinner while loading. */
    icon?: React.ReactNode
    iconAfter?: React.ReactNode
  }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    disabled,
    icon,
    iconAfter,
    children,
    type = 'button',
    ...props
  },
  ref,
) {
  const leading = loading ? <Spinner size={size === 'xs' || size === 'sm' ? 12 : 14} /> : icon

  const leadingNode = leading ? (
    <span
      key="leading"
      className="-ml-0.5 inline-flex shrink-0 items-center [&_svg]:size-4"
      aria-hidden
    >
      {leading}
    </span>
  ) : null

  const trailingNode = iconAfter ? (
    <span
      key="trailing"
      className="-mr-0.5 inline-flex shrink-0 items-center [&_svg]:size-4"
      aria-hidden
    >
      {iconAfter}
    </span>
  ) : null

  const shared = {
    ref,
    'aria-busy': loading || undefined,
    className: cn(
      buttonVariants({ variant, size }),
      'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.5)]',
      className,
    ),
    ...props,
  }

  /**
   * `asChild` renders the caller's element (usually a `next/link`) with the
   * button's styling. Radix's Slot accepts exactly one child, so the icons are
   * merged *into* that child rather than placed beside it.
   */
  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{
      children?: React.ReactNode
    }>
    return (
      <Slot {...shared} data-disabled={disabled || loading || undefined}>
        {React.cloneElement(
          child,
          undefined,
          leadingNode,
          child.props.children,
          trailingNode,
        )}
      </Slot>
    )
  }

  return (
    <button {...shared} type={type} disabled={disabled || loading}>
      {leadingNode}
      {children}
      {trailingNode}
    </button>
  )
})

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md',
    'transition-colors duration-fast ease-standard outline-none',
    'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-surface)),0_0_0_4px_rgb(var(--color-focus)/0.5)]',
    'disabled:pointer-events-none disabled:text-fg-disabled',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        ghost: 'text-fg-secondary hover:bg-surface-hover hover:text-fg active:bg-surface-active',
        secondary:
          'border border-line bg-surface text-fg-secondary hover:bg-surface-hover hover:text-fg',
        primary: 'bg-brand text-brand-contrast hover:bg-brand-hover active:bg-brand-active',
        destructive: 'text-danger-text hover:bg-danger-subtle',
      },
      size: {
        sm: 'size-7 [&_svg]:size-3.5',
        md: 'size-8 [&_svg]:size-4',
        lg: 'size-9 [&_svg]:size-4',
        /** Meets the 44px touch target on mobile toolbars. */
        touch: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
)

export type IconButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: icon-only controls must expose an accessible name. */
    label: string
    loading?: boolean
    asChild?: boolean
  }

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, variant, size, label, loading, disabled, children, type = 'button', asChild, ...props },
    ref,
  ) {
    const Component = asChild ? Slot : 'button'
    return (
      <Component
        ref={ref}
        type={asChild ? undefined : type}
        aria-label={label}
        title={label}
        aria-busy={loading || undefined}
        disabled={disabled || loading}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Spinner size={14} /> : children}
      </Component>
    )
  },
)

export { buttonVariants, iconButtonVariants }
