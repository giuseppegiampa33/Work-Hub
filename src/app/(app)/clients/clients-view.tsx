'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Archive, ArchiveRestore, MoreHorizontal, Pencil, Plus, Search, Users, X } from 'lucide-react'
import { PAGE_SIZE } from '@/config/app'
import { setClientArchived } from '@/features/clients/actions'
import { ClientFormDialog } from '@/features/clients/components/client-form-dialog'
import { useClientList } from '@/features/clients/queries'
import { formatDateShort } from '@/lib/format'
import { queryKeys, type ClientListFilters } from '@/lib/query/keys'
import { useDebouncedValue, useIsHydrated, useUrlState } from '@/lib/use-url-state'
import { Page } from '@/components/app/app-shell'
import { useSession } from '@/components/app/session-provider'
import { Button, IconButton } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'
import { Pagination } from '@/components/ui/pagination'
import { SegmentedControl } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
  TableToolbar,
} from '@/components/ui/table'
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states'
import { notify } from '@/components/ui/toast'
import type { ClientRow } from '@/types/database'

const COLUMNS = [{}, {}, {}, {}, {}, {}] as const

export function ClientsView() {
  const { organizationId, can } = useSession()
  const queryClient = useQueryClient()
  const { searchParams, setParams, getNumber } = useUrlState()
  // Gli overlay guidati dall'URL attendono l'idratazione: vedi useIsHydrated.
  const hydrated = useIsHydrated()

  const [searchInput, setSearchInput] = React.useState(searchParams.get('q') ?? '')
  const debounced = useDebouncedValue(searchInput, 280)

  React.useEffect(() => {
    const current = searchParams.get('q') ?? ''
    if (debounced === current) return
    setParams({ q: debounced || null }, { resetPage: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced mirror
  }, [debounced])

  const filters: ClientListFilters = {
    search: searchParams.get('q') ?? '',
    archived: searchParams.get('archived') === '1',
    page: getNumber('page', 1),
  }

  const list = useClientList(organizationId, filters)
  const creating = hydrated && searchParams.get('new') === '1'
  const editingId = hydrated ? searchParams.get('edit') : null
  const editing = list.data?.rows.find((row) => row.id === editingId) ?? null

  const canManage = can('clients:manage')

  const toggleArchived = async (client: ClientRow) => {
    const result = await setClientArchived(client.id, !client.is_archived)
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all(organizationId) })
    notify.success(client.is_archived ? 'Cliente riattivato' : 'Cliente archiviato', client.name)
  }

  return (
    <Page
      title="Clienti"
      description="Anagrafica dei clienti dell'organizzazione, con ticket e ore collegate."
      actions={
        canManage ? (
          <Button
            variant="primary"
            size="md"
            icon={<Plus />}
            onClick={() => setParams({ new: '1' })}
          >
            Nuovo cliente
          </Button>
        ) : null
      }
      toolbar={
        <TableToolbar>
          <div className="w-full sm:max-w-[280px]">
            <label htmlFor="client-search" className="sr-only">
              Cerca cliente
            </label>
            <Input
              id="client-search"
              inputSize="sm"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cerca per nome, email o codice…"
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

          <SegmentedControl
            name="Stato cliente"
            value={filters.archived ? 'archived' : 'active'}
            onChange={(value) =>
              setParams({ archived: value === 'archived' ? '1' : null }, { resetPage: true })
            }
            options={[
              { value: 'active', label: 'Attivi' },
              { value: 'archived', label: 'Archiviati' },
            ]}
          />
        </TableToolbar>
      }
    >
      <div className="flex flex-col gap-2">
        {list.isError ? (
          <TableShell>
            <ErrorState onRetry={() => void list.refetch()} />
          </TableShell>
        ) : !list.isPending && (list.data?.rows.length ?? 0) === 0 ? (
          <TableShell>
            <EmptyState
              icon={Users}
              title={
                filters.search
                  ? 'Nessun cliente corrisponde alla ricerca'
                  : filters.archived
                    ? 'Nessun cliente archiviato'
                    : 'Nessun cliente'
              }
              description={
                filters.search || filters.archived
                  ? undefined
                  : 'Inserisci i clienti per cui lavorate: ticket, attività pianificate e ore si collegheranno a loro.'
              }
              action={
                canManage && !filters.search && !filters.archived ? (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus />}
                    onClick={() => setParams({ new: '1' })}
                  >
                    Aggiungi il primo cliente
                  </Button>
                ) : null
              }
            />
          </TableShell>
        ) : (
          <TableShell>
            <Table>
              <caption className="sr-only">
                Elenco clienti, {list.data?.total ?? 0} risultati.
              </caption>
              <TableHead>
                <tr>
                  <TableHeaderCell>Cliente</TableHeaderCell>
                  <TableHeaderCell width="110px">Codice</TableHeaderCell>
                  <TableHeaderCell width="220px">Email</TableHeaderCell>
                  <TableHeaderCell width="160px">Telefono</TableHeaderCell>
                  <TableHeaderCell width="120px" align="right">
                    Creato
                  </TableHeaderCell>
                  <TableHeaderCell width="44px">
                    <span className="sr-only">Azioni</span>
                  </TableHeaderCell>
                </tr>
              </TableHead>

              {list.isPending ? (
                <TableSkeleton rows={8} columns={COLUMNS.map(() => ({}))} />
              ) : (
                <TableBody>
                  {(list.data?.rows ?? []).map((client) => (
                    <TableRow key={client.id}>
                      <TableCell truncate>
                        <Link
                          href={`/clients/${client.id}`}
                          className="rounded-xs font-medium text-fg outline-none hover:text-brand-text focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-fg-secondary" numeric>
                        {client.code ?? <span className="text-fg-disabled">—</span>}
                      </TableCell>
                      <TableCell truncate className="text-fg-secondary">
                        {client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {client.email}
                          </a>
                        ) : (
                          <span className="text-fg-disabled">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-fg-secondary" numeric>
                        {client.phone ?? <span className="text-fg-disabled">—</span>}
                      </TableCell>
                      <TableCell align="right" numeric className="text-fg-muted">
                        {formatDateShort(client.created_at)}
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton label={`Azioni per ${client.name}`} size="sm">
                                <MoreHorizontal aria-hidden />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/clients/${client.id}`}>Apri scheda</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setParams({ edit: client.id })}>
                                <Pencil aria-hidden />
                                Modifica
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => void toggleArchived(client)}>
                                {client.is_archived ? (
                                  <>
                                    <ArchiveRestore aria-hidden />
                                    Riattiva
                                  </>
                                ) : (
                                  <>
                                    <Archive aria-hidden />
                                    Archivia
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              )}
            </Table>
          </TableShell>
        )}

        <Pagination
          page={filters.page ?? 1}
          pageSize={PAGE_SIZE.clients}
          total={list.data?.total ?? 0}
          loading={list.isFetching}
          onPageChange={(page) => setParams({ page: page === 1 ? null : page })}
        />
      </div>

      <ClientFormDialog
        open={creating}
        onOpenChange={(open) => setParams({ new: open ? '1' : null })}
        onCreated={() => setParams({ new: null })}
      />

      <ClientFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => setParams({ edit: open ? editingId : null })}
        client={editing}
      />
    </Page>
  )
}
