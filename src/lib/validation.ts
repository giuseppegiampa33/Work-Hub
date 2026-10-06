import { z } from 'zod'

/**
 * Costruttori per i campi facoltativi, condivisi da tutti gli schemi.
 *
 * Esistono per una ragione precisa. Ogni schema viene applicato **due volte**:
 * dal form nel browser (`zodResolver`) e di nuovo dalla server action, che non
 * si fida mai del client. `zodResolver` però consegna all'handler i valori già
 * *trasformati*, quindi la action riceve ciò che lo schema produce — non ciò
 * che l'utente ha digitato.
 *
 * Con `.optional()` questo è un errore garantito: `''` diventa `null` nel
 * browser, e `null` non è un input valido per `.optional()`, che ammette solo
 * `undefined`. Il risultato è "Expected string, received null" su ogni campo
 * facoltativo lasciato vuoto.
 *
 * `.nullish()` accetta `string | null | undefined` e normalizza sempre a
 * `null`: lo schema diventa idempotente, cioè applicabile al proprio output.
 */

/** Testo facoltativo: accetta '', null o undefined, salva sempre null. */
export function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .nullish()
    .transform((value) => (value ? value : null))
}

/** Email facoltativa: validata solo quando è valorizzata. */
export function optionalEmail(invalid = 'Indirizzo email non valido.') {
  return z
    .union([z.literal(''), z.string().trim().toLowerCase().email(invalid)])
    .nullish()
    .transform((value) => (value ? value : null))
}

/** Riferimento facoltativo a un'altra riga. */
export function optionalUuid(invalid = 'Riferimento non valido.') {
  return z
    .union([z.literal(''), z.string().uuid(invalid)])
    .nullish()
    .transform((value) => (value ? value : null))
}

/** Data facoltativa in formato ISO (`2026-10-06`). */
export function optionalDate(invalid = 'Data non valida.') {
  return z
    .union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, invalid)])
    .nullish()
    .transform((value) => (value ? value : null))
}

/** Orario facoltativo `HH:MM`, troncato ai minuti. */
export function optionalTime(invalid = 'Ora non valida.') {
  return z
    .union([z.literal(''), z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, invalid)])
    .nullish()
    .transform((value) => (value ? value.slice(0, 5) : null))
}
