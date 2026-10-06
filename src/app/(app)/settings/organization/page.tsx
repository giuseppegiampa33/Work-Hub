import type { Metadata } from 'next'
import { requireOrgContext } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { OrganizationSettings } from './organization-settings'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Organizzazione' }

export default async function OrganizationSettingsPage() {
  const context = await requireOrgContext()

  if (!context.can('org:manage')) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="Accesso riservato"
          description="Solo proprietari e amministratori possono modificare le impostazioni dell'organizzazione."
        />
      </div>
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', context.organizationId)
    .single()

  if (!organization) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState title="Organizzazione non trovata" />
      </div>
    )
  }

  return <OrganizationSettings organization={organization} isOwner={context.role === 'owner'} />
}
