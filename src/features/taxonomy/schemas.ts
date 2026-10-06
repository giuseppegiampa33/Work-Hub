import { z } from 'zod'

const TONES = ['brand', 'info', 'success', 'warning', 'danger', 'neutral'] as const

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Il nome è obbligatorio.').max(60, 'Massimo 60 caratteri.'),
  tone: z.enum(TONES),
})

export const activityTypeSchema = z.object({
  categoryId: z.string().uuid('Seleziona una categoria.'),
  name: z.string().trim().min(1, 'Il nome è obbligatorio.').max(60, 'Massimo 60 caratteri.'),
  defaultDurationMinutes: z
    .number({ invalid_type_error: 'Inserisci una durata.' })
    .int()
    .min(5, 'Minimo 5 minuti.')
    .max(1440, 'Massimo 24 ore.'),
})
