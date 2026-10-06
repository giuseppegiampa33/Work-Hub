import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Service-role client. Bypasses RLS, so it is deliberately hard to reach:
 *
 *  - `server-only` makes importing it from a client component a build error;
 *  - it is only used where a tenant check cannot be expressed in SQL and the
 *    caller has already been authorised (see `lib/auth/guards.ts`);
 *  - every call site must still filter by `organization_id` by hand.
 *
 * Today the only use is reading auth metadata that RLS cannot expose.
 */
export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
