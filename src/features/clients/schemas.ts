import { z } from 'zod'
import { optionalEmail, optionalText } from '@/lib/validation'

export const clientFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Il nome è obbligatorio.')
    .max(120, 'Il nome non può superare 120 caratteri.'),
  code: optionalText(24, 'Il codice è troppo lungo.'),
  email: optionalEmail(),
  phone: optionalText(40, 'Il telefono è troppo lungo.'),
  address: optionalText(240, "L'indirizzo è troppo lungo."),
  notes: optionalText(4000, 'Le note sono troppo lunghe.'),
})

export type ClientFormValues = z.input<typeof clientFormSchema>
