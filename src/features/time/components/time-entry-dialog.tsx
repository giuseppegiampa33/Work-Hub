'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useActivityTypes,
  useCategories,
  useClientOptions,
} from '@/features/lookups/queries'
import { formatDuration, timeToMinutes, toISODate } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { DateInput, TimeRangeInput } from '@/components/ui/date-input'
import { DialogClose, DialogContent, Modal } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { SwitchField } from '@/components/ui/checkbox'
import { SegmentedControl } from '@/components/ui/tabs'
import { FormAlert } from '@/components/app/auth-form'
import { useSession } from '@/components/app/session-provider'
import { notify } from '@/components/ui/toast'
import { logTime } from '../actions'
import { timeEntrySchema, type TimeEntryFormValues } from '../schemas'

type Mode = 'range' | 'duration'

export type TimeEntryPrefill = {
  entryDate?: string
  clientId?: string | null
  ticketId?: string | null
  categoryId?: string | null
  activityTypeId?: string | null
  calendarEventId?: string | null
  startTime?: string
  endTime?: string
  durationMinutes?: number
  description?: string
  /** Shown as read-only context when logging against a ticket. */
  ticketLabel?: string
}

/**
 * Quick time log.
 *
 * Two ways to say the same thing: a start/end pair (what actually happened in
 * the day) or a plain duration (what you remember). The duration is always what
 * gets stored, so reports never have to reconcile the two.
 */
export function TimeEntryDialog({
  open,
  onOpenChange,
  prefill,
  onLogged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill?: TimeEntryPrefill
  onLogged?: () => void
}) {
  const { organizationId } = useSession()
  const queryClient = useQueryClient()
  const [mode, setMode] = React.useState<Mode>(prefill?.startTime ? 'range' : 'duration')
  const [formError, setFormError] = React.useState<string | null>(null)

  const clients = useClientOptions(organizationId, open)
  const categories = useCategories(organizationId)

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      entryDate: toISODate(new Date()),
      durationMinutes: 60,
      isBillable: true,
      description: '',
      clientId: null,
      ticketId: null,
      categoryId: null,
      activityTypeId: null,
      calendarEventId: null,
      startTime: null,
      endTime: null,
    },
  })

  const categoryId = form.watch('categoryId')
  const activityTypes = useActivityTypes(organizationId, categoryId ?? null)

  React.useEffect(() => {
    if (!open) return
    setFormError(null)
    setMode(prefill?.startTime ? 'range' : 'duration')
    form.reset({
      entryDate: prefill?.entryDate ?? toISODate(new Date()),
      clientId: prefill?.clientId ?? null,
      ticketId: prefill?.ticketId ?? null,
      categoryId: prefill?.categoryId ?? null,
      activityTypeId: prefill?.activityTypeId ?? null,
      calendarEventId: prefill?.calendarEventId ?? null,
      startTime: prefill?.startTime ?? null,
      endTime: prefill?.endTime ?? null,
      durationMinutes: prefill?.durationMinutes ?? 60,
      description: prefill?.description ?? '',
      isBillable: true,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens
  }, [open])

  // Picking an activity type suggests its default duration.
  const activityTypeId = form.watch('activityTypeId')
  React.useEffect(() => {
    if (!activityTypeId) return
    const type = (activityTypes.data ?? []).find((item) => item.id === activityTypeId)
    if (type && !form.formState.dirtyFields.durationMinutes) {
      form.setValue('durationMinutes', type.default_duration_minutes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- suggestion only
  }, [activityTypeId, activityTypes.data])

  const startTime = form.watch('startTime')
  const endTime = form.watch('endTime')

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)

    const payload: TimeEntryFormValues =
      mode === 'range' && values.startTime && values.endTime
        ? {
            ...values,
            durationMinutes: Math.max(
              1,
              timeToMinutes(values.endTime) - timeToMinutes(values.startTime),
            ),
          }
        : { ...values, startTime: null, endTime: null }

    const result = await logTime(payload)
    if (!result.ok) {
      const field = result.field as keyof TimeEntryFormValues | undefined
      if (field && field in form.getValues()) {
        form.setError(field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.time.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) }),
    ])
    if (payload.ticketId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.related(organizationId, payload.ticketId),
      })
    }

    notify.success('Ore registrate', formatDuration(payload.durationMinutes))
    onLogged?.()
    onOpenChange(false)
  })

  const computedDuration =
    mode === 'range' && startTime && endTime
      ? Math.max(0, timeToMinutes(endTime) - timeToMinutes(startTime))
      : (form.watch('durationMinutes') ?? 0)

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="md"
        title="Registra ore"
        description={
          prefill?.ticketLabel
            ? `Le ore verranno collegate a ${prefill.ticketLabel}.`
            : 'Le ore sono sempre registrate a tuo nome.'
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
              Registra {formatDuration(computedDuration)}
            </Button>
          </>
        }
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError ? <FormAlert>{formError}</FormAlert> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Data"
              htmlFor="time-date"
              error={form.formState.errors.entryDate?.message}
              required
            >
              <DateInput
                id="time-date"
                value={form.watch('entryDate')}
                invalid={Boolean(form.formState.errors.entryDate)}
                onChange={(event) => form.setValue('entryDate', event.target.value)}
              />
            </Field>

            <Field label="Modalità" htmlFor="time-mode">
              <SegmentedControl
                name="Modalità di inserimento"
                value={mode}
                onChange={(next) => {
                  setMode(next)
                  if (next === 'range' && !form.getValues('startTime')) {
                    form.setValue('startTime', '09:00')
                    form.setValue('endTime', '10:00')
                  }
                }}
                options={[
                  { value: 'duration', label: 'Durata' },
                  { value: 'range', label: 'Orario' },
                ]}
              />
            </Field>
          </div>

          {mode === 'range' ? (
            <Field
              label="Dalle / alle"
              htmlFor="time-range-start"
              error={form.formState.errors.endTime?.message}
            >
              <TimeRangeInput
                idPrefix="time-range"
                start={startTime ?? '09:00'}
                end={endTime ?? '10:00'}
                onChange={(next) => {
                  form.setValue('startTime', next.start)
                  form.setValue('endTime', next.end)
                }}
              />
            </Field>
          ) : (
            <Field
              label="Durata (minuti)"
              htmlFor="time-duration"
              description="Valori tipici: 15, 30, 60, 120."
              error={form.formState.errors.durationMinutes?.message}
              required
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="time-duration"
                  type="number"
                  min={1}
                  max={1440}
                  step={5}
                  className="w-28"
                  invalid={Boolean(form.formState.errors.durationMinutes)}
                  {...form.register('durationMinutes', { valueAsNumber: true })}
                />
                <div className="flex flex-wrap gap-1">
                  {[15, 30, 60, 120, 240, 480].map((minutes) => (
                    <Button
                      key={minutes}
                      variant="secondary"
                      size="xs"
                      onClick={() =>
                        form.setValue('durationMinutes', minutes, { shouldDirty: true })
                      }
                    >
                      {formatDuration(minutes)}
                    </Button>
                  ))}
                </div>
              </div>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente" htmlFor="time-client" optional>
              <Combobox
                id="time-client"
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

            <Field label="Categoria" htmlFor="time-category" optional>
              <Combobox
                id="time-category"
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

            <Field label="Tipo di attività" htmlFor="time-activity" optional className="sm:col-span-2">
              <Combobox
                id="time-activity"
                value={activityTypeId}
                onChange={(value) => form.setValue('activityTypeId', value)}
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

          <Field label="Note" htmlFor="time-description" optional>
            <Textarea
              id="time-description"
              rows={3}
              placeholder="Cosa è stato fatto…"
              {...form.register('description')}
            />
          </Field>

          <SwitchField
            id="time-billable"
            label="Ore fatturabili"
            description="Escludi le attività interne o in garanzia."
            checked={form.watch('isBillable')}
            onCheckedChange={(checked) => form.setValue('isBillable', checked)}
          />
        </form>
      </DialogContent>
    </Modal>
  )
}
