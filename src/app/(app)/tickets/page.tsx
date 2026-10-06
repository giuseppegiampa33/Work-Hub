import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { requireOrgContext } from '@/lib/auth/guards'
import { TicketsView } from './tickets-view'

export const metadata: Metadata = { title: 'Ticket' }

export default async function TicketsPage() {
  // Server-side gate: the role must at least be able to read tickets.
  const context = await requireOrgContext()
  const canView = context.can('tickets:view')

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-content px-3 py-6 sm:px-5">
        <h1 className="text-page-title text-fg">Ticket</h1>
        <p className="mt-2 text-body-sm text-fg-muted">
          Il tuo ruolo in questa organizzazione non include l&apos;accesso ai ticket.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <TicketsView />
    </Suspense>
  )
}
