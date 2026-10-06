'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE, PAGE_SIZE } from '@/config/app'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AuditLogRow, InviteRow, OrgRole } from '@/types/database'

export type MemberRow = {
  id: string
  userId: string
  role: OrgRole
  joinedAt: string
  fullName: string | null
  email: string
  avatarUrl: string | null
}

export function useMembers(organizationId: string) {
  return useQuery({
    queryKey: [...queryKeys.members.list(organizationId), 'detailed'],
    staleTime: CACHE.reference.staleTime,
    gcTime: CACHE.reference.gcTime,
    queryFn: async (): Promise<MemberRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('organization_members')
        .select(
          'id, user_id, role, created_at, profile:profiles!organization_members_user_id_fkey(id, full_name, email, avatar_url)',
        )
        .eq('organization_id', organizationId)
        .order('created_at')
        .limit(PAGE_SIZE.members)

      if (error) throw error

      return (data ?? [])
        .map((row) =>
          row.profile
            ? {
                id: row.id,
                userId: row.user_id,
                role: row.role,
                joinedAt: row.created_at,
                fullName: row.profile.full_name,
                email: row.profile.email,
                avatarUrl: row.profile.avatar_url,
              }
            : null,
        )
        .filter((value): value is MemberRow => value !== null)
    },
  })
}

export type InviteListItem = InviteRow & {
  invitedBy: { full_name: string | null; email: string } | null
}

export function useInvites(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.members.invites(organizationId),
    enabled,
    staleTime: CACHE.operational.staleTime,
    queryFn: async (): Promise<InviteListItem[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('invites')
        .select('*, invitedBy:profiles!invites_invited_by_fkey(full_name, email)')
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE.members)

      if (error) throw error
      return (data ?? []) as unknown as InviteListItem[]
    },
  })
}

export type AuditLogListItem = AuditLogRow & {
  actor: { full_name: string | null; email: string } | null
}

export function useAuditLogs(organizationId: string, page: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.auditLogs(organizationId, page),
    enabled,
    staleTime: CACHE.operational.staleTime,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<{ rows: AuditLogListItem[]; total: number }> => {
      const supabase = getSupabaseBrowserClient()
      const from = (page - 1) * PAGE_SIZE.auditLogs
      const to = from + PAGE_SIZE.auditLogs - 1

      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*, actor:profiles!audit_logs_actor_id_fkey(full_name, email)', {
          count: 'exact',
        })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      return { rows: (data ?? []) as unknown as AuditLogListItem[], total: count ?? 0 }
    },
  })
}
