import 'server-only'

import { redirect } from 'next/navigation'
import type { Permission } from '@/config/roles'
import { roleHas, roleLabel } from '@/config/roles'
import { ActionError } from '@/lib/errors'
import type { SupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { AppSession, SessionContext } from './session'
import { getAppSession, toSessionContext } from './session'

/**
 * The three questions every authorised operation has to answer, in one place:
 *
 *   1. is there a signed-in user?                          -> `requireUser`
 *   2. is that user a member of the active organization?    -> `requireOrgContext`
 *   3. does their role in *that* organization allow this?   -> `requirePermission`
 *
 * Resource ownership (question 1 restated per row: "does this row belong to the
 * active organization?") is enforced twice — by the `organization_id` filter
 * every query carries, and by RLS in the database.
 */

export async function requireUser(): Promise<AppSession> {
  const session = await getAppSession()
  if (!session) redirect('/login')
  return session
}

/** For server actions: throws instead of redirecting. */
export async function requireUserOrThrow(): Promise<AppSession> {
  const session = await getAppSession()
  if (!session) {
    throw new ActionError('unauthenticated', 'Sessione scaduta. Accedi di nuovo.')
  }
  return session
}

export async function requireOrgContext(): Promise<SessionContext> {
  const session = await requireUser()
  const context = toSessionContext(session)
  if (!context) redirect('/onboarding')
  return context
}

/** For server actions: throws instead of redirecting. */
export async function requireOrgContextOrThrow(): Promise<SessionContext> {
  const session = await requireUserOrThrow()
  const context = toSessionContext(session)
  if (!context) {
    throw new ActionError('forbidden', 'Nessuna organizzazione attiva per questa sessione.')
  }
  return context
}

export async function requirePermission(permission: Permission): Promise<SessionContext> {
  const context = await requireOrgContextOrThrow()
  if (!roleHas(context.role, permission)) {
    throw new ActionError(
      'forbidden',
      `Il ruolo ${roleLabel(context.role)} non può eseguire questa operazione.`,
    )
  }
  return context
}

export type AuthorizedContext = SessionContext & {
  supabase: SupabaseServerClient
}

/**
 * Entry point for server actions: resolves the session, checks the permission
 * and hands back a request-scoped Supabase client in one step.
 */
export async function authorize(permission: Permission): Promise<AuthorizedContext> {
  const context = await requirePermission(permission)
  const supabase = await createSupabaseServerClient()
  return { ...context, supabase }
}

/**
 * Last-mile check for operations that touch a specific row: confirms the row is
 * inside the active tenant before mutating it. RLS would reject a cross-tenant
 * write anyway; this produces a precise error instead of an empty result.
 */
export async function assertResourceInOrg(
  supabase: SupabaseServerClient,
  table: 'tickets' | 'clients' | 'calendar_events' | 'time_entries' | 'categories' | 'activity_types' | 'invites' | 'organization_members',
  id: string,
  organizationId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    throw new ActionError('not_found', 'Risorsa non trovata in questa organizzazione.')
  }
}
