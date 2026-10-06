'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Trash2 } from 'lucide-react'
import { memberLabel, useActivityTypes, useCategories, useClientOptions, useMemberOptions } from '@/features/lookups/queries'
import { completeCalendarEvent } from '@/features/time/actions'
import { useTicketList } from '@/features/tickets/queries'
import { formatDuration, timeToMinutes, toISODate } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DateInput, TimeRangeInput } from '@/components/ui/date-input'
import { ConfirmDialog, DialogClose, DialogContent, Modal } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { FormAlert } from '@/components/app/auth-form'
import { useSession } from '@/components/app/session-provider'
import { notify } from '@/components/ui/toast'
import { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent } from '../actions'
import { calendarEventSchema, type CalendarEventFormValues } from '../schemas'
import type { CalendarEventItem } from '../queries'

export type EventDraft = {
  date: string
  startTime: string
  endTime: string
  ticketId?: string | null
  clientId?: string | null
}

/**
 * Create / edit a planned activity, and convert it into logged hours.
 *
 * “Consuntiva” is the one action that crosses features: it creates a time entry
 * from the event through a single RPC, so the two records cannot disagree about
 * client, ticket or taxonomy.
 */
export function CalendarEventDialog({
  open,
  onOpenChange,
  event,
  draft,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: CalendarEventItem | null
  draft?: EventDraft | null
}) {
  const { organizationId, userId, can } = useSession()
  const queryClient = useQueryClient()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [completing, setCompleting] = React.useState(false)

  const clients = useClientOptions(organizationId, open)
  const members = useMemberOptions(organizationId, open)
  const categories = useCategories(organizationId)
  const tickets = useTicketList(organizationId, { page: 1, sort: 'updated' })

  const form = useForm<CalendarEventFormValues>({
    resolver: zodResolver(calendarEventSchema),
    defaultValues: {
      title: '',
      description: '',
      ownerId: userId,
      date: toISODate(new Date()),
      startTime: '09:00',
      endTime: '10:00',
      ticketId: null,
      clientId: null,
      categoryId: null,
      activityTypeId: null,
      isPlanned: true,
    },
  })

  const categoryId = form.watch('categoryId')
  const activityTypes = useActivityTypes(organizationId, categoryId ?? null)

  React.useEffect(() => {
    if (!open) return
    setFormError(null)

    if (event) {
      const start = new Date(event.starts_at)
      const end = new Date(event.ends_at)
      form.reset({
        title: event.title,
        description: event.description ?? '',
        ownerId: event.owner_id,
        date: toISODate(start),
        startTime: start.toTimeString().slice(0, 5),
        endTime: end.toTimeString().slice(0, 5),
        ticketId: event.ticket_id,
        clientId: event.client_id,
        categoryId: event.category_id,
        activityTypeId: event.activity_type_id,
        isPlanned: event.is_planned,
      })
      return
    }

    form.reset({
      title: '',
      description: '',
      ownerId: userId,
      date: draft?.date ?? toISODate(new Date()),
      startTime: draft?.startTime ?? '09:00',
      endTime: draft?.endTime ?? '10:00',
      ticketId: draft?.ticketId ?? null,
      clientId: draft?.clientId ?? null,
      categoryId: null,
      activityTypeId: null,
      isPlanned: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open / target change
  }, [open, event?.id, draft?.date, draft?.startTime])

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) }),
    ])
  }

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = event
      ? await updateCalendarEvent(event.id, values)
      : await createCalendarEvent(values)

    if (!result.ok) {
      const field = result.field as keyof CalendarEventFormValues | undefined
      if (field && field in form.getValues()) {
        form.setError(field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    await invalidate()
    if (event?.ticket_id || values.ticketId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.all(organizationId),
      })
    }
    notify.success(event ? 'Attività aggiornata' : 'Attività pianificata')
    onOpenChange(false)
  })

  const onComplete = async () => {
    if (!event) return
    setCompleting(true)
    const duration = Math.round(
      (new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000,
    )
    const result = await completeCalendarEvent({
      eventId: event.id,
      durationMinutes: duration,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
    setCompleting(false)

    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await Promise.all([
      invalidate(),
      queryClient.invalidateQueries({ queryKey: queryKeys.time.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all(organizationId) }),
    ])
    notify.success('Ore consuntivate', formatDuration(duration))
    onOpenChange(false)
  }

  const onDelete = async () => {
    if (!event) return
    const result = await deleteCalendarEvent(event.id)
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await invalidate()
    setConfirmDelete(false)
    onOpenChange(false)
    notify.success('Attività rimossa')
  }

  const startTime = form.watch('startTime')
  const endTime = form.watch('endTime')
  const duration = Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="md"
          title={event ? 'Attività pianificata' : 'Pianifica attività'}
          description={
            event?.is_completed
              ? 'Questa attività è già stata consuntivata.'
              : 'Le attività pianificate possono essere trasformate in ore lavorate.'
          }
          footer={
            <>
              {event && can('calendar:plan') ? (
                <Button
                  variant="destructive-outline"
                  size="md"
                  icon={<Trash2 />}
                  onClick={() => setConfirmDelete(true)}
                  className="sm:mr-auto"
                >
                  Elimina
                </Button>
              ) : null}
              <DialogClose asChild>
                <Button variant="secondary" size="md">
                  Chiudi
                </Button>
              </DialogClose>
              {event && !event.is_completed && event.owner_id === userId && can('time:log') ? (
                <Button
                  variant="subtle"
                  size="md"
                  icon={<CheckCircle2 />}
                  loading={completing}
                  onClick={() => void onComplete()}
                >
                  Consuntiva {formatDuration(duration)}
                </Button>
              ) : null}
              {can('calendar:plan') ? (
                <Button
                  variant="primary"
                  size="md"
                  loading={form.formState.isSubmitting}
                  onClick={() => void onSubmit()}
                >
                  {event ? 'Salva' : 'Pianifica'}
                </Button>
              ) : null}
            </>
          }
        >
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {formError ? <FormAlert>{formError}</FormAlert> : null}

            <Field
              label="Titolo"
              htmlFor="event-title"
              error={form.formState.errors.title?.message}
              required
            >
              <Input
                id="event-title"
                autoFocus
                placeholder="Es. Manutenzione PC cliente"
                invalid={Boolean(form.formState.errors.title)}
                {...form.register('title')}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Data"
                htmlFor="event-date"
                error={form.formState.errors.date?.message}
                required
              >
                <DateInput
                  id="event-date"
                  value={form.watch('date')}
                  onChange={(changeEvent) => form.setValue('date', changeEvent.target.value)}
                  invalid={Boolean(form.formState.errors.date)}
                />
              </Field>

              <Field
                label="Orario"
                htmlFor="event-range-start"
                error={form.formState.errors.endTime?.message}
                required
              >
                <TimeRangeInput
                  idPrefix="event-range"
                  start={startTime}
                  end={endTime}
                  invalid={Boolean(form.formState.errors.endTime)}
                  onChange={(next) => {
                    form.setValue('startTime', next.start)
                    form.setValue('endTime', next.end)
                  }}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Persona" htmlFor="event-owner" required>
                <Combobox
                  id="event-owner"
                  value={form.watch('ownerId')}
                  onChange={(value) => form.setValue('ownerId', value ?? userId)}
                  disabled={!can('calendar:plan_others')}
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
                  placeholder="Seleziona persona"
                />
              </Field>

              <Field label="Cliente" htmlFor="event-client" optional>
                <Combobox
                  id="event-client"
                  value={form.watch('clientId')}
                  onChange={(value) => form.setValue('clientId', value)}
                  options={(clients.data ?? []).map((client) => ({
                    value: client.id,
                    label: client.name,
                  }))}
                  loading={clients.isPending}
                  placeholder="Nessun cliente"
                  searchPlaceholder="Cerca cliente…"
                  clearable
                />
              </Field>

              <Field label="Ticket" htmlFor="event-ticket" optional>
                <Combobox
                  id="event-ticket"
                  value={form.watch('ticketId')}
                  onChange={(value) => {
                    form.setValue('ticketId', value)
                    const ticket = tickets.data?.rows.find((row) => row.id === value)
                    if (ticket?.client_id) form.setValue('clientId', ticket.client_id)
                    if (ticket && !form.getValues('title')) form.setValue('title', ticket.title)
                  }}
                  options={(tickets.data?.rows ?? []).map((ticket) => ({
                    value: ticket.id,
                    label: ticket.title,
                    hint: `#${ticket.reference}`,
                  }))}
                  loading={tickets.isPending}
                  placeholder="Nessun ticket"
                  searchPlaceholder="Cerca ticket…"
                  clearable
                />
              </Field>

              <Field label="Categoria" htmlFor="event-category" optional>
                <Combobox
                  id="event-category"
                  value={categoryId ?? null}
                  onChange={(value) => {
                    form.setValue('categoryId', value)
                    form.setValue('activityTypeId', null)
                  }}
                  options={(categories.data ?? []).map((category) => ({
                    value: category.id,
                    label: category.name,
                  }))}
                  loading={categories.isPending}
                  placeholder="Nessuna categoria"
                  emptyMessage="Nessuna categoria configurata."
                  clearable
                />
              </Field>

              <Field
                label="Tipo di attività"
                htmlFor="event-activity"
                optional
                className="sm:col-span-2"
              >
                <Combobox
                  id="event-activity"
                  value={form.watch('activityTypeId')}
                  onChange={(value) => {
                    form.setValue('activityTypeId', value)
                    const type = (activityTypes.data ?? []).find((item) => item.id === value)
                    if (type) {
                      const minutes = timeToMinutes(form.getValues('startTime'))
                      const end = minutes + type.default_duration_minutes
                      form.setValue(
                        'endTime',
                        `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
                      )
                    }
                  }}
                  disabled={!categoryId}
                  options={(activityTypes.data ?? []).map((type) => ({
                    value: type.id,
                    label: type.name,
                    hint: formatDuration(type.default_duration_minutes),
                  }))}
                  loading={activityTypes.isPending}
                  placeholder={categoryId ? 'Nessun tipo' : 'Scegli prima una categoria'}
                  clearable
                />
              </Field>
            </div>

            <Field label="Note" htmlFor="event-description" optional>
              <Textarea id="event-description" rows={3} {...form.register('description')} />
            </Field>
          </form>
        </DialogContent>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminare l'attività pianificata?"
        description="Le ore eventualmente già consuntivate restano registrate."
        confirmLabel="Elimina attività"
        onConfirm={() => void onDelete()}
      />
    </>
  )
}
