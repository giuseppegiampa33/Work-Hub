'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { TICKET_PRIORITY_DESCRIPTORS, TICKET_STATUS_DESCRIPTORS } from '@/config/tickets'
import {
  memberLabel,
  useActivityTypes,
  useCategories,
  useClientOptions,
  useMemberOptions,
} from '@/features/lookups/queries'
import { queryKeys } from '@/lib/query/keys'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DateInput } from '@/components/ui/date-input'
import { DialogClose, DialogContent, Modal } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { FormAlert } from '@/components/app/auth-form'
import { useSession } from '@/components/app/session-provider'
import { notify } from '@/components/ui/toast'
import { createTicket, updateTicket } from '../actions'
import { ticketFormSchema, type TicketFormValues } from '../schemas'
import { priorityOptions, statusOptions } from './pickers'
import type { TicketDetail } from '../queries'

/**
 * Create / edit ticket.
 *
 * One form for both paths: `ticket` present means edit, absent means create.
 * Lookup lists come from the shared reference queries, so opening this dialog
 * costs no new requests after the first time in a session.
 */
export function TicketFormDialog({
  open,
  onOpenChange,
  ticket,
  defaultClientId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket?: TicketDetail | null
  defaultClientId?: string | null
  onCreated?: (ticketId: string) => void
}) {
  const { organizationId, userId, can } = useSession()
  const queryClient = useQueryClient()
  const [formError, setFormError] = React.useState<string | null>(null)

  const clients = useClientOptions(organizationId, open)
  const members = useMemberOptions(organizationId, open)
  const categories = useCategories(organizationId)

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      clientId: defaultClientId ?? null,
      assigneeId: null,
      categoryId: null,
      activityTypeId: null,
      status: 'new',
      priority: 'normal',
      dueDate: null,
    },
  })

  const categoryId = form.watch('categoryId')
  const activityTypes = useActivityTypes(organizationId, categoryId ?? null)

  // Reset whenever the dialog opens so a reopened form never shows stale input.
  React.useEffect(() => {
    if (!open) return
    setFormError(null)
    form.reset(
      ticket
        ? {
            title: ticket.title,
            description: ticket.description ?? '',
            clientId: ticket.client_id,
            assigneeId: ticket.assignee_id,
            categoryId: ticket.category_id,
            activityTypeId: ticket.activity_type_id,
            status: ticket.status,
            priority: ticket.priority,
            dueDate: ticket.due_date,
          }
        : {
            title: '',
            description: '',
            clientId: defaultClientId ?? null,
            assigneeId: can('tickets:assign') ? null : userId,
            categoryId: null,
            activityTypeId: null,
            status: 'new',
            priority: 'normal',
            dueDate: null,
          },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on open/ticket only
  }, [open, ticket?.id])

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)

    const result = ticket
      ? await updateTicket({ id: ticket.id, ...values })
      : await createTicket(values)

    if (!result.ok) {
      const field = result.field as keyof TicketFormValues | undefined
      if (field && field in form.getValues()) {
        form.setError(field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(organizationId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) })

    if (ticket) {
      notify.success('Ticket aggiornato')
    } else {
      const created = result.data as { id: string; reference: number }
      notify.success(`Ticket #${created.reference} creato`)
      onCreated?.(created.id)
    }
    onOpenChange(false)
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        title={ticket ? `Modifica ticket #${ticket.reference}` : 'Nuovo ticket'}
        description={
          ticket
            ? 'Le modifiche vengono registrate nella cronologia del ticket.'
            : 'Il numero viene assegnato automaticamente alla creazione.'
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
              {ticket ? 'Salva modifiche' : 'Crea ticket'}
            </Button>
          </>
        }
      >
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4"
          noValidate
          id="ticket-form"
        >
          {formError ? <FormAlert>{formError}</FormAlert> : null}

          <Field
            label="Titolo"
            htmlFor="ticket-title"
            error={form.formState.errors.title?.message}
            required
          >
            <Input
              id="ticket-title"
              autoFocus
              placeholder="Es. Aggiornamento flusso mensile fatture"
              invalid={Boolean(form.formState.errors.title)}
              {...form.register('title')}
            />
          </Field>

          <Field
            label="Descrizione"
            htmlFor="ticket-description"
            optional
            description="Contesto, passaggi fatti, riferimenti. Resta visibile a chi lavora il ticket."
            error={form.formState.errors.description?.message}
          >
            <Textarea
              id="ticket-description"
              rows={4}
              placeholder="Cosa è stato richiesto e con quali vincoli…"
              {...form.register('description')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente" htmlFor="ticket-client" optional>
              <Combobox
                id="ticket-client"
                value={form.watch('clientId')}
                onChange={(value) => form.setValue('clientId', value, { shouldDirty: true })}
                options={(clients.data ?? []).map((client) => ({
                  value: client.id,
                  label: client.name,
                  hint: client.code ?? undefined,
                }))}
                loading={clients.isPending}
                placeholder="Nessun cliente"
                searchPlaceholder="Cerca cliente…"
                emptyMessage="Nessun cliente. Creane uno dalla sezione Clienti."
                clearable
              />
            </Field>

            <Field label="Assegnato a" htmlFor="ticket-assignee" optional>
              <Combobox
                id="ticket-assignee"
                value={form.watch('assigneeId')}
                onChange={(value) => form.setValue('assigneeId', value, { shouldDirty: true })}
                disabled={!can('tickets:assign') && !ticket}
                options={(members.data ?? []).map((member) => ({
                  value: member.userId,
                  label: memberLabel(member),
                  leading: (
                    <Avatar
                      id={member.userId}
                      name={member.fullName}
                      email={member.email}
                      src={member.avatarUrl}
                      size="xs"
                    />
                  ),
                }))}
                loading={members.isPending}
                placeholder="Non assegnato"
                searchPlaceholder="Cerca persona…"
                clearable
              />
            </Field>

            <Field label="Stato" htmlFor="ticket-status">
              <SimpleSelect
                id="ticket-status"
                value={form.watch('status')}
                onValueChange={(value) =>
                  form.setValue('status', (value ?? 'new') as TicketFormValues['status'], {
                    shouldDirty: true,
                  })
                }
                options={statusOptions.map((option) => ({
                  ...option,
                  hint: TICKET_STATUS_DESCRIPTORS[option.value].open ? undefined : 'chiuso',
                }))}
              />
            </Field>

            <Field label="Priorità" htmlFor="ticket-priority">
              <SimpleSelect
                id="ticket-priority"
                value={form.watch('priority')}
                onValueChange={(value) =>
                  form.setValue('priority', (value ?? 'normal') as TicketFormValues['priority'], {
                    shouldDirty: true,
                  })
                }
                options={priorityOptions.map((option) => ({
                  ...option,
                  hint:
                    TICKET_PRIORITY_DESCRIPTORS[option.value].marks === 4 ? 'urgente' : undefined,
                }))}
              />
            </Field>

            <Field label="Categoria" htmlFor="ticket-category" optional>
              <Combobox
                id="ticket-category"
                value={categoryId ?? null}
                onChange={(value) => {
                  form.setValue('categoryId', value, { shouldDirty: true })
                  form.setValue('activityTypeId', null, { shouldDirty: true })
                }}
                options={(categories.data ?? []).map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                loading={categories.isPending}
                placeholder="Nessuna categoria"
                emptyMessage="Nessuna categoria. Creane una in Impostazioni → Categorie."
                clearable
              />
            </Field>

            <Field label="Tipo di attività" htmlFor="ticket-activity" optional>
              <Combobox
                id="ticket-activity"
                value={form.watch('activityTypeId')}
                onChange={(value) => form.setValue('activityTypeId', value, { shouldDirty: true })}
                disabled={!categoryId}
                options={(activityTypes.data ?? []).map((type) => ({
                  value: type.id,
                  label: type.name,
                  hint: `${type.default_duration_minutes}m`,
                }))}
                loading={activityTypes.isPending}
                placeholder={categoryId ? 'Nessun tipo' : 'Scegli prima una categoria'}
                emptyMessage="Nessun tipo di attività per questa categoria."
                clearable
              />
            </Field>

            <Field
              label="Scadenza"
              htmlFor="ticket-due"
              optional
              error={form.formState.errors.dueDate?.message}
            >
              <DateInput
                id="ticket-due"
                value={form.watch('dueDate') ?? ''}
                onChange={(event) =>
                  form.setValue('dueDate', event.target.value || null, { shouldDirty: true })
                }
              />
            </Field>
          </div>
        </form>
      </DialogContent>
    </Modal>
  )
}
