'use client'

import { useQuery } from '@tanstack/react-query'
import { CACHE } from '@/config/app'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type {
  DailyHoursRow,
  HoursByCategoryRow,
  HoursByClientRow,
  HoursByMemberRow,
  OrganizationOverview,
  TicketsBreakdownRow,
} from '@/types/database'

/**
 * Reporting reads.
 *
 * Every figure on this page is aggregated by Postgres through a function in
 * `0003_functions.sql`. The browser receives tens of rows, not the thousands of
 * time entries behind them — which is what keeps the page the same speed in
 * month one and month forty.
 */

export function useOrganizationOverview(organizationId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.overview(organizationId, from, to),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<OrganizationOverview> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('organization_overview', {
        p_org: organizationId,
        p_from: from,
        p_to: to,
      })

      if (error) throw error
      return data as unknown as OrganizationOverview
    },
  })
}

export function useHoursByClient(organizationId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.hoursByClient(organizationId, from, to),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<HoursByClientRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('report_hours_by_client', {
        p_org: organizationId,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useHoursByCategory(organizationId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.hoursByCategory(organizationId, from, to),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<HoursByCategoryRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('report_hours_by_category', {
        p_org: organizationId,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useHoursByMember(organizationId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.hoursByMember(organizationId, from, to),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<HoursByMemberRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('report_hours_by_member', {
        p_org: organizationId,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useDailyHours(organizationId: string, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.reports.daily(organizationId, from, to),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<DailyHoursRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('report_daily_hours', {
        p_org: organizationId,
        p_from: from,
        p_to: to,
      })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useTicketsBreakdown(organizationId: string) {
  return useQuery({
    queryKey: queryKeys.reports.ticketsBreakdown(organizationId),
    staleTime: CACHE.analytics.staleTime,
    gcTime: CACHE.analytics.gcTime,
    queryFn: async (): Promise<TicketsBreakdownRow[]> => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.rpc('report_tickets_breakdown', {
        p_org: organizationId,
      })
      if (error) throw error
      return data ?? []
    },
  })
}
