import { z } from 'zod'

/** Shared by the onboarding form, the settings form and the server actions. */
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Il nome deve contenere almeno 2 caratteri.')
    .max(80, 'Il nome non può superare 80 caratteri.'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "L'identificativo deve contenere almeno 3 caratteri.")
    .max(40, "L'identificativo non può superare 40 caratteri.")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      'Usa solo lettere minuscole, numeri e trattini, senza iniziare o finire con un trattino.',
    ),
})

export const updateOrganizationSchema = z.object({
  name: createOrganizationSchema.shape.name,
  slug: createOrganizationSchema.shape.slug,
})
