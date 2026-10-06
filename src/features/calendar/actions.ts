'use server'

import type { z } from 'zod'
import { assertResourceInOrg, authorize } from '@/lib/auth/guards'
import { fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import { calendarEventMoveSchema, calendarEventSchema, toTimestamp } from './schemas'

export async function createCalendarEvent(
  input: z.input<typeof calendarEventSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId, session, can } = await authorize('calendar:plan')
    const parsed = calendarEventSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const values = parsed.data
    if (values.ownerId !== session.userId && !can('calendar:plan_others')) {
      return fail('Puoi pianificare solo le tue attività.', 'forbidden', 'ownerId')
    }

    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        organization_id: organizationId,
        owner_id: values.ownerId,
        created_by: session.userId,
        title: values.title,
        description: values.description,
        starts_at: toTimestamp(values.date, values.startTime),
        ends_at: toTimestamp(values.date, values.endTime),
        ticket_id: values.ticketId,
        client_id: values.clientId,
        category_id: values.categoryId,
        activity_type_id: values.activityTypeId,
        is_planned: values.isPlanned,
      })
      .select('id')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateCalendarEvent(
  eventId: string,
  input: z.input<typeof calendarEventSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId, session, can } = await authorize('calendar:plan')
    const parsed = calendarEventSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const values = parsed.data
    if (values.ownerId !== session.userId && !can('calendar:plan_others')) {
      return fail('Puoi modificare solo le tue attività.', 'forbidden', 'ownerId')
    }

    await assertResourceInOrg(supabase, 'calendar_events', eventId, organizationId)

    const { error } = await supabase
      .from('calendar_events')
      .update({
        owner_id: values.ownerId,
        title: values.title,
        description: values.description,
        starts_at: toTimestamp(values.date, values.startTime),
        ends_at: toTimestamp(values.date, values.endTime),
        ticket_id: values.ticketId,
        client_id: values.clientId,
        category_id: values.categoryId,
        activity_type_id: values.activityTypeId,
        is_planned: values.isPlanned,
      })
      .eq('id', eventId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Drag/resize in the week grid: only the instants change. */
export async function moveCalendarEvent(
  input: z.input<typeof calendarEventMoveSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('calendar:plan')
    const parsed = calendarEventMoveSchema.safeParse(input)
    if (!parsed.success) return fail('Spostamento non valido.', 'validation')

    const { error } = await supabase
      .from('calendar_events')
      .update({
        starts_at: toTimestamp(parsed.data.date, parsed.data.startTime),
        ends_at: toTimestamp(parsed.data.date, parsed.data.endTime),
      })
      .eq('id', parsed.data.id)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('calendar:plan')
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}
