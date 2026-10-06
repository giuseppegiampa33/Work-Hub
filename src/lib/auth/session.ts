import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { ACTIVE_ORG_COOKIE } from '@/config/app'
import type { OrgRole, Permission } from '@/config/roles'
import { roleHas } from '@/config/roles'
import { isSchemaMissingError } from '@/lib/errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { OrganizationRow, ProfileRow } from '@/types/database'

export type Membership = {
  organization: Pick<OrganizationRow, 'id' | 'name' | 'slug' | 'logo_url'>
  role: OrgRole
  joinedAt: string
}

export type AppSession = {
  userId: string
  email: string
  profile: ProfileRow | null
  memberships: Membership[]
  /** The organization scoping this request, or null when the user has none. */
  activeOrganization: Membership | null
  /** True when the Supabase schema has not been applied yet. */
  schemaMissing: boolean
}

/**
 * Loads everything the app shell needs about the current request, once.
 *
 * `cache()` dedupes this across the whole server render, so the layout, the
 * page and any nested server component share a single pair of queries instead
 * of each issuing their own.
 *
 * The active organization is read from a cookie but **always re-validated**
 * against `organization_members`: tampering with the cookie can only ever
 * downgrade the session to "no organization", never grant access.
 */
export const getAppSession = cache(async (): Promise<AppSession | null> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('organization_members')
      .select('role, created_at, organization:organizations(id, name, slug, logo_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  const schemaMissing =
    isSchemaMissingError(profileResult.error) || isSchemaMissingError(membershipResult.error)

  const memberships: Membership[] = (membershipResult.data ?? [])
    .map((row) => {
      const organization = row.organization
      if (!organization) return null
      return {
        organization,
        role: row.role,
        joinedAt: row.created_at,
      } satisfies Membership
    })
    .filter((value): value is Membership => value !== null)

  const cookieStore = await cookies()
  const requestedOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value
  const activeOrganization =
    memberships.find((membership) => membership.organization.id === requestedOrgId) ??
    memberships[0] ??
    null

  return {
    userId: user.id,
    email: user.email ?? profileResult.data?.email ?? '',
    profile: profileResult.data ?? null,
    memberships,
    activeOrganization,
    schemaMissing,
  }
})

/** Convenience view of the session for permission-aware UI. */
export type SessionContext = {
  session: AppSession
  organizationId: string
  role: OrgRole
  can: (permission: Permission) => boolean
}

export function toSessionContext(session: AppSession): SessionContext | null {
  if (!session.activeOrganization) return null
  const role = session.activeOrganization.role
  return {
    session,
    organizationId: session.activeOrganization.organization.id,
    role,
    can: (permission: Permission) => roleHas(role, permission),
  }
}
