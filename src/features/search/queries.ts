'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE, PAGE_SIZE } from '@/config/app'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SearchResultRow } from '@/types/database'

/**
 * Global search across tickets, clients and members.
 *
 * One RPC instead of three parallel queries: the function unions the three
 * trigram-indexed lookups and applies a per-kind limit server-side, so the
 * palette never downloads more than ~18 rows no matter how large the tenant is.
 */
export function useWorkspaceSearch(organizationId: string, term: string) {
  const trimmed = term.trim()

  return useQuery({
    queryKey: queryKeys.search(organizationId, trimmed),
    enabled: trimmed.length >= 2,
    staleTime: CACHE.volatile.staleTime,
    gcTime: CACHE.volatile.gcTime,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<SearchResultRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('search_workspace', {
        p_org: organizationId,
        p_query: trimmed,
        p_limit: PAGE_SIZE.searchResults,
      })

      if (error) throw error
      return data ?? []
    },
  })
}
