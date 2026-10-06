'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { z } from 'zod'
import { ACTIVE_ORG_COOKIE, SITE_URL } from '@/config/app'
import { requireUserOrThrow } from '@/lib/auth/guards'
import {
  describeAuthError,
  fail,
  ok,
  toActionResult,
  type ActionResult,
} from '@/lib/errors'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  credentialsSchema,
  requestPasswordResetSchema,
  signUpSchema,
  updatePasswordSchema,
  updateProfileSchema,
  type SignUpOutcome,
} from './schemas'


export async function signUp(
  input: z.input<typeof signUpSchema>,
): Promise<ActionResult<SignUpOutcome>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.fullName },
        emailRedirectTo: `${SITE_URL}/auth/callback?next=/onboarding`,
      },
    })

    if (error) return fail(describeAuthError(error.message), 'validation')

    // No session means the project requires email confirmation first.
    return ok({ needsEmailConfirmation: !data.session })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function signIn(
  input: z.input<typeof credentialsSchema>,
): Promise<ActionResult<{ hasOrganization: boolean }>> {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })

    if (error) return fail(describeAuthError(error.message), 'validation', 'password')
    if (!data.user) return fail('Accesso non riuscito.', 'unknown')

    const { count } = await supabase
      .from('organization_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', data.user.id)

    revalidatePath('/', 'layout')
    return ok({ hasOrganization: (count ?? 0) > 0 })
  } catch (error) {
    return toActionResult(error)
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete(ACTIVE_ORG_COOKIE)
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function requestPasswordReset(
  input: z.input<typeof requestPasswordResetSchema>,
): Promise<ActionResult> {
  const parsed = requestPasswordResetSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 'validation', 'email')
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
    })
    // Never reveal whether the address exists.
    if (error && !/user not found/i.test(error.message)) {
      return fail(describeAuthError(error.message), 'unknown')
    }
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updatePassword(
  input: z.input<typeof updatePasswordSchema>,
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
  }

  try {
    await requireUserOrThrow()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
    if (error) return fail(describeAuthError(error.message), 'validation', 'password')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateProfile(
  input: z.input<typeof updateProfileSchema>,
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return fail(parsed.error.issues[0].message, 'validation', 'fullName')
  }

  try {
    const session = await requireUserOrThrow()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: parsed.data.fullName })
      .eq('id', session.userId)

    if (error) return toActionResult(error)
    revalidatePath('/', 'layout')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateProfileAvatar(avatarUrl: string | null): Promise<ActionResult> {
  try {
    const session = await requireUserOrThrow()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', session.userId)

    if (error) return toActionResult(error)
    revalidatePath('/', 'layout')
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}
