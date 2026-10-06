'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE, PAGE_SIZE } from '@/config/app'
import { OPEN_TICKET_STATUSES } from '@/config/tickets'
import { queryKeys, type ClientListFilters } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { escapeFilterValue } from '@/lib/utils'
import type { ClientRow } from '@/types/database'

export type ClientListResult = { rows: ClientRow[]; total: number }

export function useClientList(organizationId: string, filters: ClientListFilters) {
  const page = filters.page ?? 1

  return useQuery({
    queryKey: queryKeys.clients.list(organizationId, filters),
    staleTime: CACHE.operational.staleTime,
    gcTime: CACHE.operational.gcTime,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<ClientListResult> => {
      const supabase = getSupabaseBrowserClient()
      const from = (page - 1) * PAGE_SIZE.clients
      const to = from + PAGE_SIZE.clients - 1

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_archived', filters.archived ?? false)

      const term = escapeFilterValue(filters.search ?? '')
      if (term.length >= 2) {
        query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,code.ilike.%${term}%`)
      }

      const { data, error, count } = await query.order('name').range(from, to)

      if (error) throw error
      return { rows: data ?? [], total: count ?? 0 }
    },
  })
}

export function useClient(organizationId: string, clientId: string) {
  return useQuery({
    queryKey: queryKeys.clients.detail(organizationId, clientId),
    staleTime: CACHE.operational.staleTime,
    queryFn: async (): Promise<ClientRow> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('id', clientId)
        .single()

      if (error) throw error
      return data
    },
  })
}

export type ClientSummary = {
  openTickets: number
  totalTickets: number
  loggedMinutes: number
  billableMinutes: number
  lastActivityAt: string | null
}

/**
 * Client detail header numbers.
 *
 * Four `head: true` counts plus one bounded sum — all indexed on
 * `(organization_id, client_id, …)`. Counting with `head` means Postgres
 * answers from the index without returning rows.
 */
export function useClientSummary(organizationId: string, clientId: string) {
  return useQuery({
    queryKey: queryKeys.clients.summary(organizationId, clientId),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<ClientSummary> => {
      const supabase = getSupabaseBrowserClient()

      const [openResult, totalResult, timeResult, lastTicketResult] = await Promise.all([
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('client_id', clientId)
          .in('status', OPEN_TICKET_STATUSES),
        supabase
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('client_id', clientId),
        supabase
          .from('time_entries')
          .select('duration_minutes, is_billable')
          .eq('organization_id', organizationId)
          .eq('client_id', clientId)
          .order('entry_date', { ascending: false })
          .limit(2000),
        supabase
          .from('tickets')
          .select('updated_at')
          .eq('organization_id', organizationId)
          .eq('client_id', clientId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (timeResult.error) throw timeResult.error

      const entries = timeResult.data ?? []
      return {
        openTickets: openResult.count ?? 0,
        totalTickets: totalResult.count ?? 0,
        loggedMinutes: entries.reduce((sum, entry) => sum + entry.duration_minutes, 0),
        billableMinutes: entries.reduce(
          (sum, entry) => sum + (entry.is_billable ? entry.duration_minutes : 0),
          0,
        ),
        lastActivityAt: lastTicketResult.data?.updated_at ?? null,
      }
    },
  })
}
