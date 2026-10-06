import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { APP_NAME, SITE_URL } from '@/config/app'
import { color } from '@/config/tokens'
import { QueryProvider } from '@/lib/query/provider'
import { ToastViewport } from '@/components/ui/toast'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-plus-jakarta',
  fallback: ['system-ui', 'Segoe UI', 'sans-serif'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${APP_NAME} · Gestione operativa per team`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    'Work-Hub organizza clienti, ticket, attività pianificate e ore lavorate per piccoli team, con dati isolati per ogni azienda.',
  applicationName: APP_NAME,
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lets the app paint behind the notch and the home indicator.
  viewportFit: 'cover',
  // Matches the canvas token so the browser chrome blends with the app.
  themeColor: color.canvas,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={plusJakarta.variable}>
      <body>
        <a
          href="#main"
          className="sr-only-focusable fixed left-4 top-4 z-toast rounded-md border border-line bg-surface px-3 py-2 text-body-sm text-fg shadow-popover"
        >
          Vai al contenuto principale
        </a>
        <QueryProvider>{children}</QueryProvider>
        <ToastViewport />
      </body>
    </html>
  )
}
