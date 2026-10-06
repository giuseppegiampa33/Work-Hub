import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth/guards'
import { ProfileSettings } from './profile-settings'

export const metadata: Metadata = { title: 'Profilo' }

export default async function ProfileSettingsPage() {
  const session = await requireUser()

  return (
    <ProfileSettings
      userId={session.userId}
      email={session.email}
      fullName={session.profile?.full_name ?? ''}
      avatarUrl={session.profile?.avatar_url ?? null}
      organizationCount={session.memberships.length}
    />
  )
}
