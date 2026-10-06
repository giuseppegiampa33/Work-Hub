import Link from 'next/link'
import { APP_NAME } from '@/config/app'

/**
 * Auth shell.
 *
 * A single centred column on the warm canvas, with the product promise on the
 * right at desktop width. No illustration, no gradient: the page states what
 * the product does and gets out of the way.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas pt-safe">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-sm outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]"
        >
          <span
            className="inline-flex size-7 items-center justify-center rounded-sm bg-brand text-body-sm font-semibold text-brand-contrast"
            aria-hidden
          >
            W
          </span>
          <span className="text-subsection-title text-fg">{APP_NAME}</span>
        </Link>
        <Link
          href="/design-system"
          className="text-meta text-fg-muted underline-offset-2 hover:text-fg-secondary hover:underline"
        >
          Design system
        </Link>
      </header>

      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        <div className="grid w-full max-w-[980px] gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
          <div className="w-full">{children}</div>

          <aside className="hidden flex-col justify-center gap-6 border-l border-line-subtle pl-16 lg:flex">
            <p className="max-w-[38ch] text-display text-fg">
              Il lavoro del team, in un solo posto.
            </p>
            <ul className="flex max-w-[44ch] flex-col gap-3 text-body-sm text-fg-secondary">
              <li className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                Ticket con stato, priorità, responsabile e scadenza.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                Calendario settimanale lunedì–venerdì, 08:00–18:00.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                Ore registrate per cliente, attività e ticket.
              </li>
              <li className="flex gap-2.5">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                Ogni azienda ha il proprio spazio dati, isolato.
              </li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  )
}
