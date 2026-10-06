import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { APP_NAME } from '@/config/app'
import { requireUser } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OnboardingPanel } from './onboarding-panel'
import { SchemaMissingState } from '@/components/ui/states'
import type { PendingInviteResult } from '@/types/database'

export const metadata: Metadata = { title: 'Inizia' }

/**
 * Onboarding.
 *
 * Reached right after signup, or whenever a signed-in user has no membership.
 * Two paths: create an organization (become its owner) or accept an invite
 * already issued to this email address.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const session = await requireUser()
  const { mode } = await searchParams

  if (session.schemaMissing) {
    return (
      <main id="main" className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-[640px] rounded-lg border border-line bg-surface">
          <SchemaMissingState />
        </div>
      </main>
    )
  }

  // Already a member and not explicitly creating another tenant: go to work.
  if (session.memberships.length > 0 && mode !== 'create') {
    redirect('/dashboard')
  }

  const supabase = await createSupabaseServerClient()
  const { data: invites } = await supabase.rpc('my_pending_invites')
  const pendingInvites: PendingInviteResult[] = invites ?? []

  return (
    <main id="main" className="flex min-h-dvh flex-col bg-canvas px-4 py-8 pt-safe sm:py-14">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="mb-8 flex items-center gap-2">
          <span
            className="inline-flex size-7 items-center justify-center rounded-sm bg-brand text-body-sm font-semibold text-brand-contrast"
            aria-hidden
          >
            W
          </span>
          <span className="text-subsection-title text-fg">{APP_NAME}</span>
        </div>

        <OnboardingPanel
          fullName={session.profile?.full_name ?? null}
          email={session.email}
          pendingInvites={pendingInvites}
          hasOrganizations={session.memberships.length > 0}
        />

        <p className="mt-8 text-meta text-fg-muted">
          Vuoi tornare indietro?{' '}
          <Link
            href={session.memberships.length > 0 ? '/dashboard' : '/login'}
            className="text-brand-text underline-offset-2 hover:underline"
          >
            {session.memberships.length > 0 ? 'Vai alla dashboard' : "Esci dall'account"}
          </Link>
        </p>
      </div>
    </main>
  )
}
