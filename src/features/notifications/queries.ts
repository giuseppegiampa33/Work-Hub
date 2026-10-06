'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CACHE, PAGE_SIZE } from '@/config/app'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { NotificationRow } from '@/types/database'

/**
 * In-app notifications for the current user inside the active organization.
 *
 * Deliberately polled rather than subscribed: one query per minute while the
 * tab is open is cheaper than holding a realtime channel for every user, and
 * nothing here is time-critical. Swapping in `supabase.channel()` later only
 * means invalidating this key from the subscription callback.
 */
export function useNotifications(organizationId: string, userId: string) {
  return useQuery({
    queryKey: queryKeys.notifications(organizationId),
    staleTime: CACHE.volatile.staleTime,
    gcTime: CACHE.volatile.gcTime,
    refetchInterval: 60_000,
    queryFn: async (): Promise<NotificationRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE.notifications)

      if (error) throw error
      return data ?? []
    },
  })
}

export function useMarkNotificationsRead(organizationId: string, userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[] | 'all') => {
      const supabase = getSupabaseBrowserClient()
      let query = supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .is('read_at', null)

      if (ids !== 'all') query = query.in('id', ids)

      const { error } = await query
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications(organizationId) })
    },
  })
}
