'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { z } from 'zod'
import { ACTIVE_ORG_COOKIE, INVITE_TTL_DAYS } from '@/config/app'
import { canAssignRole, canInviteRole, roleLabel, type InvitableRole } from '@/config/roles'
import { authorize, requireUserOrThrow } from '@/lib/auth/guards'
import { ActionError, fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { InviteRow } from '@/types/database'
import { inviteMemberSchema, inviteUrl, updateMemberRoleSchema } from './schemas'

export type InviteCreated = { invite: InviteRow; url: string }

/**
 * Creates an invite and returns the link.
 *
 * For the MVP the link is shown to the admin and shared by hand; nothing in
 * this action assumes email delivery, so adding a provider later means calling
 * it here and keeping the same return shape.
 */
export async function inviteMember(
  input: z.input<typeof inviteMemberSchema>,
): Promise<ActionResult<InviteCreated>> {
  try {
    const { supabase, organizationId, role: actorRole, session } = await authorize('members:invite')
    const parsed = inviteMemberSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const targetRole: InvitableRole = parsed.data.role

    // A member may never invite someone more privileged than themselves.
    if (!canInviteRole(actorRole, targetRole)) {
      return fail(
        `Con il tuo ruolo non puoi invitare come ${roleLabel(targetRole)}.`,
        'forbidden',
        'role',
      )
    }

    // Already a member? Say so instead of creating a dead invite.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parsed.data.email)
      .maybeSingle()

    if (existingProfile) {
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', existingProfile.id)
        .maybeSingle()

      if (existingMember) {
        return fail('Questa persona è già membro dell’organizzazione.', 'conflict', 'email')
      }
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString()

    const { data, error } = await supabase
      .from('invites')
      .insert({
        organization_id: organizationId,
        email: parsed.data.email,
        role: targetRole,
        invited_by: session.userId,
        expires_at: expiresAt,
      })
      .select('*')
      .single()

    if (error) return toActionResult(error)

    revalidatePath('/settings/members')
    return ok({ invite: data, url: inviteUrl(data.token) })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function revokeInvite(inviteId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('members:invite')
    const { error } = await supabase
      .from('invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    revalidatePath('/settings/members')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Extends an invite that has expired, keeping the same token. */
export async function renewInvite(inviteId: string): Promise<ActionResult<{ url: string }>> {
  try {
    const { supabase, organizationId } = await authorize('members:invite')
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000).toISOString()

    const { data, error } = await supabase
      .from('invites')
      .update({ expires_at: expiresAt, revoked_at: null })
      .eq('id', inviteId)
      .eq('organization_id', organizationId)
      .select('token')
      .single()

    if (error) return toActionResult(error)
    revalidatePath('/settings/members')
    return ok({ url: inviteUrl(data.token) })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateMemberRole(
  input: z.input<typeof updateMemberRoleSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId, role: actorRole, session } = await authorize(
      'members:update_role',
    )
    const parsed = updateMemberRoleSchema.safeParse(input)
    if (!parsed.success) return fail('Dati non validi.', 'validation')

    const targetRole = parsed.data.role

    if (!canAssignRole(actorRole, targetRole)) {
      return fail(`Non puoi assegnare il ruolo ${roleLabel(targetRole)}.`, 'forbidden', 'role')
    }

    const { data: target, error: lookupError } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', organizationId)
      .eq('user_id', parsed.data.userId)
      .maybeSingle()

    if (lookupError) return toActionResult(lookupError)
    if (!target) throw new ActionError('not_found', 'Membro non trovato.')

    // Only an owner can change another owner.
    if (target.role === 'owner' && actorRole !== 'owner') {
      return fail('Solo un proprietario può modificare un altro proprietario.', 'forbidden')
    }
    if (parsed.data.userId === session.userId && target.role === 'owner' && targetRole !== 'owner') {
      return fail(
        'Promuovi prima un altro proprietario: un’organizzazione deve conservarne almeno uno.',
        'conflict',
      )
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: targetRole })
      .eq('id', target.id)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    revalidatePath('/settings/members')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function removeMember(userId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId, role: actorRole, session } = await authorize('members:remove')

    if (userId === session.userId) {
      return fail('Per uscire dall’organizzazione usa il comando dedicato.', 'validation')
    }

    const { data: target } = await supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle()

    if (!target) throw new ActionError('not_found', 'Membro non trovato.')
    if (target.role === 'owner' && actorRole !== 'owner') {
      return fail('Solo un proprietario può rimuovere un altro proprietario.', 'forbidden')
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('id', target.id)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    revalidatePath('/settings/members')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/**
 * Joins the organization an invite points to and makes it the active tenant.
 * All validation (token, address, expiry) happens inside `accept_invite`.
 */
export async function acceptInvite(token: string): Promise<ActionResult<{ organizationId: string }>> {
  try {
    await requireUserOrThrow()
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.rpc('accept_invite', { p_token: token })

    if (error) return toActionResult(error)
    if (!data) return fail('Invito non valido.', 'not_found')

    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, data, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    revalidatePath('/', 'layout')
    return ok({ organizationId: data })
  } catch (error) {
    return toActionResult(error)
  }
}
