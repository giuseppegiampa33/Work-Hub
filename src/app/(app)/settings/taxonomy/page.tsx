import type { Metadata } from 'next'
import { requireOrgContext } from '@/lib/auth/guards'
import { TaxonomySettings } from './taxonomy-settings'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Categorie e attività' }

export default async function TaxonomySettingsPage() {
  const context = await requireOrgContext()

  if (!context.can('taxonomy:manage')) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="Accesso riservato"
          description="Responsabili, amministratori e proprietari possono gestire categorie e attività."
        />
      </div>
    )
  }

  return <TaxonomySettings />
}
