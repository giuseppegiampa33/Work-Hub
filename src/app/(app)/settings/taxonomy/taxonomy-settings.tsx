'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createActivityType,
  createCategory,
  deleteCategory,
  setActivityTypeArchived,
  setCategoryArchived,
  updateActivityType,
  updateCategory,
} from '@/features/taxonomy/actions'
import { useActivityTypes, useCategories } from '@/features/lookups/queries'
import { formatDuration } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/select'
import { SwitchField } from '@/components/ui/checkbox'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { useSession } from '@/components/app/session-provider'
import { notify } from '@/components/ui/toast'
import type { ActivityTypeRow, CategoryRow, SemanticTone } from '@/types/database'

const TONE_OPTIONS: { value: SemanticTone; label: string }[] = [
  { value: 'brand', label: 'Verde petrolio' },
  { value: 'info', label: 'Blu inchiostro' },
  { value: 'success', label: 'Verde' },
  { value: 'warning', label: 'Ambra' },
  { value: 'danger', label: 'Rosso mattone' },
  { value: 'neutral', label: 'Neutro' },
]

/**
 * Categories and activity types.
 *
 * The tenant starts empty on purpose — a work taxonomy is specific to the
 * company, and pre-seeded examples would be the first thing anyone deletes.
 * Colours are chosen from the semantic palette, not a colour picker, so the
 * calendar and the reports stay inside the design system.
 */
export function TaxonomySettings() {
  const { organizationId } = useSession()
  const queryClient = useQueryClient()
  const [showArchived, setShowArchived] = React.useState(false)
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string | null>(null)
  const [categoryToDelete, setCategoryToDelete] = React.useState<CategoryRow | null>(null)

  const categories = useCategories(organizationId, showArchived)
  const activityTypes = useActivityTypes(organizationId, selectedCategoryId, showArchived)

  const activeCategories = React.useMemo(() => categories.data ?? [], [categories.data])
  const selectedCategory =
    activeCategories.find((category) => category.id === selectedCategoryId) ??
    activeCategories[0] ??
    null

  React.useEffect(() => {
    if (!selectedCategoryId && activeCategories.length > 0) {
      setSelectedCategoryId(activeCategories[0].id)
    }
  }, [activeCategories, selectedCategoryId])

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.taxonomy.all(organizationId) })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Categorie di lavoro"
          description="Raggruppano le attività: compaiono su ticket, calendario, ore e report."
          action={
            <SwitchField
              id="show-archived"
              label="Mostra archiviate"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
          }
        />
        <CardBody className="flex flex-col gap-4">
          <CategoryForm onDone={refresh} />

          {categories.isError ? (
            <ErrorState compact onRetry={() => void categories.refetch()} />
          ) : categories.isPending ? (
            <Skeleton className="h-12 w-full" />
          ) : activeCategories.length === 0 ? (
            <EmptyState
              compact
              icon={Layers}
              title="Nessuna categoria"
              description="Crea la prima categoria, per esempio “Sviluppo software” o “Assistenza clienti”."
            />
          ) : (
            <ul className="divide-y divide-line-subtle rounded-md border border-line">
              {activeCategories.map((category) => (
                <CategoryRowItem
                  key={category.id}
                  category={category}
                  selected={selectedCategory?.id === category.id}
                  onSelect={() => setSelectedCategoryId(category.id)}
                  onArchive={async () => {
                    const result = await setCategoryArchived(category.id, !category.is_archived)
                    if (!result.ok) {
                      notify.error(result.error)
                      return
                    }
                    await refresh()
                    notify.success(
                      category.is_archived ? 'Categoria riattivata' : 'Categoria archiviata',
                    )
                  }}
                  onDelete={() => setCategoryToDelete(category)}
                  onDone={refresh}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Tipi di attività"
          description={
            selectedCategory
              ? `Attività della categoria “${selectedCategory.name}”, con durata suggerita.`
              : 'Seleziona una categoria per gestirne le attività.'
          }
        />
        <CardBody className="flex flex-col gap-4">
          {selectedCategory ? (
            <>
              <ActivityTypeForm categoryId={selectedCategory.id} onDone={refresh} />

              {activityTypes.isPending ? (
                <Skeleton className="h-12 w-full" />
              ) : (activityTypes.data ?? []).length === 0 ? (
                <EmptyState
                  compact
                  title="Nessun tipo di attività"
                  description="Esempi: “Flusso giornaliero”, “Flusso mensile”, “Manutenzione PC cliente”."
                />
              ) : (
                <ul className="divide-y divide-line-subtle rounded-md border border-line">
                  {(activityTypes.data ?? []).map((type) => (
                    <ActivityTypeRowItem
                      key={type.id}
                      activityType={type}
                      categories={activeCategories}
                      onArchive={async () => {
                        const result = await setActivityTypeArchived(type.id, !type.is_archived)
                        if (!result.ok) {
                          notify.error(result.error)
                          return
                        }
                        await refresh()
                      }}
                      onDone={refresh}
                    />
                  ))}
                </ul>
              )}
            </>
          ) : (
            <EmptyState compact title="Nessuna categoria" description="Creane una qui sopra." />
          )}
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        onOpenChange={(open) => (open ? undefined : setCategoryToDelete(null))}
        title="Eliminare la categoria?"
        description="Se è già stata usata da ticket o ore registrate, l'eliminazione viene rifiutata: in quel caso archiviala."
        confirmLabel="Elimina categoria"
        onConfirm={async () => {
          if (!categoryToDelete) return
          const result = await deleteCategory(categoryToDelete.id)
          setCategoryToDelete(null)
          if (!result.ok) {
            notify.error(result.error)
            return
          }
          await refresh()
          notify.success('Categoria eliminata')
        }}
      />
    </div>
  )
}

function CategoryForm({ onDone }: { onDone: () => Promise<unknown> }) {
  const [name, setName] = React.useState('')
  const [tone, setTone] = React.useState<SemanticTone>('brand')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault()
    setError(null)
    setPending(true)
    const result = await createCategory({ name, tone })
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setName('')
    await onDone()
    notify.success('Categoria creata')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end">
      <Field label="Nome categoria" htmlFor="category-name" error={error ?? undefined}>
        <Input
          id="category-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sviluppo / modifica software"
          invalid={Boolean(error)}
        />
      </Field>
      <Field label="Colore" htmlFor="category-tone">
        <SimpleSelect
          id="category-tone"
          value={tone}
          onValueChange={(value) => setTone((value ?? 'brand') as SemanticTone)}
          options={TONE_OPTIONS}
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        size="md"
        icon={<Plus />}
        loading={pending}
        disabled={name.trim().length === 0}
      >
        Aggiungi
      </Button>
    </form>
  )
}

function CategoryRowItem({
  category,
  selected,
  onSelect,
  onArchive,
  onDelete,
  onDone,
}: {
  category: CategoryRow
  selected: boolean
  onSelect: () => void
  onArchive: () => Promise<void>
  onDelete: () => void
  onDone: () => Promise<unknown>
}) {
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(category.name)
  const [tone, setTone] = React.useState<SemanticTone>(category.tone)

  const save = async () => {
    const result = await updateCategory(category.id, { name, tone })
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    setEditing(false)
    await onDone()
    notify.success('Categoria aggiornata')
  }

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-2 px-3 py-2 transition-colors duration-fast',
        selected && 'bg-surface-selected',
      )}
    >
      {editing ? (
        <>
          <Input
            inputSize="sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="max-w-[240px]"
            aria-label="Nome categoria"
          />
          <div className="w-[160px]">
            <SimpleSelect
              inputSize="sm"
              value={tone}
              onValueChange={(value) => setTone((value ?? 'brand') as SemanticTone)}
              options={TONE_OPTIONS}
              aria-describedby={undefined}
            />
          </div>
          <Button variant="primary" size="sm" onClick={() => void save()}>
            Salva
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={onSelect}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left outline-none focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]"
          >
            <Badge tone={category.tone} size="sm" dot>
              {category.name}
            </Badge>
            {category.is_archived ? (
              <span className="text-caption text-fg-muted">archiviata</span>
            ) : null}
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label={`Modifica ${category.name}`}
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden />
            </IconButton>
            <IconButton
              label={category.is_archived ? 'Riattiva categoria' : 'Archivia categoria'}
              size="sm"
              onClick={() => void onArchive()}
            >
              {category.is_archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
            </IconButton>
            <IconButton
              label={`Elimina ${category.name}`}
              size="sm"
              variant="destructive"
              onClick={onDelete}
            >
              <Trash2 aria-hidden />
            </IconButton>
          </div>
        </>
      )}
    </li>
  )
}

function ActivityTypeForm({
  categoryId,
  onDone,
}: {
  categoryId: string
  onDone: () => Promise<unknown>
}) {
  const [name, setName] = React.useState('')
  const [duration, setDuration] = React.useState(60)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const submit = async (formEvent: React.FormEvent) => {
    formEvent.preventDefault()
    setError(null)
    setPending(true)
    const result = await createActivityType({
      categoryId,
      name,
      defaultDurationMinutes: duration,
    })
    setPending(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    setName('')
    await onDone()
    notify.success('Tipo di attività creato')
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-end">
      <Field label="Nome attività" htmlFor="activity-name" error={error ?? undefined}>
        <Input
          id="activity-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Flusso giornaliero"
          invalid={Boolean(error)}
        />
      </Field>
      <Field label="Durata (minuti)" htmlFor="activity-duration">
        <Input
          id="activity-duration"
          type="number"
          min={5}
          max={1440}
          step={5}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
        />
      </Field>
      <Button
        type="submit"
        variant="primary"
        size="md"
        icon={<Plus />}
        loading={pending}
        disabled={name.trim().length === 0}
      >
        Aggiungi
      </Button>
    </form>
  )
}

function ActivityTypeRowItem({
  activityType,
  categories,
  onArchive,
  onDone,
}: {
  activityType: ActivityTypeRow
  categories: CategoryRow[]
  onArchive: () => Promise<void>
  onDone: () => Promise<unknown>
}) {
  const [editing, setEditing] = React.useState(false)
  const [name, setName] = React.useState(activityType.name)
  const [duration, setDuration] = React.useState(activityType.default_duration_minutes)
  const [categoryId, setCategoryId] = React.useState(activityType.category_id)

  const save = async () => {
    const result = await updateActivityType(activityType.id, {
      categoryId,
      name,
      defaultDurationMinutes: duration,
    })
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    setEditing(false)
    await onDone()
    notify.success('Attività aggiornata')
  }

  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2">
      {editing ? (
        <>
          <Input
            inputSize="sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="max-w-[220px]"
            aria-label="Nome attività"
          />
          <Input
            inputSize="sm"
            type="number"
            min={5}
            max={1440}
            step={5}
            value={duration}
            onChange={(event) => setDuration(Number(event.target.value))}
            className="w-24"
            aria-label="Durata in minuti"
          />
          <div className="w-[200px]">
            <SimpleSelect
              inputSize="sm"
              value={categoryId}
              onValueChange={(value) => setCategoryId(value ?? categoryId)}
              options={categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </div>
          <Button variant="primary" size="sm" onClick={() => void save()}>
            Salva
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Annulla
          </Button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-body-sm text-fg">
            {activityType.name}
            {activityType.is_archived ? (
              <span className="ml-2 text-caption text-fg-muted">archiviato</span>
            ) : null}
          </span>
          <span className="shrink-0 text-meta text-fg-muted" data-numeric>
            {formatDuration(activityType.default_duration_minutes)}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton
              label={`Modifica ${activityType.name}`}
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil aria-hidden />
            </IconButton>
            <IconButton
              label={activityType.is_archived ? 'Riattiva attività' : 'Archivia attività'}
              size="sm"
              onClick={() => void onArchive()}
            >
              {activityType.is_archived ? (
                <ArchiveRestore aria-hidden />
              ) : (
                <Archive aria-hidden />
              )}
            </IconButton>
          </div>
        </>
      )}
    </li>
  )
}
