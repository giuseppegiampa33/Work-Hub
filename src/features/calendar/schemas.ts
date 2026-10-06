import { z } from 'zod'
import { optionalText, optionalUuid } from '@/lib/validation'

export const calendarEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Il titolo è obbligatorio.')
      .max(160, 'Il titolo non può superare 160 caratteri.'),
    description: optionalText(4000, 'La descrizione è troppo lunga.'),
    ownerId: z.string().uuid('Seleziona una persona.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Ora di inizio non valida.'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Ora di fine non valida.'),
    ticketId: optionalUuid(),
    clientId: optionalUuid(),
    categoryId: optionalUuid(),
    activityTypeId: optionalUuid(),
    isPlanned: z.boolean().default(true),
  })
  .refine((value) => value.endTime > value.startTime, {
    message: 'La fine deve essere successiva all’inizio.',
    path: ['endTime'],
  })

export type CalendarEventFormValues = z.input<typeof calendarEventSchema>

export const calendarEventMoveSchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
})

/**
 * Data e ora locali -> istante assoluto.
 *
 * Work-Hub memorizza `timestamptz`, quindi il momento è univoco; l'interfaccia
 * lo mostra sempre nel fuso di chi guarda. Per un team su un solo fuso — il
 * caso per cui il prodotto è pensato — è esattamente il comportamento atteso.
 */
export function toTimestamp(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}
