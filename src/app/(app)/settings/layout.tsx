import Link from 'next/link'
import { SETTINGS_NAV } from '@/config/navigation'
import { roleHasAny } from '@/config/roles'
import { requireOrgContext } from '@/lib/auth/guards'
import { SettingsNav } from './settings-nav'

/**
 * Settings shell.
 *
 * The section list is filtered on the server by the active role, so a page a
 * member cannot open is never even linked. Each page re-checks its own
 * permission — the nav is a convenience, not the gate.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const context = await requireOrgContext()

  const items = SETTINGS_NAV.filter(
    (item) => !item.permissions || roleHasAny(context.role, item.permissions),
  ).map((item) => ({ href: item.href, label: item.label, description: item.description }))

  return (
    <div className="mx-auto w-full max-w-content px-3 py-4 sm:px-5 sm:py-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-page-title text-fg">Impostazioni</h1>
          <p className="text-body-sm text-fg-muted">
            Profilo personale, organizzazione, membri e tassonomia di{' '}
            {context.session.activeOrganization?.organization.name}.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          <SettingsNav items={items} />
          <div className="min-w-0">{children}</div>
        </div>
      </div>

      <noscript>
        <ul className="mt-6 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="text-body-sm text-brand-text underline">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </noscript>
    </div>
  )
}
