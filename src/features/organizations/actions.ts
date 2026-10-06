'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { z } from 'zod'
import { ACTIVE_ORG_COOKIE } from '@/config/app'
import { authorize, requireUserOrThrow } from '@/lib/auth/guards'
import { getAppSession } from '@/lib/auth/session'
import { ActionError, fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type { OrganizationRow } from '@/types/database'
import { createOrganizationSchema, updateOrganizationSchema } from './schemas'

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
}

/**
 * Creates a tenant and makes the caller its owner.
 *
 * Runs through the `create_organization` RPC: inserting the organization and
 * the owner membership has to be atomic, and under RLS the membership insert
 * would otherwise require being an admin of an organization that does not exist
 * yet.
 */
export async function createOrganization(
  input: z.input<typeof createOrganizationSchema>,
): Promise<ActionResult<OrganizationRow>> {
  try {
    await requireUserOrThrow()
    const parsed = createOrganizationSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const supabase = await createSupabaseServerClient()
    // The RPC returns a single composite row, so no `.single()` is needed.
    const { data, error } = await supabase.rpc('create_organization', {
      p_name: parsed.data.name,
      p_slug: parsed.data.slug,
    })

    if (error) return toActionResult(error)
    if (!data) return fail("Creazione dell'organizzazione non riuscita.")

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, data.id, COOKIE_OPTIONS)

    revalidatePath('/', 'layout')
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

/** Suggests a free slug from a display name. */
export async function suggestOrganizationSlug(name: string): Promise<ActionResult<string>> {
  try {
    await requireUserOrThrow()
    const base = slugify(name) || 'workspace'
    const supabase = await createSupabaseServerClient()

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
      const { data, error } = await supabase.rpc('organization_slug_available', {
        p_slug: candidate,
      })
      if (error) return toActionResult(error)
      if (data) return ok(candidate)
    }
    return ok(`${base}-${Date.now().toString(36).slice(-4)}`)
  } catch (error) {
    return toActionResult(error)
  }
}

/**
 * Switches the organization scoping this session.
 *
 * The cookie is only a hint: membership is re-validated here before it is set,
 * and again on every request in `getAppSession`.
 */
export async function setActiveOrganization(organizationId: string): Promise<ActionResult> {
  try {
    const session = await requireUserOrThrow()
    const membership = session.memberships.find(
      (item) => item.organization.id === organizationId,
    )
    if (!membership) {
      throw new ActionError('forbidden', 'Non fai parte di questa organizzazione.')
    }

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, organizationId, COOKIE_OPTIONS)

    revalidatePath('/', 'layout')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateOrganization(
  input: z.input<typeof updateOrganizationSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('org:manage')
    const parsed = updateOrganizationSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const { error } = await supabase
      .from('organizations')
      .update({ name: parsed.data.name, slug: parsed.data.slug })
      .eq('id', organizationId)

    if (error) return toActionResult(error)

    revalidatePath('/', 'layout')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Persists the logo path produced by a Storage upload. */
export async function updateOrganizationLogo(logoUrl: string | null): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('org:manage')
    const { error } = await supabase
      .from('organizations')
      .update({ logo_url: logoUrl })
      .eq('id', organizationId)

    if (error) return toActionResult(error)
    revalidatePath('/', 'layout')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Leaves the active organization. The last owner is refused by the database. */
export async function leaveOrganization(): Promise<ActionResult> {
  try {
    const session = await getAppSession()
    if (!session?.activeOrganization) {
      throw new ActionError('forbidden', 'Nessuna organizzazione attiva.')
    }
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', session.activeOrganization.organization.id)
      .eq('user_id', session.userId)

    if (error) return toActionResult(error)

    const cookieStore = await cookies()
    cookieStore.delete(ACTIVE_ORG_COOKIE)
    revalidatePath('/', 'layout')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}
