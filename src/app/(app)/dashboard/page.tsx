import type { Metadata } from 'next'
import { requireOrgContext } from '@/lib/auth/guards'
import { DashboardView } from './dashboard-view'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const context = await requireOrgContext()

  return (
    <DashboardView
      organizationName={context.session.activeOrganization!.organization.name}
      firstName={context.session.profile?.full_name?.split(' ')[0] ?? null}
    />
  )
}
