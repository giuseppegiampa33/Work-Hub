import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { requireOrgContext } from '@/lib/auth/guards'
import { ReportsView } from './reports-view'

export const metadata: Metadata = { title: 'Report' }

export default async function ReportsPage() {
  const context = await requireOrgContext()

  // `time:view_own` is enough to see one's own hours; `reports:view` unlocks
  // the organization-wide aggregates.
  if (!context.can('reports:view') && !context.can('time:view_own')) {
    return (
      <div className="mx-auto w-full max-w-content px-3 py-6 sm:px-5">
        <h1 className="text-page-title text-fg">Report</h1>
        <p className="mt-2 text-body-sm text-fg-muted">
          Il tuo ruolo in questa organizzazione non include l&apos;accesso ai report.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ReportsView canViewAll={context.can('reports:view')} />
    </Suspense>
  )
}
