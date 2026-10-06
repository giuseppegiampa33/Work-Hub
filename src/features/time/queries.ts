'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE, PAGE_SIZE } from '@/config/app'
import { queryKeys, type TimeEntryFilters } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { TimeEntryRow } from '@/types/database'

export type TimeEntryListItem = TimeEntryRow & {
  client: { id: string; name: string } | null
  ticket: { id: string; reference: number; title: string } | null
  category: { id: string; name: string; tone: string } | null
  activity_type: { id: string; name: string } | null
  user: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

export type TimeEntryListResult = {
  rows: TimeEntryListItem[]
  total: number
  totalMinutes: number
  billableMinutes: number
}

/**
 * Logged hours for a period.
 *
 * Paginated and always bounded by a date range — an open-ended "all hours"
 * query is the one thing guaranteed to get slower every month. The two totals
 * are computed over the page's own range server-side in `report_daily_hours`
 * when the full picture is needed; here they summarise the visible page.
 */
export function useTimeEntries(organizationId: string, filters: TimeEntryFilters) {
  const page = filters.page ?? 1

  return useQuery({
    queryKey: queryKeys.time.list(organizationId, filters),
    staleTime: CACHE.operational.staleTime,
    gcTime: CACHE.operational.gcTime,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<TimeEntryListResult> => {
      const supabase = getSupabaseBrowserClient()
      const from = (page - 1) * PAGE_SIZE.timeEntries
      const to = from + PAGE_SIZE.timeEntries - 1

      let query = supabase
        .from('time_entries')
        .select(
          `*,
           client:clients!time_entries_client_id_fkey(id, name),
           ticket:tickets!time_entries_ticket_id_fkey(id, reference, title),
           category:categories!time_entries_category_id_fkey(id, name, tone),
           activity_type:activity_types!time_entries_activity_type_id_fkey(id, name),
           user:profiles!time_entries_user_id_fkey(id, full_name, email, avatar_url)`,
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .gte('entry_date', filters.from)
        .lte('entry_date', filters.to)

      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.clientId) query = query.eq('client_id', filters.clientId)
      if (filters.ticketId) query = query.eq('ticket_id', filters.ticketId)

      const { data, error, count } = await query
        .order('entry_date', { ascending: false })
        .order('start_time', { ascending: false, nullsFirst: false })
        .range(from, to)

      if (error) throw error

      const rows = (data ?? []) as unknown as TimeEntryListItem[]
      return {
        rows,
        total: count ?? 0,
        totalMinutes: rows.reduce((sum, row) => sum + row.duration_minutes, 0),
        billableMinutes: rows.reduce(
          (sum, row) => sum + (row.is_billable ? row.duration_minutes : 0),
          0,
        ),
      }
    },
  })
}
