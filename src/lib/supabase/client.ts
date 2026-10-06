'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let cached: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Browser Supabase client.
 *
 * Reads go through this client so RLS is always the enforcing layer, and the
 * query cache lives in TanStack Query. Writes that need a permission check with
 * a readable error message go through server actions instead.
 */
export function getSupabaseBrowserClient() {
  if (!cached) {
    cached = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
  }
  return cached
}

export type SupabaseBrowserClient = ReturnType<typeof getSupabaseBrowserClient>
