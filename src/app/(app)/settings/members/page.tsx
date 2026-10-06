import type { Metadata } from 'next'
import { requireOrgContext } from '@/lib/auth/guards'
import { invitableRolesFor } from '@/config/roles'
import { MembersSettings } from './members-settings'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Membri e ruoli' }

export default async function MembersSettingsPage() {
  const context = await requireOrgContext()

  if (!context.can('members:view')) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="Accesso riservato"
          description="Il tuo ruolo non include la visualizzazione dei membri."
        />
      </div>
    )
  }

  return (
    <MembersSettings
      currentUserId={context.session.userId}
      role={context.role}
      invitableRoles={invitableRolesFor(context.role)}
    />
  )
}
