'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, Link2, RotateCw, Trash2, UserPlus, X } from 'lucide-react'
import type { z } from 'zod'
import { INVITE_TTL_DAYS } from '@/config/app'
import {
  canAssignRole,
  ORG_ROLES,
  ROLE_DESCRIPTORS,
  roleLabel,
  type InvitableRole,
  type OrgRole,
} from '@/config/roles'
import {
  inviteMember,
  removeMember,
  renewInvite,
  revokeInvite,
  updateMemberRole,
} from '@/features/members/actions'
import { inviteMemberSchema } from '@/features/members/schemas'
import { useInvites, useMembers, type MemberRow } from '@/features/members/queries'
import { formatDate, formatTimeAgo } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button, IconButton } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CodeBlock } from '@/components/ui/misc'
import { SimpleSelect } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from '@/components/ui/table'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states'
import { FormAlert } from '@/components/app/auth-form'
import { useSession } from '@/components/app/session-provider'
import { notify } from '@/components/ui/toast'

type InviteValues = z.input<typeof inviteMemberSchema>

/**
 * Members and invites.
 *
 * Invites are links, not emails: the admin generates one, copies it and sends
 * it through whatever channel the team already uses. The record carries the
 * address it was issued to, and `accept_invite` refuses any other account — so
 * a forwarded link cannot be redeemed by the wrong person.
 */
export function MembersSettings({
  currentUserId,
  role,
  invitableRoles,
}: {
  currentUserId: string
  role: OrgRole
  invitableRoles: InvitableRole[]
}) {
  const { organizationId, can } = useSession()
  const queryClient = useQueryClient()

  const members = useMembers(organizationId)
  const invites = useInvites(organizationId, can('members:invite'))

  const [generatedUrl, setGeneratedUrl] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [memberToRemove, setMemberToRemove] = React.useState<MemberRow | null>(null)

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', role: invitableRoles.includes('operator') ? 'operator' : invitableRoles[0] },
  })

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all(organizationId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.org(organizationId) }),
    ])

  const onInvite = form.handleSubmit(async (values) => {
    setFormError(null)
    setGeneratedUrl(null)
    const result = await inviteMember(values)

    if (!result.ok) {
      if (result.field === 'email' || result.field === 'role') {
        form.setError(result.field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    setGeneratedUrl(result.data.url)
    form.reset({ email: '', role: values.role })
    await refresh()
    notify.success('Invito creato', 'Copia il link e invialo al collega.')
  })

  const onChangeRole = async (member: MemberRow, nextRole: OrgRole) => {
    const result = await updateMemberRole({ userId: member.userId, role: nextRole })
    if (!result.ok) {
      notify.error(result.error)
      return
    }
    await refresh()
    notify.success('Ruolo aggiornato', `${member.fullName ?? member.email} · ${roleLabel(nextRole)}`)
  }

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      notify.success('Link copiato')
    } catch {
      notify.error('Copia non riuscita', 'Seleziona il link manualmente.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {can('members:invite') ? (
        <Card>
          <CardHeader
            title="Invita una persona"
            description={`Il link resta valido ${INVITE_TTL_DAYS} giorni e funziona solo per l'indirizzo indicato.`}
          />
          <CardBody className="flex flex-col gap-4">
            <form onSubmit={onInvite} className="flex flex-col gap-3" noValidate>
              {formError ? <FormAlert>{formError}</FormAlert> : null}

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
                <Field
                  label="Email del collega"
                  htmlFor="invite-email"
                  error={form.formState.errors.email?.message}
                  required
                >
                  <Input
                    id="invite-email"
                    type="email"
                    inputMode="email"
                    placeholder="collega@azienda.it"
                    invalid={Boolean(form.formState.errors.email)}
                    {...form.register('email')}
                  />
                </Field>

                <Field
                  label="Ruolo"
                  htmlFor="invite-role"
                  error={form.formState.errors.role?.message}
                >
                  <SimpleSelect
                    id="invite-role"
                    value={form.watch('role')}
                    onValueChange={(value) =>
                      form.setValue('role', (value ?? 'operator') as InvitableRole)
                    }
                    options={invitableRoles.map((item) => ({
                      value: item,
                      label: roleLabel(item),
                    }))}
                  />
                </Field>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  icon={<UserPlus />}
                  loading={form.formState.isSubmitting}
                >
                  Genera invito
                </Button>
              </div>
            </form>

            <p className="text-meta text-fg-muted">
              {ROLE_DESCRIPTORS[form.watch('role') as OrgRole]?.summary}
            </p>

            {generatedUrl ? (
              <div className="flex flex-col gap-2 rounded-md border border-brand-line bg-brand-subtle/60 p-3">
                <div className="flex items-center gap-2 text-body-sm font-medium text-brand-text">
                  <Link2 className="size-4" aria-hidden />
                  Link di invito pronto
                </div>
                <CodeBlock value={generatedUrl} wrap className="bg-surface" />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Copy />}
                    onClick={() => void copy(generatedUrl)}
                  >
                    Copia link
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setGeneratedUrl(null)}>
                    Nascondi
                  </Button>
                </div>
                <p className="text-caption text-fg-muted">
                  L&apos;invio automatico via email non è ancora attivo: condividi il link tu.
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Membri"
          description={
            members.data ? `${members.data.length} persone in questa organizzazione.` : undefined
          }
        />
        <CardBody padded={false}>
          {members.isError ? (
            <ErrorState onRetry={() => void members.refetch()} />
          ) : members.isPending ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-4 w-7/12" />
              <Skeleton className="h-4 w-5/12" />
            </div>
          ) : (
            <TableShell className="rounded-none border-0">
              <Table>
                <caption className="sr-only">Membri dell&apos;organizzazione</caption>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Persona</TableHeaderCell>
                    <TableHeaderCell width="190px">Ruolo</TableHeaderCell>
                    <TableHeaderCell width="140px" align="right">
                      Nel team da
                    </TableHeaderCell>
                    <TableHeaderCell width="56px">
                      <span className="sr-only">Azioni</span>
                    </TableHeaderCell>
                  </tr>
                </TableHead>
                <TableBody>
                  {(members.data ?? []).map((member) => {
                    const editable =
                      can('members:update_role') &&
                      member.userId !== currentUserId &&
                      canAssignRole(role, member.role)

                    return (
                      <TableRow key={member.id}>
                        <TableCell truncate>
                          <span className="flex min-w-0 items-center gap-2.5">
                            <Avatar
                              id={member.userId}
                              name={member.fullName}
                              email={member.email}
                              src={member.avatarUrl}
                              size="md"
                            />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-body-sm font-medium text-fg">
                                {member.fullName ?? member.email}
                                {member.userId === currentUserId ? (
                                  <span className="ml-1.5 text-caption text-fg-muted">(tu)</span>
                                ) : null}
                              </span>
                              <span className="truncate text-caption text-fg-muted">
                                {member.email}
                              </span>
                            </span>
                          </span>
                        </TableCell>

                        <TableCell>
                          {editable ? (
                            <SimpleSelect
                              inputSize="sm"
                              value={member.role}
                              onValueChange={(value) =>
                                void onChangeRole(member, (value ?? member.role) as OrgRole)
                              }
                              options={ORG_ROLES.filter((item) =>
                                canAssignRole(role, item),
                              ).map((item) => ({ value: item, label: roleLabel(item) }))}
                            />
                          ) : (
                            <Badge
                              tone={member.role === 'owner' ? 'brand' : 'neutral'}
                              size="md"
                            >
                              {roleLabel(member.role)}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell align="right" numeric className="text-fg-muted">
                          {formatDate(member.joinedAt)}
                        </TableCell>

                        <TableCell>
                          {can('members:remove') &&
                          member.userId !== currentUserId &&
                          (member.role !== 'owner' || role === 'owner') ? (
                            <IconButton
                              label={`Rimuovi ${member.fullName ?? member.email}`}
                              size="sm"
                              variant="destructive"
                              onClick={() => setMemberToRemove(member)}
                            >
                              <Trash2 aria-hidden />
                            </IconButton>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableShell>
          )}
        </CardBody>
      </Card>

      {can('members:invite') ? (
        <Card>
          <CardHeader
            title="Inviti in sospeso"
            description="Inviti generati e non ancora accettati."
          />
          <CardBody padded={false}>
            {invites.isPending ? (
              <div className="p-4">
                <Skeleton className="h-4 w-6/12" />
              </div>
            ) : (invites.data?.length ?? 0) === 0 ? (
              <EmptyState
                compact
                icon={Link2}
                title="Nessun invito in sospeso"
                description="Genera un invito qui sopra per aggiungere un collega."
              />
            ) : (
              <ul className="divide-y divide-line-subtle">
                {(invites.data ?? []).map((invite) => {
                  const expired = new Date(invite.expires_at) < new Date()
                  const revoked = Boolean(invite.revoked_at)

                  return (
                    <li
                      key={invite.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-sm text-fg">{invite.email}</span>
                        <span className="text-caption text-fg-muted">
                          {roleLabel(invite.role)} · creato {formatTimeAgo(invite.created_at)}
                          {invite.invitedBy
                            ? ` da ${invite.invitedBy.full_name ?? invite.invitedBy.email}`
                            : ''}
                        </span>
                      </span>

                      <Badge
                        tone={revoked ? 'neutral' : expired ? 'warning' : 'brand'}
                        size="sm"
                        className="shrink-0"
                      >
                        {revoked ? 'Revocato' : expired ? 'Scaduto' : 'In attesa'}
                      </Badge>

                      <div className="flex shrink-0 items-center gap-1">
                        {!revoked && !expired ? (
                          <IconButton
                            label="Copia link di invito"
                            size="sm"
                            onClick={() =>
                              void copy(`${window.location.origin}/invite/${invite.token}`)
                            }
                          >
                            <Copy aria-hidden />
                          </IconButton>
                        ) : null}
                        {expired || revoked ? (
                          <IconButton
                            label="Rinnova invito"
                            size="sm"
                            onClick={async () => {
                              const result = await renewInvite(invite.id)
                              if (!result.ok) {
                                notify.error(result.error)
                                return
                              }
                              setGeneratedUrl(result.data.url)
                              await refresh()
                              notify.success('Invito rinnovato')
                            }}
                          >
                            <RotateCw aria-hidden />
                          </IconButton>
                        ) : (
                          <IconButton
                            label="Revoca invito"
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              const result = await revokeInvite(invite.id)
                              if (!result.ok) {
                                notify.error(result.error)
                                return
                              }
                              await refresh()
                              notify.success('Invito revocato')
                            }}
                          >
                            <X aria-hidden />
                          </IconButton>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Cosa può fare ogni ruolo" />
        <CardBody padded={false}>
          <ul className="divide-y divide-line-subtle">
            {ORG_ROLES.map((item) => (
              <li key={item} className="flex gap-3 px-4 py-2.5">
                <span className="w-32 shrink-0">
                  <Badge tone={item === 'owner' ? 'brand' : 'neutral'} size="sm">
                    {roleLabel(item)}
                  </Badge>
                </span>
                <span className="text-body-sm text-fg-secondary">
                  {ROLE_DESCRIPTORS[item].summary}
                </span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => (open ? undefined : setMemberToRemove(null))}
        title="Rimuovere il membro?"
        description={
          memberToRemove
            ? `${memberToRemove.fullName ?? memberToRemove.email} perderà l'accesso ai dati di questa organizzazione. Ticket e ore già registrate restano.`
            : undefined
        }
        confirmLabel="Rimuovi dal team"
        onConfirm={async () => {
          if (!memberToRemove) return
          const result = await removeMember(memberToRemove.userId)
          setMemberToRemove(null)
          if (!result.ok) {
            notify.error(result.error)
            return
          }
          await refresh()
          notify.success('Membro rimosso')
        }}
      >
        <p className="flex items-start gap-2 text-body-sm text-fg-secondary">
          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          Potrai invitare di nuovo la stessa persona in qualsiasi momento.
        </p>
      </ConfirmDialog>
    </div>
  )
}
