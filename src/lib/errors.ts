import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Result envelope shared by every server action.
 * Actions never throw across the boundary: the UI gets a discriminated union it
 * can render as a field error, a toast, or a full error state.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ActionErrorCode; field?: string }

export type ActionErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'schema_missing'
  | 'unknown'

export class ActionError extends Error {
  readonly code: ActionErrorCode
  readonly field?: string

  constructor(code: ActionErrorCode, message: string, field?: string) {
    super(message)
    this.name = 'ActionError'
    this.code = code
    this.field = field
  }
}

export function ok(): ActionResult<undefined>
export function ok<T>(data: T): ActionResult<T>
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data }
}

export function fail(
  error: string,
  code: ActionErrorCode = 'unknown',
  field?: string,
): ActionResult<never> {
  return { ok: false, error, code, field }
}

/** PostgREST error code emitted when a table is absent from the schema cache. */
const SCHEMA_MISSING_CODES = new Set(['PGRST205', 'PGRST202', '42P01', '42883'])

export function isSchemaMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  return typeof code === 'string' && SCHEMA_MISSING_CODES.has(code)
}

/**
 * Turns a Postgres/PostgREST failure into something a user can act on.
 * Constraint names from `supabase/migrations` are mapped explicitly; anything
 * unknown degrades to a neutral message instead of leaking SQL.
 */
export function describePostgrestError(error: PostgrestError | null | undefined): ActionResult<never> {
  if (!error) return fail('Operazione non riuscita.')

  if (isSchemaMissingError(error)) {
    return fail(
      'Lo schema del database non è ancora stato applicato a questo progetto Supabase.',
      'schema_missing',
    )
  }

  const message = error.message ?? ''

  // Messages raised by our own guards and RPCs, mapped first.
  if (message.includes('cross-tenant reference rejected')) {
    return fail('La risorsa collegata non appartiene a questa organizzazione.', 'forbidden')
  }
  if (message.includes('at least one owner')) {
    return fail("L'organizzazione deve conservare almeno un proprietario.", 'conflict')
  }
  if (message.includes('is not a member of organization')) {
    return fail('La persona selezionata non è membro di questa organizzazione.', 'validation')
  }
  if (message.includes('invite expired')) return fail('Invito scaduto.', 'conflict')
  if (message.includes('invite revoked')) return fail('Invito revocato.', 'conflict')
  if (message.includes('invite already used')) return fail('Invito già utilizzato.', 'conflict')
  if (message.includes('invite not found')) return fail('Invito non trovato.', 'not_found')
  if (message.includes('invite issued to a different address')) {
    return fail('Questo invito è stato emesso per un altro indirizzo email.', 'forbidden')
  }
  if (message.includes('only the owner of the event')) {
    return fail('Solo chi è assegnato all’attività può consuntivarne le ore.', 'forbidden')
  }

  switch (error.code) {
    // unique_violation — surface the specific constraint when we know it.
    case '23505': {
      if (message.includes('organizations_slug_key')) {
        return fail('Questo identificativo è già utilizzato.', 'conflict', 'slug')
      }
      if (message.includes('invites_pending_unique')) {
        return fail('Esiste già un invito attivo per questa email.', 'conflict', 'email')
      }
      if (message.includes('categories_organization_id_name_key')) {
        return fail('Esiste già una categoria con questo nome.', 'conflict', 'name')
      }
      if (message.includes('activity_types_organization_id_category_id_name_key')) {
        return fail('Esiste già un tipo di attività con questo nome.', 'conflict', 'name')
      }
      if (message.includes('organization_members_organization_id_user_id_key')) {
        return fail('Questa persona è già membro dell’organizzazione.', 'conflict', 'email')
      }
      return fail('Elemento già presente.', 'conflict')
    }
    // check_violation
    case '23514':
      return fail('I dati inseriti non rispettano i vincoli previsti.', 'validation')
    // foreign_key_violation
    case '23503':
      return fail('Riferimento non valido: la risorsa collegata non esiste.', 'validation')
    // not_null_violation
    case '23502':
      return fail('Manca un campo obbligatorio.', 'validation')
    // insufficient_privilege / RLS rejection
    case '42501':
    case 'PGRST301':
      return fail('Non hai i permessi per questa operazione.', 'forbidden')
    // no rows returned by a `.single()` query
    case 'PGRST116':
      return fail('Elemento non trovato.', 'not_found')
    case 'P0002':
      return fail('Elemento non trovato.', 'not_found')
    default:
      return fail('Operazione non riuscita. Riprova.', 'unknown')
  }
}

/** Maps a thrown value (including `ActionError`) to an `ActionResult`. */
export function toActionResult(error: unknown): ActionResult<never> {
  if (error instanceof ActionError) {
    return fail(error.message, error.code, error.field)
  }
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return describePostgrestError(error as PostgrestError)
  }
  if (error instanceof Error) {
    return fail(error.message, 'unknown')
  }
  return fail('Operazione non riuscita. Riprova.', 'unknown')
}

/** Human message for Supabase Auth failures. */
export function describeAuthError(message: string | undefined): string {
  if (!message) return 'Autenticazione non riuscita.'
  const normalized = message.toLowerCase()
  if (normalized.includes('invalid login credentials')) return 'Email o password non corretti.'
  if (normalized.includes('email not confirmed')) {
    return 'Devi confermare il tuo indirizzo email prima di accedere.'
  }
  if (normalized.includes('user already registered')) {
    return 'Esiste già un account con questa email.'
  }
  if (normalized.includes('password should be at least')) {
    return 'La password è troppo corta.'
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Troppi tentativi. Attendi qualche minuto e riprova.'
  }
  if (normalized.includes('token has expired') || normalized.includes('invalid or expired')) {
    return 'Il link non è più valido. Richiedine uno nuovo.'
  }
  if (normalized.includes('same password')) {
    return 'La nuova password deve essere diversa dalla precedente.'
  }
  return message
}
