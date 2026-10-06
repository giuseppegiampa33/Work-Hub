'use client'

import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Root error boundary.
 *
 * Shows what the user can do, not the stack: the digest is enough to find the
 * trace in the server logs without leaking internals to the browser.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    // Surfaced in the browser console and in the server log for the digest.
    console.error('Work-Hub error boundary', error)
  }, [error])

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4 text-center"
    >
      <span
        className="inline-flex size-10 items-center justify-center rounded-md border border-danger-line bg-danger-subtle text-danger"
        aria-hidden
      >
        <RefreshCw className="size-5" />
      </span>
      <div className="flex max-w-[48ch] flex-col gap-1.5">
        <h1 className="text-display text-fg">Qualcosa non ha funzionato</h1>
        <p className="text-body-sm text-fg-muted">
          La pagina non è stata completata. Riprova: se il problema persiste, segnalalo
          indicando il codice qui sotto.
        </p>
        {error.digest ? (
          <code className="mt-1 self-center rounded-xs bg-surface-sunken px-2 py-1 font-mono text-caption text-fg-secondary">
            {error.digest}
          </code>
        ) : null}
      </div>
      <Button variant="primary" size="md" icon={<RefreshCw />} onClick={reset}>
        Riprova
      </Button>
    </main>
  )
}
