'use server'

import type { z } from 'zod'
import { assertResourceInOrg, authorize } from '@/lib/auth/guards'
import { fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import { clientFormSchema } from './schemas'

export async function createClient(
  input: z.input<typeof clientFormSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId, session } = await authorize('clients:manage')
    const parsed = clientFormSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        organization_id: organizationId,
        created_by: session.userId,
        name: parsed.data.name,
        code: parsed.data.code,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        notes: parsed.data.notes,
      })
      .select('id')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateClient(
  clientId: string,
  input: z.input<typeof clientFormSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('clients:manage')
    const parsed = clientFormSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    await assertResourceInOrg(supabase, 'clients', clientId, organizationId)

    const { error } = await supabase
      .from('clients')
      .update({
        name: parsed.data.name,
        code: parsed.data.code,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        notes: parsed.data.notes,
      })
      .eq('id', clientId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/**
 * Archiving is the default way to retire a client: tickets and logged hours
 * keep their reference, and reports over past periods stay correct.
 */
export async function setClientArchived(
  clientId: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('clients:manage')
    const { error } = await supabase
      .from('clients')
      .update({ is_archived: archived })
      .eq('id', clientId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteClient(clientId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('clients:manage')
    await assertResourceInOrg(supabase, 'clients', clientId, organizationId)

    const { count } = await supabase
      .from('tickets')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)

    if ((count ?? 0) > 0) {
      return fail(
        `Questo cliente ha ${count} ticket collegati. Archivialo invece di eliminarlo.`,
        'conflict',
      )
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Grants a guest explicit access to one client. */
export async function setClientMember(
  clientId: string,
  userId: string,
  member: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('clients:manage')
    await assertResourceInOrg(supabase, 'clients', clientId, organizationId)

    if (member) {
      const { error } = await supabase
        .from('client_members')
        .insert({ organization_id: organizationId, client_id: clientId, user_id: userId })
      if (error && error.code !== '23505') return toActionResult(error)
      return ok()
    }

    const { error } = await supabase
      .from('client_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('client_id', clientId)
      .eq('user_id', userId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}
