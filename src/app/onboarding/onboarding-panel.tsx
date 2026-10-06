'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Mail, UserPlus } from 'lucide-react'
import type { z } from 'zod'
import { roleLabel } from '@/config/roles'
import { acceptInvite } from '@/features/members/actions'
import { createOrganization, suggestOrganizationSlug } from '@/features/organizations/actions'
import { createOrganizationSchema } from '@/features/organizations/schemas'
import { formatDate } from '@/lib/format'
import { slugify } from '@/lib/utils'
import { AuthHeading, FormAlert } from '@/components/app/auth-form'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioCard, RadioGroup } from '@/components/ui/checkbox'
import { notify } from '@/components/ui/toast'
import type { PendingInviteResult } from '@/types/database'

type FormValues = z.input<typeof createOrganizationSchema>

export function OnboardingPanel({
  fullName,
  email,
  pendingInvites,
  hasOrganizations,
}: {
  fullName: string | null
  email: string
  pendingInvites: PendingInviteResult[]
  hasOrganizations: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = React.useState<'create' | 'join'>(
    pendingInvites.length > 0 && !hasOrganizations ? 'join' : 'create',
  )
  const [formError, setFormError] = React.useState<string | null>(null)
  const [joining, setJoining] = React.useState<string | null>(null)
  const [slugEdited, setSlugEdited] = React.useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  })

  const nameValue = form.watch('name')

  // The slug follows the name until the user takes it over.
  React.useEffect(() => {
    if (slugEdited) return
    form.setValue('slug', slugify(nameValue ?? ''), { shouldValidate: false })
  }, [nameValue, slugEdited, form])

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)

    // Resolve a collision before showing the user an error they cannot act on.
    let slug = values.slug
    const suggestion = await suggestOrganizationSlug(values.slug || values.name)
    if (suggestion.ok && !slugEdited) slug = suggestion.data

    const result = await createOrganization({ ...values, slug })
    if (!result.ok) {
      if (result.field === 'name' || result.field === 'slug') {
        form.setError(result.field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }
    notify.success('Organizzazione creata', result.data.name)
    router.replace('/dashboard')
  })

  const onAccept = async (token: string) => {
    setJoining(token)
    const result = await acceptInvite(token)
    setJoining(null)
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    notify.success('Benvenuto nel team')
    router.replace('/dashboard')
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthHeading
        title={fullName ? `Ciao ${fullName.split(' ')[0]}` : 'Imposta il tuo spazio di lavoro'}
        description={
          pendingInvites.length > 0
            ? 'Hai un invito in attesa. Puoi accettarlo oppure creare una nuova organizzazione.'
            : "Crea l'organizzazione della tua azienda: diventerai il proprietario e potrai invitare il team."
        }
      />

      {pendingInvites.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-table-heading uppercase text-fg-muted">Inviti per {email}</h2>
          <ul className="flex flex-col gap-2">
            {pendingInvites.map((invite) => (
              <li
                key={invite.token}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-brand"
                    aria-hidden
                  >
                    <Mail className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-body-sm font-medium text-fg">
                      {invite.organization_name}
                    </span>
                    <span className="flex items-center gap-2 text-meta text-fg-muted">
                      <Badge tone="brand" size="sm">
                        {roleLabel(invite.role)}
                      </Badge>
                      Scade il {formatDate(invite.expires_at)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<UserPlus />}
                  loading={joining === invite.token}
                  onClick={() => void onAccept(invite.token)}
                >
                  Accetta
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RadioGroup
        value={mode}
        onValueChange={(value) => setMode(value as 'create' | 'join')}
        aria-label="Come vuoi iniziare"
        className="gap-2"
      >
        <RadioCard
          value="create"
          id="mode-create"
          title="Crea una nuova organizzazione"
          description="Per la tua azienda o il tuo studio. Diventi proprietario e inviti il team."
          icon={<Building2 />}
        />
        <RadioCard
          value="join"
          id="mode-join"
          title="Unisciti con un invito"
          description="Hai bisogno del link di invito che ti è stato inviato da un amministratore."
          icon={<UserPlus />}
        />
      </RadioGroup>

      {mode === 'create' ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError ? <FormAlert>{formError}</FormAlert> : null}

          <Field
            label="Nome dell'organizzazione"
            htmlFor="name"
            error={form.formState.errors.name?.message}
            required
          >
            <Input
              id="name"
              autoFocus
              placeholder="Studio Rossi"
              invalid={Boolean(form.formState.errors.name)}
              {...form.register('name')}
            />
          </Field>

          <Field
            label="Identificativo"
            htmlFor="slug"
            description="Usato negli indirizzi e negli inviti. Solo minuscole, numeri e trattini."
            error={form.formState.errors.slug?.message}
            required
          >
            <Input
              id="slug"
              placeholder="studio-rossi"
              invalid={Boolean(form.formState.errors.slug)}
              {...form.register('slug', {
                onChange: () => setSlugEdited(true),
              })}
            />
          </Field>

          <Button
            type="submit"
            variant="primary"
            size="block"
            loading={form.formState.isSubmitting}
            className="mt-1"
          >
            Crea organizzazione
          </Button>
        </form>
      ) : (
        <FormAlert tone="info">
          Chiedi a un amministratore di generare un invito per <strong>{email}</strong> dalla pagina
          Impostazioni → Membri. Il link che riceverai apre direttamente questa organizzazione.
        </FormAlert>
      )}
    </div>
  )
}
