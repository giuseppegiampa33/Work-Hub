import { Skeleton } from '@/components/ui/states'

/**
 * Fallback for the Suspense boundary around a page that reads the URL.
 *
 * Every boundary gets one on purpose: a boundary with no fallback renders
 * nothing while it is suspended, and "nothing" is indistinguishable from a
 * broken page. This mirrors the page frame — title row, filter row, table —
 * so the real content lands without the layout jumping.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-content px-3 py-4 sm:px-5 sm:py-6" aria-busy>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <Skeleton className="h-[420px] w-full rounded-lg" />
      </div>
      <span className="sr-only">Caricamento della pagina…</span>
    </div>
  )
}
