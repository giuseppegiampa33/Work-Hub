'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Search, X } from 'lucide-react'
import { PAGE_SIZE } from '@/config/app'
import { TICKET_PRIORITY_DESCRIPTORS, TICKET_STATUS_DESCRIPTORS } from '@/config/tickets'
import { memberLabel, useCategories, useClientOptions, useMemberOptions } from '@/features/lookups/queries'
import { deleteTicket, restoreTicket, updateTicket } from '@/features/tickets/actions'
import { TicketDrawer } from '@/features/tickets/components/ticket-drawer'
import { TicketFormDialog } from '@/features/tickets/components/ticket-form-dialog'
import { TicketTable } from '@/features/tickets/components/ticket-table'
import { priorityOptions, statusOptions } from '@/features/tickets/components/pickers'
import {
  useTicket,
  useTicketList,
  TICKET_SORTS,
  type TicketListResult,
  type TicketSortKey,
} from '@/features/tickets/queries'
import { queryKeys, type TicketListFilters } from '@/lib/query/keys'
import { useDebouncedValue, useIsHydrated, useUrlState } from '@/lib/use-url-state'
import { Page } from '@/components/app/app-shell'
import { useSession } from '@/components/app/session-provider'
import { Button, IconButton } from '@/components/ui/button'
import { Combobox, MultiSelect } from '@/components/ui/combobox'
import { FilterChip } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Pagination } from '@/components/ui/pagination'
import { SimpleSelect } from '@/components/ui/select'
import { TableToolbar } from '@/components/ui/table'
import { notify } from '@/components/ui/toast'

/**
 * Ticket workspace.
 *
 * Filters, pagination and the open drawer all live in the URL, so a view can be
 * shared with a colleague and the back button behaves. Status and priority
 * changes are optimistic: the row updates immediately and rolls back if the
 * server refuses.
 */
export function TicketsView() {
  const { organizationId, userId, can } = useSession()
  const queryClient = useQueryClient()
  const { searchParams, setParams, getList, getNumber } = useUrlState()
  // Gli overlay guidati dall'URL attendono l'idratazione: vedi useIsHydrated.
  const hydrated = useIsHydrated()

  const [searchInput, setSearchInput] = React.useState(searchParams.get('q') ?? '')
  const debouncedSearch = useDebouncedValue(searchInput, 280)

  // Mirror the debounced term into the URL without resetting an in-flight page.
  React.useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (debouncedSearch === current) return
    setParams({ q: debouncedSearch || null }, { resetPage: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setParams is stable per render
  }, [debouncedSearch])

  // Memoised because it is both the query key and a `useCallback` dependency:
  // a fresh object every render would re-key the cache on every keystroke.
  const filters = React.useMemo<TicketListFilters>(
    () => ({
      search: searchParams.get('q') ?? '',
      status: getList('status'),
      priority: getList('priority'),
      clientId: searchParams.get('client'),
      assigneeId: searchParams.get('assignee'),
      categoryId: searchParams.get('category'),
      sort: searchParams.get('sort') ?? 'recent',
      page: getNumber('page', 1),
    }),
    [searchParams, getList, getNumber],
  )

  const list = useTicketList(organizationId, filters)
  const clients = useClientOptions(organizationId)
  const members = useMemberOptions(organizationId)
  const categories = useCategories(organizationId)

  const openTicketId = hydrated ? searchParams.get('ticket') : null
  const editingTicketId = hydrated ? searchParams.get('edit') : null
  const creating = hydrated && searchParams.get('new') === '1'
  const editingTicket = useTicket(organizationId, editingTicketId)

  const invalidate = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) }),
    ])
  }, [organizationId, queryClient])

  /** Optimistic in-place patch for the current page of the list. */
  const patchRow = React.useCallback(
    async (
      ticketId: string,
      patch: Parameters<typeof updateTicket>[0],
      optimistic: Record<string, unknown>,
    ) => {
      const key = queryKeys.tickets.list(organizationId, filters)
      const previous = queryClient.getQueryData(key)

      queryClient.setQueryData(key, (current: TicketListResult | undefined) =>
        current
          ? {
              ...current,
              rows: current.rows.map((row) =>
                row.id === ticketId ? { ...row, ...optimistic } : row,
              ),
            }
          : current,
      )

      const result = await updateTicket(patch)
      if (!result.ok) {
        queryClient.setQueryData(key, previous)
        notify.error(result.error)
        return
      }
      await invalidate()
    },
    [filters, invalidate, organizationId, queryClient],
  )

  const activeFilterChips = [
    ...(filters.status ?? []).map((status) => ({
      key: `status-${status}`,
      label: 'Stato',
      value: TICKET_STATUS_DESCRIPTORS[status as keyof typeof TICKET_STATUS_DESCRIPTORS]?.label ?? status,
      remove: () =>
        setParams(
          { status: (filters.status ?? []).filter((item) => item !== status) },
          { resetPage: true },
        ),
    })),
    ...(filters.priority ?? []).map((priority) => ({
      key: `priority-${priority}`,
      label: 'Priorità',
      value:
        TICKET_PRIORITY_DESCRIPTORS[priority as keyof typeof TICKET_PRIORITY_DESCRIPTORS]?.label ??
        priority,
      remove: () =>
        setParams(
          { priority: (filters.priority ?? []).filter((item) => item !== priority) },
          { resetPage: true },
        ),
    })),
    ...(filters.clientId
      ? [
          {
            key: 'client',
            label: 'Cliente',
            value:
              (clients.data ?? []).find((client) => client.id === filters.clientId)?.name ??
              'selezionato',
            remove: () => setParams({ client: null }, { resetPage: true }),
          },
        ]
      : []),
    ...(filters.assigneeId
      ? [
          {
            key: 'assignee',
            label: 'Assegnato a',
            value:
              filters.assigneeId === 'unassigned'
                ? 'Non assegnato'
                : (() => {
                    const member = (members.data ?? []).find(
                      (item) => item.userId === filters.assigneeId,
                    )
                    return member ? memberLabel(member) : 'selezionato'
                  })(),
            remove: () => setParams({ assignee: null }, { resetPage: true }),
          },
        ]
      : []),
    ...(filters.categoryId
      ? [
          {
            key: 'category',
            label: 'Categoria',
            value:
              (categories.data ?? []).find((category) => category.id === filters.categoryId)?.name ??
              'selezionata',
            remove: () => setParams({ category: null }, { resetPage: true }),
          },
        ]
      : []),
  ]

  const searching = Boolean(
    filters.search ||
      filters.status?.length ||
      filters.priority?.length ||
      filters.clientId ||
      filters.assigneeId ||
      filters.categoryId,
  )

  const clearAll = () => {
    setSearchInput('')
    setParams(
      { q: null, status: null, priority: null, client: null, assignee: null, category: null },
      { resetPage: true },
    )
  }

  const onDelete = async (ticketId: string) => {
    const snapshot = list.data?.rows.find((row) => row.id === ticketId)
    const detail = queryClient.getQueryData(
      queryKeys.tickets.detail(organizationId, ticketId),
    ) as { id: string } | undefined

    setParams({ ticket: null })

    const result = await deleteTicket(ticketId)
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await invalidate()

    notify.undoable({
      message: snapshot ? `Ticket #${snapshot.reference} eliminato` : 'Ticket eliminato',
      description: 'Puoi annullare per qualche secondo.',
      onUndo: async () => {
        if (!snapshot) return
        const restored = await restoreTicket({
          id: snapshot.id,
          reference: snapshot.reference,
          title: snapshot.title,
          description: null,
          client_id: snapshot.client_id,
          assignee_id: snapshot.assignee_id,
          category_id: snapshot.category?.id ?? null,
          activity_type_id: null,
          status: snapshot.status,
          priority: snapshot.priority,
          due_date: snapshot.due_date,
        })
        if (!restored.ok) {
          notify.error('Ripristino non riuscito', restored.error)
          return
        }
        await invalidate()
        notify.success('Ticket ripristinato')
      },
      // Nothing to commit: the delete already happened.
      onCommit: () => {
        void detail
      },
    })
  }

  return (
    <Page
      title="Ticket"
      description="Richieste e attività dei clienti, con stato, priorità, responsabile e ore collegate."
      actions={
        can('tickets:create') ? (
          <Button
            variant="primary"
            size="md"
            icon={<Plus />}
            onClick={() => setParams({ new: '1' })}
          >
            Nuovo ticket
          </Button>
        ) : null
      }
      toolbar={
        <TableToolbar
          secondRow={
            activeFilterChips.length > 0 ? (
              <>
                {activeFilterChips.map((chip) => (
                  <FilterChip
                    key={chip.key}
                    label={chip.label}
                    value={chip.value}
                    onRemove={chip.remove}
                  />
                ))}
                <Button variant="ghost" size="xs" icon={<X />} onClick={clearAll}>
                  Azzera filtri
                </Button>
              </>
            ) : null
          }
        >
          <div className="w-full sm:max-w-[280px]">
            <label htmlFor="ticket-search" className="sr-only">
              Cerca ticket
            </label>
            <Input
              id="ticket-search"
              inputSize="sm"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cerca per titolo o numero…"
              leading={<Search aria-hidden />}
              trailing={
                searchInput ? (
                  <IconButton
                    label="Azzera ricerca"
                    size="sm"
                    className="pointer-events-auto -mr-1.5"
                    onClick={() => setSearchInput('')}
                  >
                    <X aria-hidden />
                  </IconButton>
                ) : undefined
              }
            />
          </div>

          <MultiSelect
            label="Stato"
            values={filters.status ?? []}
            onChange={(values) => setParams({ status: values }, { resetPage: true })}
            options={statusOptions}
          />

          <MultiSelect
            label="Priorità"
            values={filters.priority ?? []}
            onChange={(values) => setParams({ priority: values }, { resetPage: true })}
            options={priorityOptions}
          />

          <div className="w-[180px]">
            <Combobox
              inputSize="sm"
              value={filters.clientId}
              onChange={(value) => setParams({ client: value }, { resetPage: true })}
              options={(clients.data ?? []).map((client) => ({
                value: client.id,
                label: client.name,
              }))}
              placeholder="Tutti i clienti"
              searchPlaceholder="Cerca cliente…"
              clearable
            />
          </div>

          <div className="w-[190px]">
            <Combobox
              inputSize="sm"
              value={filters.assigneeId}
              onChange={(value) => setParams({ assignee: value }, { resetPage: true })}
              options={[
                { value: userId, label: 'Assegnati a me' },
                { value: 'unassigned', label: 'Non assegnati' },
                ...(members.data ?? [])
                  .filter((member) => member.userId !== userId)
                  .map((member) => ({ value: member.userId, label: memberLabel(member) })),
              ]}
              placeholder="Tutti gli assegnatari"
              searchPlaceholder="Cerca persona…"
              clearable
            />
          </div>

          <div className="ml-auto w-[200px]">
            <SimpleSelect
              inputSize="sm"
              value={filters.sort ?? 'recent'}
              onValueChange={(value) => setParams({ sort: value })}
              options={Object.entries(TICKET_SORTS).map(([key, sort]) => ({
                value: key,
                label: sort.label,
              }))}
            />
          </div>
        </TableToolbar>
      }
    >
      <div className="flex flex-col gap-2">
        <TicketTable
          rows={list.data?.rows ?? []}
          total={list.data?.total ?? 0}
          isPending={list.isPending}
          isError={list.isError}
          onRetry={() => void list.refetch()}
          onOpen={(ticketId) => setParams({ ticket: ticketId })}
          onEdit={(ticketId) => setParams({ edit: ticketId, ticket: null })}
          onStatusChange={(ticket, status) =>
            void patchRow(ticket.id, { id: ticket.id, status }, { status })
          }
          onPriorityChange={(ticket, priority) =>
            void patchRow(ticket.id, { id: ticket.id, priority }, { priority })
          }
          onDelete={(ticket) => void onDelete(ticket.id)}
          canUpdate={can('tickets:update')}
          canAssign={can('tickets:assign')}
          canDelete={can('tickets:delete')}
          sort={(filters.sort ?? 'recent') as TicketSortKey}
          onSortChange={(sort) => setParams({ sort })}
          searching={searching}
          emptyAction={
            can('tickets:create') ? (
              <Button variant="primary" size="sm" icon={<Plus />} onClick={() => setParams({ new: '1' })}>
                Apri il primo ticket
              </Button>
            ) : null
          }
        />

        <Pagination
          page={filters.page ?? 1}
          pageSize={PAGE_SIZE.tickets}
          total={list.data?.total ?? 0}
          loading={list.isFetching}
          onPageChange={(page) => setParams({ page: page === 1 ? null : page })}
        />
      </div>

      <TicketDrawer
        ticketId={openTicketId}
        onClose={() => setParams({ ticket: null })}
        onEdit={(ticketId) => setParams({ edit: ticketId, ticket: null })}
        onDelete={(ticketId) => void onDelete(ticketId)}
      />

      <TicketFormDialog
        open={creating}
        onOpenChange={(open) => setParams({ new: open ? '1' : null })}
        onCreated={(ticketId) => setParams({ new: null, ticket: ticketId })}
      />

      <TicketFormDialog
        open={Boolean(editingTicketId) && Boolean(editingTicket.data)}
        onOpenChange={(open) => setParams({ edit: open ? editingTicketId : null })}
        ticket={editingTicket.data ?? null}
      />
    </Page>
  )
}
