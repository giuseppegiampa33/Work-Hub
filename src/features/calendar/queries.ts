'use client'

import { useQuery } from '@tanstack/react-query'
import { addDays, startOfWeek } from 'date-fns'
import { CACHE, CALENDAR } from '@/config/app'
import { toISODate } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { CalendarEventRow } from '@/types/database'

export type CalendarEventItem = CalendarEventRow & {
  client: { id: string; name: string } | null
  ticket: { id: string; reference: number; title: string } | null
  category: { id: string; name: string; tone: string } | null
  owner: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

/** Monday of the week containing `date`. */
export function weekStartFor(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: CALENDAR.weekStartsOn })
}

/** The five working days rendered by the grid. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: CALENDAR.days }, (_, index) => addDays(weekStart, index))
}

/**
 * One week of calendar events.
 *
 * The range is always bounded by the visible week — never "all events" — and
 * the query hits `calendar_events_org_range_idx`. Changing week changes the
 * cache key, so moving back and forth through the month is served from cache
 * for ten minutes.
 */
export function useCalendarWeek(
  organizationId: string,
  weekStart: Date,
  ownerId: string | null,
) {
  const from = weekStart
  const to = addDays(weekStart, CALENDAR.days)

  return useQuery({
    queryKey: queryKeys.calendar.week(organizationId, toISODate(weekStart), ownerId),
    staleTime: CACHE.operational.staleTime,
    gcTime: CACHE.operational.gcTime,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<CalendarEventItem[]> => {
      const supabase = getSupabaseBrowserClient()
      let query = supabase
        .from('calendar_events')
        .select(
          `*,
           client:clients!calendar_events_client_id_fkey(id, name),
           ticket:tickets!calendar_events_ticket_id_fkey(id, reference, title),
           category:categories!calendar_events_category_id_fkey(id, name, tone),
           owner:profiles!calendar_events_owner_id_fkey(id, full_name, email, avatar_url)`,
        )
        .eq('organization_id', organizationId)
        .gte('starts_at', from.toISOString())
        .lt('starts_at', to.toISOString())
        .order('starts_at', { ascending: true })
        .limit(500)

      if (ownerId) query = query.eq('owner_id', ownerId)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as CalendarEventItem[]
    },
  })
}
