'use client'

import {
  ArrowRightLeft,
  CalendarPlus,
  Clock,
  Flag,
  MessageSquare,
  Paperclip,
  Plus,
  UserCog,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  TICKET_PRIORITY_DESCRIPTORS,
  TICKET_STATUS_DESCRIPTORS,
  type TicketPriority,
  type TicketStatus,
} from '@/config/tickets'
import type { MemberOption } from '@/features/lookups/queries'
import { memberLabel } from '@/features/lookups/queries'
import { formatDuration, formatTimeAgo, formatDateShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { InlineEmpty, Skeleton } from '@/components/ui/states'
import type { TicketTimelineEntry } from '../queries'

const ICONS: Record<string, LucideIcon> = {
  created: Plus,
  status_changed: ArrowRightLeft,
  priority_changed: Flag,
  assignee_changed: UserCog,
  due_date_changed: CalendarPlus,
  client_changed: ArrowRightLeft,
  comment_added: MessageSquare,
  attachment_added: Paperclip,
  event_linked: CalendarPlus,
  time_logged: Clock,
}

/**
 * Ticket history.
 *
 * Written by database triggers, not by the client — so the record is complete
 * even when a status changes through a bulk update or a direct API call.
 */
export function TicketTimeline({
  entries,
  members,
  isPending,
}: {
  entries: TicketTimelineEntry[]
  members: MemberOption[]
  isPending: boolean
}) {
  if (isPending) {
    return (
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <li key={index} className="flex gap-2.5">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-7/12" />
          </li>
        ))}
      </ul>
    )
  }

  if (entries.length === 0) {
    return <InlineEmpty>Nessuna attività registrata.</InlineEmpty>
  }

  const nameFor = (userId: string | null) => {
    if (!userId) return 'nessuno'
    const member = members.find((item) => item.userId === userId)
    return member ? memberLabel(member) : 'un membro'
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry, index) => {
        const Icon = ICONS[entry.type] ?? ArrowRightLeft
        const actor = entry.actor?.full_name?.trim() || entry.actor?.email || 'Sistema'

        return (
          <li key={entry.id} className="relative flex gap-2.5 pb-3 last:pb-0">
            {index < entries.length - 1 ? (
              <span
                className="absolute left-[11px] top-6 h-[calc(100%-18px)] w-px bg-line-subtle"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-raised mt-0.5 inline-flex size-[22px] shrink-0 items-center justify-center',
                'rounded-full border border-line-subtle bg-surface text-fg-muted',
              )}
              aria-hidden
            >
              <Icon className="size-3" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
              <p className="text-body-sm text-fg-secondary">
                <span className="font-medium text-fg">{actor}</span>{' '}
                {describeEvent(entry, nameFor)}
              </p>
              <span className="text-caption text-fg-muted">{formatTimeAgo(entry.created_at)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function describeEvent(
  entry: TicketTimelineEntry,
  nameFor: (userId: string | null) => string,
): string {
  switch (entry.type) {
    case 'created':
      return 'ha aperto il ticket'
    case 'status_changed':
      return `ha portato lo stato da “${statusLabelOf(entry.from_value)}” a “${statusLabelOf(entry.to_value)}”`
    case 'priority_changed':
      return `ha cambiato la priorità da “${priorityLabelOf(entry.from_value)}” a “${priorityLabelOf(entry.to_value)}”`
    case 'assignee_changed':
      return entry.to_value
        ? `ha assegnato il ticket a ${nameFor(entry.to_value)}`
        : 'ha rimosso l’assegnazione'
    case 'due_date_changed':
      return entry.to_value
        ? `ha impostato la scadenza al ${formatDateShort(entry.to_value)}`
        : 'ha rimosso la scadenza'
    case 'client_changed':
      return 'ha cambiato il cliente collegato'
    case 'comment_added':
      return 'ha aggiunto un commento'
    case 'attachment_added':
      return 'ha allegato un file'
    case 'event_linked':
      return 'ha collegato un’attività in calendario'
    case 'time_logged':
      return `ha registrato ${formatDuration(Number(entry.to_value ?? 0))}`
    default:
      return 'ha aggiornato il ticket'
  }
}

function statusLabelOf(value: string | null): string {
  if (!value) return '—'
  return TICKET_STATUS_DESCRIPTORS[value as TicketStatus]?.label ?? value
}

function priorityLabelOf(value: string | null): string {
  if (!value) return '—'
  return TICKET_PRIORITY_DESCRIPTORS[value as TicketPriority]?.label ?? value
}
