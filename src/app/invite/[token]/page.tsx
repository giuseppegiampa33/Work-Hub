import type { Metadata } from 'next'
import Link from 'next/link'
import { APP_NAME } from '@/config/app'
import { ROLE_DESCRIPTORS, roleLabel } from '@/config/roles'
import { formatDate } from '@/lib/format'
import { getAppSession } from '@/lib/auth/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OrgMark } from '@/components/ui/avatar'
import { FormAlert } from '@/components/app/auth-form'
import { AcceptInviteButton } from './accept-invite-button'

export const metadata: Metadata = { title: 'Invito' }

/**
 * Invite landing page.
 *
 * Renders for signed-out visitors too: the token is the secret, and
 * `invite_preview` exposes nothing beyond the organization name, the offered
 * role and the address the invite was issued to. Accepting always requires a
 * signed-in session whose email matches.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()
  const [{ data: previewRows }, session] = await Promise.all([
    supabase.rpc('invite_preview', { p_token: token }),
    getAppSession(),
  ])

  const invite = previewRows?.[0] ?? null

  return (
    <main id="main" className="flex min-h-dvh flex-col bg-canvas px-4 py-8 pt-safe sm:py-16">
      <div className="mx-auto w-full max-w-[520px]">
        <div className="mb-8 flex items-center gap-2">
          <span
            className="inline-flex size-7 items-center justify-center rounded-sm bg-brand text-body-sm font-semibold text-brand-contrast"
            aria-hidden
          >
            W
          </span>
          <span className="text-subsection-title text-fg">{APP_NAME}</span>
        </div>

        {!invite ? (
          <div className="flex flex-col gap-4">
            <h1 className="text-display text-fg">Invito non trovato</h1>
            <p className="text-body-sm text-fg-secondary">
              Il link non è valido. Chiedi a un amministratore di generarne uno nuovo.
            </p>
            <Button asChild variant="secondary" size="md" className="self-start">
              <Link href="/login">Vai all&apos;accesso</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <OrgMark name={invite.organization_name} logoUrl={invite.organization_logo_url} size="lg" />
              <div className="flex min-w-0 flex-col">
                <span className="text-caption uppercase tracking-[0.06em] text-fg-muted">
                  Invito a collaborare
                </span>
                <h1 className="truncate text-display text-fg">{invite.organization_name}</h1>
              </div>
            </div>

            <dl className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-meta text-fg-muted">Indirizzo invitato</dt>
                <dd className="truncate text-body-sm text-fg">{invite.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-meta text-fg-muted">Ruolo</dt>
                <dd>
                  <Badge tone="brand" size="md">
                    {roleLabel(invite.role)}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-meta text-fg-muted">Validità</dt>
                <dd className="text-body-sm text-fg">fino al {formatDate(invite.expires_at)}</dd>
              </div>
            </dl>

            <p className="text-body-sm text-fg-secondary">
              {ROLE_DESCRIPTORS[invite.role].summary}
            </p>

            {invite.status === 'pending' ? (
              session ? (
                session.email.toLowerCase() === invite.email.toLowerCase() ? (
                  <AcceptInviteButton token={token} organizationName={invite.organization_name} />
                ) : (
                  <FormAlert tone="warning">
                    Sei collegato come <strong>{session.email}</strong>, ma l&apos;invito è per{' '}
                    <strong>{invite.email}</strong>. Esci e accedi con l&apos;indirizzo corretto.
                  </FormAlert>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  <FormAlert tone="info">
                    Accedi o crea un account con <strong>{invite.email}</strong> per accettare
                    l&apos;invito.
                  </FormAlert>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="primary" size="md">
                      <Link href={`/signup?invite=${token}`}>Crea un account</Link>
                    </Button>
                    <Button asChild variant="secondary" size="md">
                      <Link href={`/login?next=/invite/${token}`}>Ho già un account</Link>
                    </Button>
                  </div>
                </div>
              )
            ) : (
              <FormAlert tone={invite.status === 'accepted' ? 'success' : 'warning'}>
                {invite.status === 'accepted'
                  ? 'Questo invito è già stato utilizzato.'
                  : invite.status === 'revoked'
                    ? 'Questo invito è stato revocato.'
                    : 'Questo invito è scaduto. Chiedine uno nuovo.'}
              </FormAlert>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
