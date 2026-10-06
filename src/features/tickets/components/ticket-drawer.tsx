'use client'

import * as React from 'react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Clock, Pencil, Plus, Trash2 } from 'lucide-react'
import { memberLabel, useMemberOptions } from '@/features/lookups/queries'
import { TimeEntryDialog } from '@/features/time/components/time-entry-dialog'
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatDueDate,
  formatTime,
  formatTimeAgo,
} from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { cn } from '@/lib/utils'
import { Avatar, PersonChip } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerSection } from '@/components/ui/drawer'
import { Textarea } from '@/components/ui/input'
import { DetailRow } from '@/components/ui/misc'
import { ErrorState, InlineEmpty, Skeleton } from '@/components/ui/states'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { notify } from '@/components/ui/toast'
import { useSession } from '@/components/app/session-provider'
import { addTicketComment, deleteTicketComment, updateTicket } from '../actions'
import { useTicket, useTicketComments, useTicketRelated, useTicketTimeline } from '../queries'
import { PriorityPicker, StatusPicker } from './pickers'
import { TicketAttachments } from './ticket-attachments'
import { TicketTimeline } from './ticket-timeline'

/**
 * Ticket detail.
 *
 * A side drawer rather than a page: the list stays behind it, so triaging ten
 * tickets does not mean ten navigations. The ticket id lives in the URL
 * (`?ticket=…`), which keeps the view linkable and the back button honest.
 */
export function TicketDrawer({
  ticketId,
  onClose,
  onEdit,
  onDelete,
}: {
  ticketId: string | null
  onClose: () => void
  onEdit: (ticketId: string) => void
  onDelete: (ticketId: string) => void
}) {
  const { organizationId, userId, can } = useSession()
  const queryClient = useQueryClient()
  const open = Boolean(ticketId)

  const ticket = useTicket(organizationId, ticketId)
  const comments = useTicketComments(organizationId, ticketId)
  const timeline = useTicketTimeline(organizationId, ticketId)
  const related = useTicketRelated(organizationId, ticketId)
  const members = useMemberOptions(organizationId, open)

  const [commentBody, setCommentBody] = React.useState('')
  const [commentPending, setCommentPending] = React.useState(false)
  const [logOpen, setLogOpen] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const canUpdate = can('tickets:update')
  const detail = ticket.data

  const invalidate = React.useCallback(async () => {
    if (!ticketId) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) }),
    ])
  }, [organizationId, queryClient, ticketId])

  const patch = async (values: Parameters<typeof updateTicket>[0]) => {
    const result = await updateTicket(values)
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await invalidate()
  }

  const submitComment = async () => {
    if (!ticketId || commentBody.trim().length === 0) return
    setCommentPending(true)
    const result = await addTicketComment({ ticketId, body: commentBody })
    setCommentPending(false)

    if (!result.ok) {
      notify.error(result.error)
      return
    }
    setCommentBody('')
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.comments(organizationId, ticketId),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.tickets.events(organizationId, ticketId),
      }),
    ])
  }

  return (
    <>
      <Drawer open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
        <DrawerContent
          title={detail ? detail.title : 'Dettaglio ticket'}
          description={
            detail ? (
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span data-numeric>#{detail.reference}</span>
                <span aria-hidden>·</span>
                <span>Aperto {formatTimeAgo(detail.created_at)}</span>
                {detail.creator ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>da {detail.creator.full_name ?? detail.creator.email}</span>
                  </>
                ) : null}
              </span>
            ) : undefined
          }
          headerActions={
            detail ? (
              <div className="flex shrink-0 items-center gap-1">
                {canUpdate ? (
                  <IconButton
                    label="Modifica ticket"
                    size="md"
                    onClick={() => onEdit(detail.id)}
                  >
                    <Pencil aria-hidden />
                  </IconButton>
                ) : null}
                {can('tickets:delete') ? (
                  <IconButton
                    label="Elimina ticket"
                    size="md"
                    variant="destructive"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                ) : null}
              </div>
            ) : null
          }
          footer={
            can('tickets:comment') && detail ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  void submitComment()
                }}
                className="flex flex-col gap-2"
              >
                <label htmlFor="ticket-comment" className="sr-only">
                  Aggiungi un commento
                </label>
                <Textarea
                  id="ticket-comment"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="Aggiungi un commento…"
                  rows={2}
                  autoGrow
                  className="min-h-9"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption text-fg-muted">
                    Verrà notificato a chi ha il ticket assegnato.
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={commentPending}
                    disabled={commentBody.trim().length === 0}
                  >
                    Commenta
                  </Button>
                </div>
              </form>
            ) : null
          }
        >
          {ticket.isError ? (
            <ErrorState
              title="Ticket non disponibile"
              description="Potrebbe essere stato eliminato, oppure non hai accesso a questa risorsa."
              onRetry={() => void ticket.refetch()}
            />
          ) : ticket.isPending || !detail ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-3 w-5/12" />
              <Skeleton className="h-3 w-8/12" />
              <Skeleton className="h-3 w-6/12" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <>
              <DrawerSection>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusPicker
                    value={detail.status}
                    onChange={(status) => void patch({ id: detail.id, status })}
                    disabled={!canUpdate}
                    size="md"
                  />
                  <PriorityPicker
                    value={detail.priority}
                    onChange={(priority) => void patch({ id: detail.id, priority })}
                    disabled={!canUpdate}
                  />
                  {can('time:log') ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Clock />}
                      onClick={() => setLogOpen(true)}
                      className="ml-auto"
                    >
                      Registra ore
                    </Button>
                  ) : null}
                </div>

                <dl className="flex flex-col">
                  <DetailRow label="Cliente">
                    {detail.client ? (
                      <Link
                        href={`/clients/${detail.client.id}`}
                        className="text-brand-text underline-offset-2 hover:underline"
                      >
                        {detail.client.name}
                      </Link>
                    ) : (
                      <span className="text-fg-disabled">—</span>
                    )}
                  </DetailRow>

                  <DetailRow label="Assegnato a">
                    {can('tickets:assign') ? (
                      <AssigneeQuickPicker
                        value={detail.assignee_id}
                        members={members.data ?? []}
                        onChange={(assigneeId) => void patch({ id: detail.id, assigneeId })}
                      />
                    ) : (
                      <PersonChip
                        id={detail.assignee?.id}
                        name={detail.assignee?.full_name}
                        email={detail.assignee?.email}
                        src={detail.assignee?.avatar_url}
                      />
                    )}
                  </DetailRow>

                  <DetailRow label="Scadenza">
                    {detail.due_date ? (
                      <span
                        className={cn(
                          formatDueDate(detail.due_date).tone === 'danger' && 'text-danger-text',
                          formatDueDate(detail.due_date).tone === 'warning' && 'text-warning-text',
                        )}
                      >
                        {formatDate(detail.due_date)} · {formatDueDate(detail.due_date).label}
                      </span>
                    ) : (
                      <span className="text-fg-disabled">—</span>
                    )}
                  </DetailRow>

                  <DetailRow label="Categoria">
                    {detail.category ? (
                      <Badge tone={(detail.category.tone as 'neutral') ?? 'neutral'} size="sm">
                        {detail.category.name}
                      </Badge>
                    ) : (
                      <span className="text-fg-disabled">—</span>
                    )}
                  </DetailRow>

                  {detail.activity_type ? (
                    <DetailRow label="Attività">{detail.activity_type.name}</DetailRow>
                  ) : null}

                  <DetailRow label="Ore registrate">
                    <span data-numeric>{formatDuration(related.data?.loggedMinutes ?? 0)}</span>
                  </DetailRow>

                  {detail.resolved_at ? (
                    <DetailRow label="Risolto il">{formatDateTime(detail.resolved_at)}</DetailRow>
                  ) : null}
                </dl>
              </DrawerSection>

              {detail.description ? (
                <DrawerSection title="Descrizione">
                  <p className="whitespace-pre-wrap text-body-sm leading-[1.5] text-fg-secondary">
                    {detail.description}
                  </p>
                </DrawerSection>
              ) : null}

              <DrawerSection>
                <Tabs defaultValue="activity">
                  <TabsList>
                    <TabsTrigger value="activity">
                      Attività
                      {comments.data?.length ? (
                        <span className="text-caption text-fg-muted" data-numeric>
                          {comments.data.length}
                        </span>
                      ) : null}
                    </TabsTrigger>
                    <TabsTrigger value="planning">Pianificazione</TabsTrigger>
                    <TabsTrigger value="hours">Ore</TabsTrigger>
                    <TabsTrigger value="files">Allegati</TabsTrigger>
                  </TabsList>

                  <TabsContent value="activity" className="pt-4">
                    <div className="flex flex-col gap-5">
                      <Comments
                        comments={comments.data ?? []}
                        isPending={comments.isPending}
                        currentUserId={userId}
                        onDelete={async (commentId) => {
                          const result = await deleteTicketComment(commentId)
                          if (!result.ok) {
                            notify.error(result.error)
                            return
                          }
                          void queryClient.invalidateQueries({
                            queryKey: queryKeys.tickets.comments(organizationId, detail.id),
                          })
                        }}
                      />
                      <div>
                        <h4 className="mb-2 text-table-heading uppercase text-fg-muted">
                          Cronologia
                        </h4>
                        <TicketTimeline
                          entries={timeline.data ?? []}
                          members={members.data ?? []}
                          isPending={timeline.isPending}
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="planning" className="pt-4">
                    {related.isPending ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (related.data?.events.length ?? 0) === 0 ? (
                      <div className="flex flex-col items-start gap-2">
                        <InlineEmpty>
                          Nessuna attività pianificata per questo ticket.
                        </InlineEmpty>
                        {can('calendar:plan') ? (
                          <Button asChild variant="secondary" size="sm" icon={<Plus />}>
                            <Link href={`/calendar?ticket=${detail.id}&new=1`}>
                              Pianifica in calendario
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <ul className="flex flex-col divide-y divide-line-subtle">
                        {related.data?.events.map((event) => (
                          <li key={event.id} className="flex items-center gap-2 py-2">
                            <CalendarDays
                              className="size-3.5 shrink-0 text-fg-muted"
                              aria-hidden
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-body-sm text-fg">{event.title}</span>
                              <span className="text-caption text-fg-muted" data-numeric>
                                {formatDate(event.starts_at)} · {formatTime(event.starts_at)}–
                                {formatTime(event.ends_at)}
                              </span>
                            </span>
                            <Badge tone={event.is_completed ? 'success' : 'brand'} size="sm">
                              {event.is_completed ? 'Consuntivato' : 'Pianificato'}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="hours" className="pt-4">
                    {related.isPending ? (
                      <Skeleton className="h-12 w-full" />
                    ) : (related.data?.timeEntries.length ?? 0) === 0 ? (
                      <InlineEmpty>Nessuna ora registrata su questo ticket.</InlineEmpty>
                    ) : (
                      <ul className="flex flex-col divide-y divide-line-subtle">
                        {related.data?.timeEntries.map((entry) => (
                          <li key={entry.id} className="flex items-center gap-2 py-2">
                            <Avatar
                              id={entry.user?.id}
                              name={entry.user?.full_name}
                              email={entry.user?.email}
                              size="xs"
                            />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-body-sm text-fg">
                                {entry.description ?? 'Attività'}
                              </span>
                              <span className="text-caption text-fg-muted" data-numeric>
                                {formatDate(entry.entry_date)}
                                {entry.is_billable ? '' : ' · non fatturabile'}
                              </span>
                            </span>
                            <span className="shrink-0 text-body-sm font-medium text-fg" data-numeric>
                              {formatDuration(entry.duration_minutes)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="files" className="pt-4">
                    <TicketAttachments
                      ticketId={detail.id}
                      attachments={related.data?.attachments ?? []}
                      canUpload={canUpdate}
                      canDelete={canUpdate}
                    />
                  </TabsContent>
                </Tabs>
              </DrawerSection>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {detail ? (
        <TimeEntryDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          prefill={{
            ticketId: detail.id,
            clientId: detail.client_id,
            categoryId: detail.category_id,
            activityTypeId: detail.activity_type_id,
            ticketLabel: `#${detail.reference} ${detail.title}`,
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Eliminare il ticket?"
        description={
          detail
            ? `“${detail.title}” verrà eliminato con commenti, cronologia e allegati. Le ore registrate restano, senza il collegamento al ticket.`
            : undefined
        }
        confirmLabel="Elimina ticket"
        onConfirm={() => {
          if (!detail) return
          setConfirmDelete(false)
          onDelete(detail.id)
        }}
      />
    </>
  )
}

function AssigneeQuickPicker({
  value,
  members,
  onChange,
}: {
  value: string | null
  members: { userId: string; fullName: string | null; email: string; avatarUrl: string | null }[]
  onChange: (userId: string | null) => void
}) {
  return (
    <select
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value || null)}
      aria-label="Assegnatario"
      className={cn(
        'w-full rounded-sm border border-transparent bg-transparent py-0.5 text-body-sm text-fg',
        'transition-colors duration-fast hover:border-line hover:bg-surface-hover',
        'focus-visible:border-brand focus-visible:outline-none',
      )}
    >
      <option value="">Non assegnato</option>
      {members.map((member) => (
        <option key={member.userId} value={member.userId}>
          {memberLabel(member)}
        </option>
      ))}
    </select>
  )
}

function Comments({
  comments,
  isPending,
  currentUserId,
  onDelete,
}: {
  comments: {
    id: string
    body: string
    created_at: string
    author_id: string | null
    author: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
  }[]
  isPending: boolean
  currentUserId: string
  onDelete: (commentId: string) => Promise<void>
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-10/12" />
      </div>
    )
  }

  if (comments.length === 0) {
    return <InlineEmpty>Nessun commento. Inizia tu la conversazione.</InlineEmpty>
  }

  return (
    <ul className="flex flex-col gap-3">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-2.5">
          <Avatar
            id={comment.author?.id}
            name={comment.author?.full_name}
            email={comment.author?.email}
            src={comment.author?.avatar_url}
            size="sm"
            className="mt-0.5"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-body-sm font-medium text-fg">
                {comment.author?.full_name ?? comment.author?.email ?? 'Utente rimosso'}
              </span>
              <span className="shrink-0 text-caption text-fg-muted">
                {formatTimeAgo(comment.created_at)}
              </span>
              {comment.author_id === currentUserId ? (
                <button
                  type="button"
                  onClick={() => void onDelete(comment.id)}
                  className="ml-auto shrink-0 rounded-xs text-caption text-fg-muted outline-none hover:text-danger-text focus-visible:shadow-[0_0_0_2px_rgb(var(--color-focus)/0.4)]"
                >
                  Elimina
                </button>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-body-sm leading-[1.5] text-fg-secondary">
              {comment.body}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}
