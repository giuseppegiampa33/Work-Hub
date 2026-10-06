import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas px-4 text-center"
    >
      <span className="text-table-heading uppercase text-fg-muted">Errore 404</span>
      <div className="flex max-w-[44ch] flex-col gap-1.5">
        <h1 className="text-display text-fg">Pagina non trovata</h1>
        <p className="text-body-sm text-fg-muted">
          Il contenuto è stato spostato, eliminato, oppure appartiene a un&apos;altra
          organizzazione.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="primary" size="md">
          <Link href="/dashboard">Vai alla dashboard</Link>
        </Button>
        <Button asChild variant="secondary" size="md">
          <Link href="/tickets">Apri i ticket</Link>
        </Button>
      </div>
    </main>
  )
}
