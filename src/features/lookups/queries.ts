'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE } from '@/config/app'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ActivityTypeRow, CategoryRow, OrgRole } from '@/types/database'

/**
 * Reference data for pickers.
 *
 * These lists are small (tens of rows) and change rarely, so they get a 10
 * minute `staleTime`. Loading them once per session is what keeps ticket and
 * calendar forms from issuing a query per keystroke, and what lets the ticket
 * table resolve names without an N+1.
 */

export type ClientOption = { id: string; name: string; email: string | null; code: string | null }

export function useClientOptions(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.clients.options(organizationId),
    enabled,
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
    queryFn: async (): Promise<ClientOption[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, code')
        .eq('organization_id', organizationId)
        .eq('is_archived', false)
        .order('name')
        .limit(1000)

      if (error) throw error
      return data ?? []
    },
  })
}

export type MemberOption = {
  userId: string
  fullName: string | null
  email: string
  avatarUrl: string | null
  role: OrgRole
}

export function useMemberOptions(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.members.list(organizationId),
    enabled,
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
    queryFn: async (): Promise<MemberOption[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('organization_members')
        .select('role, created_at, profile:profiles!organization_members_user_id_fkey(id, full_name, email, avatar_url)')
        .eq('organization_id', organizationId)
        .order('created_at')
        .limit(500)

      if (error) throw error

      return (data ?? [])
        .map((row) =>
          row.profile
            ? {
                userId: row.profile.id,
                fullName: row.profile.full_name,
                email: row.profile.email,
                avatarUrl: row.profile.avatar_url,
                role: row.role,
              }
            : null,
        )
        .filter((value): value is MemberOption => value !== null)
        .sort((a, b) =>
          (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email, 'it', {
            sensitivity: 'base',
          }),
        )
    },
  })
}

export function useCategories(organizationId: string, includeArchived = false) {
  return useQuery({
    queryKey: [...queryKeys.taxonomy.categories(organizationId), includeArchived],
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
    queryFn: async (): Promise<CategoryRow[]> => {
      const supabase = getSupabaseBrowserClient()
      let query = supabase
        .from('categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('position')
        .order('name')
        .limit(300)

      if (!includeArchived) query = query.eq('is_archived', false)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

export function useActivityTypes(
  organizationId: string,
  categoryId?: string | null,
  includeArchived = false,
) {
  return useQuery({
    queryKey: [...queryKeys.taxonomy.activityTypes(organizationId, categoryId), includeArchived],
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
    queryFn: async (): Promise<ActivityTypeRow[]> => {
      const supabase = getSupabaseBrowserClient()
      let query = supabase
        .from('activity_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('position')
        .order('name')
        .limit(500)

      if (categoryId) query = query.eq('category_id', categoryId)
      if (!includeArchived) query = query.eq('is_archived', false)

      const { data, error } = await query
      if (error) throw error
      return data ?? []
    },
  })
}

/** Display name for a member, falling back to the address. */
export function memberLabel(member: Pick<MemberOption, 'fullName' | 'email'>): string {
  return member.fullName?.trim() || member.email
}
