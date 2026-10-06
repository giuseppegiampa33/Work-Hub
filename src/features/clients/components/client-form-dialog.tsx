'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { queryKeys } from '@/lib/query/keys'
import { Button } from '@/components/ui/button'
import { DialogClose, DialogContent, Modal } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { FormAlert } from '@/components/app/auth-form'
import { useSession } from '@/components/app/session-provider'
import { notify } from '@/components/ui/toast'
import { createClient, updateClient } from '../actions'
import { clientFormSchema, type ClientFormValues } from '../schemas'
import type { ClientRow } from '@/types/database'

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: ClientRow | null
  onCreated?: (clientId: string) => void
}) {
  const { organizationId } = useSession()
  const queryClient = useQueryClient()
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: { name: '', code: '', email: '', phone: '', address: '', notes: '' },
  })

  React.useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset({
      name: client?.name ?? '',
      code: client?.code ?? '',
      email: client?.email ?? '',
      phone: client?.phone ?? '',
      address: client?.address ?? '',
      notes: client?.notes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when opening
  }, [open, client?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = client
      ? await updateClient(client.id, values)
      : await createClient(values)

    if (!result.ok) {
      const field = result.field as keyof ClientFormValues | undefined
      if (field && field in form.getValues()) {
        form.setError(field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) }),
    ])

    if (client) {
      notify.success('Cliente aggiornato')
    } else {
      notify.success('Cliente creato', values.name)
      onCreated?.((result.data as { id: string }).id)
    }
    onOpenChange(false)
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        title={client ? 'Modifica cliente' : 'Nuovo cliente'}
        description={
          client
            ? undefined
            : 'Il nome è l’unico campo obbligatorio: il resto può essere completato più tardi.'
        }
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary" size="md">
                Annulla
              </Button>
            </DialogClose>
            <Button
              variant="primary"
              size="md"
              loading={form.formState.isSubmitting}
              onClick={() => void onSubmit()}
            >
              {client ? 'Salva modifiche' : 'Crea cliente'}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError ? <FormAlert>{formError}</FormAlert> : null}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <Field
              label="Nome o ragione sociale"
              htmlFor="client-name"
              error={form.formState.errors.name?.message}
              required
            >
              <Input
                id="client-name"
                autoFocus
                placeholder="Rossi Costruzioni S.r.l."
                invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
            </Field>

            <Field
              label="Codice"
              htmlFor="client-code"
              optional
              error={form.formState.errors.code?.message}
            >
              <Input id="client-code" placeholder="ROS01" {...form.register('code')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              htmlFor="client-email"
              optional
              error={form.formState.errors.email?.message}
            >
              <Input
                id="client-email"
                type="email"
                inputMode="email"
                placeholder="info@cliente.it"
                invalid={Boolean(form.formState.errors.email)}
                {...form.register('email')}
              />
            </Field>

            <Field
              label="Telefono"
              htmlFor="client-phone"
              optional
              error={form.formState.errors.phone?.message}
            >
              <Input
                id="client-phone"
                type="tel"
                inputMode="tel"
                placeholder="+39 02 1234567"
                {...form.register('phone')}
              />
            </Field>
          </div>

          <Field
            label="Indirizzo"
            htmlFor="client-address"
            optional
            error={form.formState.errors.address?.message}
          >
            <Input
              id="client-address"
              placeholder="Via Roma 1, 20121 Milano"
              {...form.register('address')}
            />
          </Field>

          <Field
            label="Note"
            htmlFor="client-notes"
            optional
            description="Riferimenti interni, condizioni, contatti utili."
            error={form.formState.errors.notes?.message}
          >
            <Textarea id="client-notes" rows={3} {...form.register('notes')} />
          </Field>
        </form>
      </DialogContent>
    </Modal>
  )
}
