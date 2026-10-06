import type { Metadata } from 'next'
import { requireOrgContext } from '@/lib/auth/guards'
import { AuditLogView } from './audit-log-view'
import { EmptyState } from '@/components/ui/states'

export const metadata: Metadata = { title: 'Registro attività' }

export default async function AuditSettingsPage() {
  const context = await requireOrgContext()

  if (!context.can('audit:view')) {
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState
          title="Accesso riservato"
          description="Il registro delle operazioni critiche è visibile a responsabili, amministratori e proprietari."
        />
      </div>
    )
  }

  return <AuditLogView />
}
