import 'server-only'

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

/**
 * Server Supabase client bound to the request cookies.
 *
 * Used by server components and server actions. RLS applies exactly as it does
 * in the browser: this client carries the user's access token, never the
 * service role key.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Called from a server component render: the middleware already
            // refreshed the session cookies, so this is safe to ignore.
          }
        },
      },
    },
  )
}

export type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>
