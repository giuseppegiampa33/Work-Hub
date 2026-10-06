'use server'

import type { z } from 'zod'
import { assertResourceInOrg, authorize } from '@/lib/auth/guards'
import { fail, ok, toActionResult, type ActionResult } from '@/lib/errors'
import type { TicketRow, UpdateDto } from '@/types/database'
import { commentSchema, ticketFormSchema, ticketPatchSchema } from './schemas'

/**
 * Ticket mutations.
 *
 * Every action re-checks the permission server-side and scopes the write to the
 * active organization, so a tampered client payload cannot reach another
 * tenant's row. RLS rejects it as well; this layer exists to turn that
 * rejection into a message the UI can show next to the right field.
 */

export async function createTicket(
  input: z.input<typeof ticketFormSchema>,
): Promise<ActionResult<{ id: string; reference: number }>> {
  try {
    const { supabase, organizationId, session } = await authorize('tickets:create')
    const parsed = ticketFormSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const values = parsed.data
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        organization_id: organizationId,
        creator_id: session.userId,
        title: values.title,
        description: values.description,
        client_id: values.clientId,
        assignee_id: values.assigneeId,
        category_id: values.categoryId,
        activity_type_id: values.activityTypeId,
        status: values.status,
        priority: values.priority,
        due_date: values.dueDate,
      })
      .select('id, reference')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function updateTicket(
  input: z.input<typeof ticketPatchSchema>,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId, can } = await authorize('tickets:update')
    const parsed = ticketPatchSchema.safeParse(input)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return fail(issue.message, 'validation', String(issue.path[0] ?? ''))
    }

    const { id, ...values } = parsed.data
    await assertResourceInOrg(supabase, 'tickets', id, organizationId)

    // Reassignment is a separate permission from editing the body of a ticket.
    if (values.assigneeId !== undefined && !can('tickets:assign')) {
      const { data: current } = await supabase
        .from('tickets')
        .select('assignee_id')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .single()

      if (current && current.assignee_id !== values.assigneeId) {
        return fail('Non hai i permessi per riassegnare un ticket.', 'forbidden', 'assigneeId')
      }
    }

    const patch: UpdateDto<'tickets'> = {}
    if (values.title !== undefined) patch.title = values.title
    if (values.description !== undefined) patch.description = values.description
    if (values.clientId !== undefined) patch.client_id = values.clientId
    if (values.assigneeId !== undefined) patch.assignee_id = values.assigneeId
    if (values.categoryId !== undefined) patch.category_id = values.categoryId
    if (values.activityTypeId !== undefined) patch.activity_type_id = values.activityTypeId
    if (values.status !== undefined) patch.status = values.status
    if (values.priority !== undefined) patch.priority = values.priority
    if (values.dueDate !== undefined) patch.due_date = values.dueDate

    if (Object.keys(patch).length === 0) return ok()

    const { error } = await supabase
      .from('tickets')
      .update(patch)
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteTicket(ticketId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('tickets:delete')
    await assertResourceInOrg(supabase, 'tickets', ticketId, organizationId)

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Restores a ticket deleted optimistically in the UI (toast undo). */
export async function restoreTicket(
  snapshot: Pick<
    TicketRow,
    | 'id'
    | 'title'
    | 'description'
    | 'client_id'
    | 'assignee_id'
    | 'category_id'
    | 'activity_type_id'
    | 'status'
    | 'priority'
    | 'due_date'
    | 'reference'
  >,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId, session } = await authorize('tickets:create')
    const { error } = await supabase.from('tickets').insert({
      ...snapshot,
      organization_id: organizationId,
      creator_id: session.userId,
    })

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

export async function addTicketComment(
  input: z.input<typeof commentSchema>,
): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, organizationId, session } = await authorize('tickets:comment')
    const parsed = commentSchema.safeParse(input)
    if (!parsed.success) {
      return fail(parsed.error.issues[0].message, 'validation', 'body')
    }

    await assertResourceInOrg(supabase, 'tickets', parsed.data.ticketId, organizationId)

    const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        organization_id: organizationId,
        ticket_id: parsed.data.ticketId,
        author_id: session.userId,
        body: parsed.data.body,
      })
      .select('id')
      .single()

    if (error) return toActionResult(error)
    return ok(data)
  } catch (error) {
    return toActionResult(error)
  }
}

export async function deleteTicketComment(commentId: string): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('tickets:comment')
    const { error } = await supabase
      .from('ticket_comments')
      .delete()
      .eq('id', commentId)
      .eq('organization_id', organizationId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}

/** Grants a guest explicit access to a ticket. */
export async function setTicketWatcher(
  ticketId: string,
  userId: string,
  watching: boolean,
): Promise<ActionResult> {
  try {
    const { supabase, organizationId } = await authorize('tickets:assign')
    await assertResourceInOrg(supabase, 'tickets', ticketId, organizationId)

    if (watching) {
      const { error } = await supabase
        .from('ticket_watchers')
        .insert({ organization_id: organizationId, ticket_id: ticketId, user_id: userId })
      if (error && error.code !== '23505') return toActionResult(error)
      return ok()
    }

    const { error } = await supabase
      .from('ticket_watchers')
      .delete()
      .eq('organization_id', organizationId)
      .eq('ticket_id', ticketId)
      .eq('user_id', userId)

    if (error) return toActionResult(error)
    return ok()
  } catch (error) {
    return toActionResult(error)
  }
}
