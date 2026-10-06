'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_DESCRIPTORS,
  TICKET_STATUSES,
  TICKET_STATUS_DESCRIPTORS,
  type TicketPriority,
  type TicketStatus,
} from '@/config/tickets'
import { cn } from '@/lib/utils'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

const triggerClasses = [
  'inline-flex items-center gap-1 rounded-sm outline-none',
  'transition-shadow duration-fast ease-standard',
  'focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ')

/** Status change from anywhere: the badge itself is the control. */
export function StatusPicker({
  value,
  onChange,
  disabled,
  short,
  size = 'sm',
}: {
  value: TicketStatus
  onChange: (status: TicketStatus) => void
  disabled?: boolean
  short?: boolean
  size?: 'sm' | 'md'
}) {
  if (disabled) return <TicketStatusBadge status={value} short={short} size={size} />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(triggerClasses, 'hover:brightness-[0.98]')}
          aria-label={`Stato: ${TICKET_STATUS_DESCRIPTORS[value].label}. Cambia stato`}
        >
          <TicketStatusBadge status={value} short={short} size={size} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[228px]">
        <DropdownMenuLabel>Stato</DropdownMenuLabel>
        {TICKET_STATUSES.map((status) => (
          <DropdownMenuItem
            key={status}
            onSelect={() => onChange(status)}
            className="justify-between"
          >
            <TicketStatusBadge status={status} />
            {status === value ? <Check className="size-3.5 !text-brand" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function PriorityPicker({
  value,
  onChange,
  disabled,
  showLabel = true,
}: {
  value: TicketPriority
  onChange: (priority: TicketPriority) => void
  disabled?: boolean
  showLabel?: boolean
}) {
  if (disabled) return <TicketPriorityBadge priority={value} showLabel={showLabel} />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(triggerClasses, 'px-0.5 hover:bg-surface-hover')}
          aria-label={`Priorità: ${TICKET_PRIORITY_DESCRIPTORS[value].label}. Cambia priorità`}
        >
          <TicketPriorityBadge priority={value} showLabel={showLabel} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        <DropdownMenuLabel>Priorità</DropdownMenuLabel>
        {TICKET_PRIORITIES.map((priority) => (
          <DropdownMenuItem
            key={priority}
            onSelect={() => onChange(priority)}
            className="justify-between"
          >
            <TicketPriorityBadge priority={priority} />
            {priority === value ? <Check className="size-3.5 !text-brand" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS_DESCRIPTORS[status].label,
}))

export const priorityOptions = TICKET_PRIORITIES.map((priority) => ({
  value: priority,
  label: TICKET_PRIORITY_DESCRIPTORS[priority].label,
}))
