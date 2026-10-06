import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { requireOrgContext } from '@/lib/auth/guards'
import { ClientsView } from './clients-view'

export const metadata: Metadata = { title: 'Clienti' }

export default async function ClientsPage() {
  const context = await requireOrgContext()

  if (!context.can('clients:view')) {
    return (
      <div className="mx-auto w-full max-w-content px-3 py-6 sm:px-5">
        <h1 className="text-page-title text-fg">Clienti</h1>
        <p className="mt-2 text-body-sm text-fg-muted">
          Il tuo ruolo in questa organizzazione non include l&apos;accesso all&apos;anagrafica
          clienti.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClientsView />
    </Suspense>
  )
}
