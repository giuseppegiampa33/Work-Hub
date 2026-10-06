'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE, PAGE_SIZE } from '@/config/app'
import type { TicketPriority, TicketStatus } from '@/config/tickets'
import { queryKeys, type TicketListFilters } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { escapeFilterValue } from '@/lib/utils'
import type {
  CalendarEventRow,
  TicketAttachmentRow,
  TicketCommentRow,
  TicketEventRow,
  TicketRow,
  TimeEntryRow,
} from '@/types/database'

/**
 * Ticket reads.
 *
 * The list query uses a PostgREST embedded select so client, assignee and
 * category arrive in the same round trip — the alternative is one query per row
 * to resolve names, which is the N+1 this app is specifically built to avoid.
 * It always filters on `organization_id` first, matching the leading column of
 * `tickets_org_status_idx`.
 */

const LIST_SELECT = `
  id, reference, title, status, priority, due_date, created_at, updated_at, client_id, assignee_id,
  client:clients!tickets_client_id_fkey(id, name),
  assignee:profiles!tickets_assignee_id_fkey(id, full_name, email, avatar_url),
  category:categories!tickets_category_id_fkey(id, name, tone)
` as const

export type TicketListItem = {
  id: string
  reference: number
  title: string
  status: TicketStatus
  priority: TicketPriority
  due_date: string | null
  created_at: string
  updated_at: string
  client_id: string | null
  assignee_id: string | null
  client: { id: string; name: string } | null
  assignee: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
  category: { id: string; name: string; tone: string } | null
}

export type TicketListResult = { rows: TicketListItem[]; total: number }

export const TICKET_SORTS = {
  recent: { column: 'created_at', ascending: false, label: 'Più recenti' },
  updated: { column: 'updated_at', ascending: false, label: 'Aggiornati di recente' },
  due: { column: 'due_date', ascending: true, label: 'Scadenza più vicina' },
  priority: { column: 'priority', ascending: true, label: 'Priorità' },
  reference: { column: 'reference', ascending: false, label: 'Numero' },
} as const

export type TicketSortKey = keyof typeof TICKET_SORTS

export function useTicketList(organizationId: string, filters: TicketListFilters) {
  const page = filters.page ?? 1
  const sortKey = (filters.sort ?? 'recent') as TicketSortKey
  const sort = TICKET_SORTS[sortKey] ?? TICKET_SORTS.recent

  return useQuery({
    queryKey: queryKeys.tickets.list(organizationId, filters),
    staleTime: CACHE.operational.staleTime,
    gcTime: CACHE.operational.gcTime,
    // Keeps the previous page on screen while the next one loads.
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<TicketListResult> => {
      const supabase = getSupabaseBrowserClient()
      const from = (page - 1) * PAGE_SIZE.tickets
      const to = from + PAGE_SIZE.tickets - 1

      let query = supabase
        .from('tickets')
        .select(LIST_SELECT, { count: 'exact' })
        .eq('organization_id', organizationId)

      if (filters.status?.length) query = query.in('status', filters.status as TicketStatus[])
      if (filters.priority?.length)
        query = query.in('priority', filters.priority as TicketPriority[])
      if (filters.clientId) query = query.eq('client_id', filters.clientId)
      if (filters.assigneeId === 'unassigned') query = query.is('assignee_id', null)
      else if (filters.assigneeId) query = query.eq('assignee_id', filters.assigneeId)
      if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
      if (filters.dueFrom) query = query.gte('due_date', filters.dueFrom)
      if (filters.dueTo) query = query.lte('due_date', filters.dueTo)

      const term = escapeFilterValue(filters.search ?? '')
      if (term.length >= 2) {
        // A bare number is almost always a ticket reference.
        const asNumber = Number(term)
        query = Number.isInteger(asNumber)
          ? query.or(`title.ilike.%${term}%,reference.eq.${asNumber}`)
          : query.ilike('title', `%${term}%`)
      }

      const { data, error, count } = await query
        .order(sort.column, { ascending: sort.ascending, nullsFirst: false })
        .order('id', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { rows: (data ?? []) as unknown as TicketListItem[], total: count ?? 0 }
    },
  })
}

export type TicketDetail = TicketRow & {
  client: { id: string; name: string; email: string | null } | null
  assignee: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
  creator: { id: string; full_name: string | null; email: string } | null
  category: { id: string; name: string; tone: string } | null
  activity_type: { id: string; name: string } | null
}

export function useTicket(organizationId: string, ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(organizationId, ticketId ?? 'none'),
    enabled: Boolean(ticketId),
    staleTime: CACHE.operational.staleTime,
    gcTime: CACHE.operational.gcTime,
    queryFn: async (): Promise<TicketDetail> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('tickets')
        .select(
          `*,
           client:clients!tickets_client_id_fkey(id, name, email),
           assignee:profiles!tickets_assignee_id_fkey(id, full_name, email, avatar_url),
           creator:profiles!tickets_creator_id_fkey(id, full_name, email),
           category:categories!tickets_category_id_fkey(id, name, tone),
           activity_type:activity_types!tickets_activity_type_id_fkey(id, name)`,
        )
        .eq('organization_id', organizationId)
        .eq('id', ticketId!)
        .single()

      if (error) throw error
      return data as unknown as TicketDetail
    },
  })
}

export type TicketComment = TicketCommentRow & {
  author: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

export function useTicketComments(organizationId: string, ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.tickets.comments(organizationId, ticketId ?? 'none'),
    enabled: Boolean(ticketId),
    staleTime: CACHE.operational.staleTime,
    queryFn: async (): Promise<TicketComment[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('ticket_comments')
        .select(
          '*, author:profiles!ticket_comments_author_id_fkey(id, full_name, email, avatar_url)',
        )
        .eq('organization_id', organizationId)
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: true })
        .limit(PAGE_SIZE.comments)

      if (error) throw error
      return (data ?? []) as unknown as TicketComment[]
    },
  })
}

export type TicketTimelineEntry = TicketEventRow & {
  actor: { id: string; full_name: string | null; email: string } | null
}

export function useTicketTimeline(organizationId: string, ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.tickets.events(organizationId, ticketId ?? 'none'),
    enabled: Boolean(ticketId),
    staleTime: CACHE.operational.staleTime,
    queryFn: async (): Promise<TicketTimelineEntry[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('ticket_events')
        .select('*, actor:profiles!ticket_events_actor_id_fkey(id, full_name, email)')
        .eq('organization_id', organizationId)
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) throw error
      return (data ?? []) as unknown as TicketTimelineEntry[]
    },
  })
}

export type TicketRelated = {
  events: CalendarEventRow[]
  timeEntries: (TimeEntryRow & {
    user: { id: string; full_name: string | null; email: string } | null
  })[]
  attachments: TicketAttachmentRow[]
  loggedMinutes: number
}

/** Calendar events, logged hours and attachments for one ticket, in one go. */
export function useTicketRelated(organizationId: string, ticketId: string | null) {
  return useQuery({
    queryKey: queryKeys.tickets.related(organizationId, ticketId ?? 'none'),
    enabled: Boolean(ticketId),
    staleTime: CACHE.operational.staleTime,
    queryFn: async (): Promise<TicketRelated> => {
      const supabase = getSupabaseBrowserClient()
      const [eventsResult, timeResult, attachmentsResult] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('ticket_id', ticketId!)
          .order('starts_at', { ascending: true })
          .limit(50),
        supabase
          .from('time_entries')
          .select('*, user:profiles!time_entries_user_id_fkey(id, full_name, email)')
          .eq('organization_id', organizationId)
          .eq('ticket_id', ticketId!)
          .order('entry_date', { ascending: false })
          .limit(50),
        supabase
          .from('ticket_attachments')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('ticket_id', ticketId!)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

      if (eventsResult.error) throw eventsResult.error
      if (timeResult.error) throw timeResult.error
      if (attachmentsResult.error) throw attachmentsResult.error

      const timeEntries = (timeResult.data ?? []) as unknown as TicketRelated['timeEntries']

      return {
        events: eventsResult.data ?? [],
        timeEntries,
        attachments: attachmentsResult.data ?? [],
        loggedMinutes: timeEntries.reduce((total, entry) => total + entry.duration_minutes, 0),
      }
    },
  })
}
