'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { updateOrganization, updateOrganizationLogo } from '@/features/organizations/actions'
import { updateOrganizationSchema } from '@/features/organizations/schemas'
import { formatDate } from '@/lib/format'
import { OrgMark } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DetailRow } from '@/components/ui/misc'
import { FormAlert } from '@/components/app/auth-form'
import { ImageUpload } from '@/components/app/image-upload'
import { notify } from '@/components/ui/toast'
import type { OrganizationRow } from '@/types/database'

type FormValues = z.input<typeof updateOrganizationSchema>

export function OrganizationSettings({
  organization,
  isOwner,
}: {
  organization: OrganizationRow
  isOwner: boolean
}) {
  const router = useRouter()
  const [logo, setLogo] = React.useState(organization.logo_url)
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { name: organization.name, slug: organization.slug },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await updateOrganization(values)
    if (!result.ok) {
      if (result.field === 'name' || result.field === 'slug') {
        form.setError(result.field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }
    notify.success('Organizzazione aggiornata')
    form.reset(values)
    router.refresh()
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Identità"
          description="Nome e logo compaiono nel selettore organizzazione e negli inviti."
        />
        <CardBody className="flex flex-col gap-5">
          <ImageUpload
            bucket="org-logos"
            pathPrefix={organization.id}
            currentUrl={logo}
            label="Carica logo"
            preview={<OrgMark name={organization.name} logoUrl={logo} size="lg" />}
            onUploaded={async (publicUrl) => {
              const result = await updateOrganizationLogo(publicUrl)
              if (!result.ok) throw new Error(result.error)
              setLogo(publicUrl)
              router.refresh()
            }}
            onRemoved={async () => {
              const result = await updateOrganizationLogo(null)
              if (!result.ok) {
                notify.error(result.error)
                return
              }
              setLogo(null)
              router.refresh()
            }}
          />

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {formError ? <FormAlert>{formError}</FormAlert> : null}

            <Field
              label="Nome"
              htmlFor="org-name"
              error={form.formState.errors.name?.message}
              required
            >
              <Input
                id="org-name"
                invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>

            <Field
              label="Identificativo"
              htmlFor="org-slug"
              description="Solo minuscole, numeri e trattini. Cambiandolo cambiano i riferimenti futuri."
              error={form.formState.errors.slug?.message}
              required
            >
              <Input
                id="org-slug"
                invalid={Boolean(form.formState.errors.slug)}
                {...form.register('slug')}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={form.formState.isSubmitting}
              disabled={!form.formState.isDirty}
              className="self-start"
            >
              Salva modifiche
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Informazioni" />
        <CardBody>
          <dl className="flex flex-col">
            <DetailRow label="Creata il">{formatDate(organization.created_at)}</DetailRow>
            <DetailRow label="Identificativo">
              <code className="rounded-xs bg-surface-sunken px-1 font-mono text-caption">
                {organization.slug}
              </code>
            </DetailRow>
            <DetailRow label="Il tuo ruolo">
              {isOwner ? 'Proprietario' : 'Amministratore'}
            </DetailRow>
          </dl>
          {isOwner ? (
            <p className="mt-4 rounded-md border border-line-subtle bg-surface-muted px-3 py-2 text-meta text-fg-muted">
              L&apos;eliminazione dell&apos;organizzazione non è esposta
              nell&apos;interfaccia: cancellerebbe clienti, ticket, calendario e ore in modo
              irreversibile. Va eseguita dal pannello Supabase, con un backup verificato.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  )
}
