'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/* Dropdown menu                                                              */
/* -------------------------------------------------------------------------- */

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup
export const DropdownMenuSub = DropdownMenuPrimitive.Sub
export const DropdownMenuSubTrigger = DropdownMenuPrimitive.SubTrigger

const surfaceClasses = [
  'z-dropdown min-w-[200px] overflow-hidden rounded-md border border-line bg-surface p-1',
  'shadow-popover',
  'data-[state=open]:animate-popover-in',
].join(' ')

export const DropdownMenuContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 6, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(surfaceClasses, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
})

const itemClasses = [
  'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5',
  'text-body-sm text-fg outline-none',
  'transition-colors duration-instant',
  'data-[highlighted]:bg-surface-hover',
  'data-[disabled]:pointer-events-none data-[disabled]:text-fg-disabled',
  '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted',
].join(' ')

export const DropdownMenuItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    tone?: 'default' | 'danger'
    shortcut?: string
  }
>(function DropdownMenuItem({ className, tone = 'default', shortcut, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      className={cn(
        itemClasses,
        tone === 'danger' &&
          'text-danger-text data-[highlighted]:bg-danger-subtle [&_svg]:text-danger',
        className,
      )}
      {...props}
    >
      {children}
      {shortcut ? (
        <span className="ml-auto pl-4 text-caption text-fg-disabled">{shortcut}</span>
      ) : null}
    </DropdownMenuPrimitive.Item>
  )
})

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      className={cn(itemClasses, 'pr-7', className)}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute right-2">
        <Check className="size-3.5 !text-brand" aria-hidden />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  )
})

export const DropdownMenuRadioItem = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(function DropdownMenuRadioItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      className={cn(itemClasses, 'pr-7', className)}
      {...props}
    >
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute right-2">
        <Check className="size-3.5 !text-brand" aria-hidden />
      </DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.RadioItem>
  )
})

export const DropdownMenuLabel = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(function DropdownMenuLabel({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      className={cn('px-2 pb-1 pt-2 text-table-heading uppercase text-fg-muted', className)}
      {...props}
    />
  )
})

export const DropdownMenuSeparator = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      className={cn('-mx-1 my-1 h-px bg-line-subtle', className)}
      {...props}
    />
  )
})

export const DropdownMenuSubContent = React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(function DropdownMenuSubContent({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        ref={ref}
        className={cn(surfaceClasses, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
})

export function DropdownMenuSubTriggerRow({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger>) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn(itemClasses, 'data-[state=open]:bg-surface-hover', className)}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto size-3.5" aria-hidden />
    </DropdownMenuPrimitive.SubTrigger>
  )
}

/* -------------------------------------------------------------------------- */
/* Popover                                                                    */
/* -------------------------------------------------------------------------- */

export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverAnchor = PopoverPrimitive.Anchor
export const PopoverClose = PopoverPrimitive.Close

export const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { padded?: boolean }
>(function PopoverContent(
  { className, align = 'start', sideOffset = 6, padded = true, ...props },
  ref,
) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-popover min-w-[220px] overflow-hidden rounded-md border border-line bg-surface shadow-popover',
          'data-[state=open]:animate-popover-in',
          padded && 'p-3',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})

/* -------------------------------------------------------------------------- */
/* Tooltip                                                                    */
/* -------------------------------------------------------------------------- */

export const TooltipProvider = TooltipPrimitive.Provider

/**
 * Tooltips explain icon-only controls and truncated values.
 * They never carry information that exists nowhere else — `aria-label` does the
 * accessible work, the tooltip is the sighted hint.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delay = 320,
  shortcut,
}: {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delay?: number
  shortcut?: string
}) {
  return (
    <TooltipPrimitive.Root delayDuration={delay}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            'z-popover flex max-w-[260px] items-center gap-2 rounded-sm px-2 py-1',
            'bg-fg text-caption text-fg-inverse shadow-popover',
            'data-[state=delayed-open]:animate-fade-in',
          )}
        >
          <span>{content}</span>
          {shortcut ? (
            <span className="rounded-xs bg-fg-inverse/15 px-1 font-medium">{shortcut}</span>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
