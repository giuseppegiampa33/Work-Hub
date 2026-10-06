import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PageSkeleton } from '@/components/app/page-skeleton'
import { requireOrgContext } from '@/lib/auth/guards'
import { CalendarView } from './calendar-view'

export const metadata: Metadata = { title: 'Calendario' }

export default async function CalendarPage() {
  const context = await requireOrgContext()

  if (!context.can('calendar:view')) {
    return (
      <div className="mx-auto w-full max-w-content px-3 py-6 sm:px-5">
        <h1 className="text-page-title text-fg">Calendario</h1>
        <p className="mt-2 text-body-sm text-fg-muted">
          Il tuo ruolo in questa organizzazione non include l&apos;accesso al calendario.
        </p>
      </div>
    )
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <CalendarView />
    </Suspense>
  )
}
