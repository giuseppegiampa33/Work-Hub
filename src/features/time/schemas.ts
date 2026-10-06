import { z } from 'zod'
import { optionalText, optionalTime, optionalUuid } from '@/lib/validation'

export const timeEntrySchema = z
  .object({
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data non valida.'),
    clientId: optionalUuid(),
    ticketId: optionalUuid(),
    categoryId: optionalUuid(),
    activityTypeId: optionalUuid(),
    calendarEventId: optionalUuid(),
    /** O una coppia inizio/fine, o una durata esplicita. */
    startTime: optionalTime(),
    endTime: optionalTime(),
    durationMinutes: z
      .number({ invalid_type_error: 'Inserisci una durata.' })
      .int('La durata deve essere in minuti interi.')
      .min(1, 'La durata deve essere almeno 1 minuto.')
      .max(1440, 'La durata non può superare 24 ore.'),
    description: optionalText(2000, 'La descrizione è troppo lunga.'),
    isBillable: z.boolean(),
  })
  .refine(
    (value) =>
      (value.startTime == null && value.endTime == null) ||
      (value.startTime != null && value.endTime != null),
    { message: 'Indica sia inizio sia fine, oppure nessuno dei due.', path: ['endTime'] },
  )

export type TimeEntryFormValues = z.input<typeof timeEntrySchema>

export const timeEntryPatchSchema = timeEntrySchema.innerType().partial().extend({
  id: z.string().uuid(),
})
