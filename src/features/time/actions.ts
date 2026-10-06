'use server'

import type { z } from 'zod'
import { assertResourceInOrg, authorize } from '@/lib/auth/guards'
import { fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import type { UpdateDto } from '@/types/database'
import { timeEntryPatchSchema, timeEntrySchema } from './schemas'

/**
 * Time entries.
 *
 * A person always logs their own hours: `user_id` is taken from the session,
 * never from the payload, and the RLS insert policy enforces the same rule.
 */
export async function logTime(
  input: z.input<typeof timeEntrySchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId, session } = await authorize('time:log')
    const parsed = timeEntrySchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const values = parsed.data
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        organization_id: organizationId,
        user_id: session.userId,
        client_id: values.clientId,
        ticket_id: values.ticketId,
        category_id: values.categoryId,
        activity_type_id: values.activityTypeId,
        calendar_event_id: values.calendarEventId,
        entry_date: values.entryDate,
        start_time: values.startTime ?? null,
        end_time: values.endTime ?? null,
        duration_minutes: values.durationMinutes,
        description: values.description,
        is_billable: values.isBillable,
      })
      .select('id')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateTimeEntry(
  input: z.input<typeof timeEntryPatchSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('time:log')
    const parsed = timeEntryPatchSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const { id, ...values } = parsed.data
    await assertResourceInOrg(supabase, 'time_entries', id, organizationId)

    const patch: UpdateDto<'time_entries'> = {}
    if (values.entryDate !== undefined) patch.entry_date = values.entryDate
    if (values.clientId !== undefined) patch.client_id = values.clientId
    if (values.ticketId !== undefined) patch.ticket_id = values.ticketId
    if (values.categoryId !== undefined) patch.category_id = values.categoryId
    if (values.activityTypeId !== undefined) patch.activity_type_id = values.activityTypeId
    if (values.startTime !== undefined) patch.start_time = values.startTime
    if (values.endTime !== undefined) patch.end_time = values.endTime
    if (values.durationMinutes !== undefined) patch.duration_minutes = values.durationMinutes
    if (values.description !== undefined) patch.description = values.description
    if (values.isBillable !== undefined) patch.is_billable = values.isBillable

    if (Object.keys(patch).length === 0) return ok()

    const { error } = await supabase
      .from('time_entries')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteTimeEntry(entryId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('time:log')
    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', entryId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/**
 * Turns a planned calendar event into logged hours in one transaction.
 * The RPC copies client, ticket and taxonomy from the event so the two records
 * cannot drift apart.
 */
export async function completeCalendarEvent(input: {
  eventId: string
  durationMinutes?: number
  description?: string
  isBillable?: boolean
  /** Fuso del browser: senza, l'orario finirebbe registrato in UTC. */
  timeZone?: string
}): Promise<ActionResult<{ timeEntryId: string }>> {
  try {
    const { supabase, organizationId } = await authorize('time:log')
    await assertResourceInOrg(supabase, 'calendar_events', input.eventId, organizationId)

    const { data, error } = await supabase.rpc('complete_calendar_event', {
      p_event: input.eventId,
      p_duration_minutes: input.durationMinutes ?? null,
      p_description: input.description ?? null,
      p_is_billable: input.isBillable ?? true,
      p_timezone: input.timeZone ?? 'UTC',
    })

    if (error) return toActionResult(error)
    return ok({ timeEntryId: data })
  } catch (error) {
    return toActionResult(error)
  }
}
