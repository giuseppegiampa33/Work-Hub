import { z } from 'zod'
import { TICKET_PRIORITIES, TICKET_STATUSES } from '@/config/tickets'
import { optionalDate, optionalText, optionalUuid } from '@/lib/validation'

export const ticketFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Il titolo deve contenere almeno 3 caratteri.')
    .max(160, 'Il titolo non può superare 160 caratteri.'),
  description: optionalText(20000, 'La descrizione è troppo lunga.'),
  clientId: optionalUuid(),
  assigneeId: optionalUuid(),
  categoryId: optionalUuid(),
  activityTypeId: optionalUuid(),
  status: z.enum(TICKET_STATUSES),
  priority: z.enum(TICKET_PRIORITIES),
  dueDate: optionalDate(),
})

export type TicketFormValues = z.input<typeof ticketFormSchema>

export const ticketPatchSchema = z.object({
  id: z.string().uuid(),
  title: ticketFormSchema.shape.title.optional(),
  description: optionalText(20000, 'La descrizione è troppo lunga.').optional(),
  clientId: optionalUuid(),
  assigneeId: optionalUuid(),
  categoryId: optionalUuid(),
  activityTypeId: optionalUuid(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  dueDate: optionalDate(),
})

export const commentSchema = z.object({
  ticketId: z.string().uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Scrivi un commento.')
    .max(10000, 'Il commento è troppo lungo.'),
})

export type CommentFormValues = z.input<typeof commentSchema>
