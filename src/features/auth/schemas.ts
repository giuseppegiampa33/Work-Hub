import { z } from 'zod'

/**
 * Validation schemas for the authentication flows.
 *
 * They live outside `actions.ts` because a `'use server'` module may only
 * export async functions — every schema and helper has to sit in a plain
 * module that both the server action and the client form can import.
 */

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email('Inserisci un indirizzo email valido.'),
  password: z.string().min(8, 'La password deve contenere almeno 8 caratteri.'),
})

export const signUpSchema = credentialsSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, 'Inserisci il tuo nome.')
    .max(80, 'Il nome non può superare 80 caratteri.'),
})

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email('Inserisci un indirizzo email valido.'),
})

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'La password deve contenere almeno 8 caratteri.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Le password non corrispondono.',
    path: ['confirmPassword'],
  })

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Inserisci il tuo nome.').max(80),
})

export type SignUpOutcome = { needsEmailConfirmation: boolean }
