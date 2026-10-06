import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SIDEBAR_COOKIE } from '@/config/app'
import { requireUser } from '@/lib/auth/guards'
import { AppShell } from '@/components/app/app-shell'
import type { SessionView } from '@/components/app/session-provider'
import { SchemaMissingState } from '@/components/ui/states'

/**
 * Authenticated area.
 *
 * This is where the tenant is resolved: `requireUser` loads the session once
 * per request (cached), the active organization is validated against the
 * membership table, and the result is handed to the client shell. Every page
 * below this layout can assume a valid `(user, organization, role)` triple.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser()

  if (session.schemaMissing) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-[640px] rounded-lg border border-line bg-surface">
          <SchemaMissingState />
        </div>
      </main>
    )
  }

  if (!session.activeOrganization) {
    redirect('/onboarding')
  }

  const cookieStore = await cookies()
  const defaultCollapsed = cookieStore.get(SIDEBAR_COOKIE)?.value === '1'

  const view: SessionView = {
    userId: session.userId,
    email: session.email,
    fullName: session.profile?.full_name ?? null,
    avatarUrl: session.profile?.avatar_url ?? null,
    organizations: session.memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      logoUrl: membership.organization.logo_url,
      role: membership.role,
    })),
    activeOrganization: {
      id: session.activeOrganization.organization.id,
      name: session.activeOrganization.organization.name,
      slug: session.activeOrganization.organization.slug,
      logoUrl: session.activeOrganization.organization.logo_url,
      role: session.activeOrganization.role,
    },
  }

  return (
    <AppShell session={view} defaultCollapsed={defaultCollapsed}>
      {children}
    </AppShell>
  )
}
