import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Session refresh plus coarse route protection.
 *
 * What happens here: the Supabase access token is refreshed and the cookies are
 * written onto the response, then unauthenticated requests to application
 * routes are bounced to `/login` and authenticated requests to the auth pages
 * are bounced to `/dashboard`.
 *
 * What deliberately does **not** happen here: membership and permission
 * checks. The middleware runs on every single request, including prefetches;
 * doing database work here would add a round trip to each navigation. Those
 * checks live in the `(app)` layout, where `getAppSession()` caches them per
 * request, and in RLS, which is the real boundary.
 */

const PUBLIC_PREFIXES = ['/login', '/signup', '/forgot-password', '/invite', '/auth']
const SEMI_PUBLIC_PREFIXES = ['/reset-password', '/design-system']

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname, searchParams } = request.nextUrl

  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  const isSemiPublic = SEMI_PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )

  if (!user && !isPublic && !isSemiPublic) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.search = ''
    // Preserve the destination so login can return the user to it.
    if (pathname !== '/') redirectUrl.searchParams.set('next', pathname + (searchParams.size ? `?${searchParams}` : ''))
    return NextResponse.redirect(redirectUrl)
  }

  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, so the session
     * refresh never runs for a .svg.
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)',
  ],
}
