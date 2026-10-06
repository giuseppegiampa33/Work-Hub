import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Exchanges an email link for a session.
 *
 * Handles both shapes Supabase can send: `?code=` (PKCE — signup confirmation
 * and password recovery) and `?token_hash=&type=` (older email templates).
 * `next` is validated as a same-origin path so the callback can never be used
 * as an open redirect.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/dashboard'
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard'
  return raw
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = safeNext(searchParams.get('next'))
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createSupabaseServerClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Link non valido o scaduto.')}`, origin),
    )
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as 'signup' | 'recovery' | 'invite' | 'email_change' | 'magiclink',
    })
    if (!error) return NextResponse.redirect(new URL(next, origin))
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent('Link non valido o scaduto.')}`, origin),
    )
  }

  return NextResponse.redirect(new URL('/login', origin))
}
