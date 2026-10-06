'use server'

import type { z } from 'zod'
import { assertResourceInOrg, authorize } from '@/lib/auth/guards'
import { fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import { activityTypeSchema, categorySchema } from './schemas'

export async function createCategory(
  input: z.input<typeof categorySchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({
        organization_id: organizationId,
        name: parsed.data.name,
        tone: parsed.data.tone,
      })
      .select('id')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateCategory(
  categoryId: string,
  input: z.input<typeof categorySchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')
    const parsed = categorySchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    await assertResourceInOrg(supabase, 'categories', categoryId, organizationId)

    const { error } = await supabase
      .from('categories')
      .update({ name: parsed.data.name, tone: parsed.data.tone })
      .eq('id', categoryId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/**
 * Archiving, not deleting: a category referenced by past hours has to keep
 * existing or historical reports would lose their labels.
 */
export async function setCategoryArchived(
  categoryId: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')
    const { error } = await supabase
      .from('categories')
      .update({ is_archived: archived })
      .eq('id', categoryId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')

    const [{ count: timeCount }, { count: ticketCount }] = await Promise.all([
      supabase
        .from('time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('category_id', categoryId),
      supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('category_id', categoryId),
    ])

    if ((timeCount ?? 0) > 0 || (ticketCount ?? 0) > 0) {
      return fail(
        'Questa categoria è usata da ticket o ore registrate. Archiviala invece di eliminarla.',
        'conflict',
      )
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function createActivityType(
  input: z.input<typeof activityTypeSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')
    const parsed = activityTypeSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const { data, error } = await supabase
      .from('activity_types')
      .insert({
        organization_id: organizationId,
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        default_duration_minutes: parsed.data.defaultDurationMinutes,
      })
      .select('id')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateActivityType(
  activityTypeId: string,
  input: z.input<typeof activityTypeSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')
    const parsed = activityTypeSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    await assertResourceInOrg(supabase, 'activity_types', activityTypeId, organizationId)

    const { error } = await supabase
      .from('activity_types')
      .update({
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        default_duration_minutes: parsed.data.defaultDurationMinutes,
      })
      .eq('id', activityTypeId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function setActivityTypeArchived(
  activityTypeId: string,
  archived: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('taxonomy:manage')
    const { error } = await supabase
      .from('activity_types')
      .update({ is_archived: archived })
      .eq('id', activityTypeId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}
