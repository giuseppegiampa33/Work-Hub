'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Paperclip, Trash2, Upload } from 'lucide-react'
import { UPLOAD } from '@/config/app'
import { formatFileSize, formatTimeAgo } from '@/lib/format'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button, IconButton } from '@/components/ui/button'
import { InlineEmpty } from '@/components/ui/states'
import { notify } from '@/components/ui/toast'
import { useSession } from '@/components/app/session-provider'
import type { TicketAttachmentRow } from '@/types/database'

const BUCKET = 'ticket-attachments'

/**
 * Ticket attachments.
 *
 * Files live in Storage under `<organization_id>/<ticket_id>/…`, which is also
 * what the bucket policies match on — so a path is enough to prove tenancy. The
 * table only holds metadata; nothing binary ever touches Postgres.
 */
export function TicketAttachments({
  ticketId,
  attachments,
  canUpload,
  canDelete,
}: {
  ticketId: string
  attachments: TicketAttachmentRow[]
  canUpload: boolean
  canDelete: boolean
}) {
  const { organizationId, userId } = useSession()
  const queryClient = useQueryClient()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.tickets.related(organizationId, ticketId) })

  const onPick = async (file: File | undefined) => {
    if (!file) return

    if (file.size > UPLOAD.attachmentMaxBytes) {
      notify.error(
        'File troppo grande',
        `Il limite è ${formatFileSize(UPLOAD.attachmentMaxBytes)}.`,
      )
      return
    }
    if (attachments.length >= UPLOAD.maxAttachmentsPerTicket) {
      notify.error(
        'Limite allegati raggiunto',
        `Massimo ${UPLOAD.maxAttachmentsPerTicket} file per ticket.`,
      )
      return
    }

    setBusy(true)
    const supabase = getSupabaseBrowserClient()
    const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-120)
    const path = `${organizationId}/${ticketId}/${crypto.randomUUID()}-${safeName}`

    const upload = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })

    if (upload.error) {
      setBusy(false)
      notify.error('Caricamento non riuscito', upload.error.message)
      return
    }

    const { error } = await supabase.from('ticket_attachments').insert({
      organization_id: organizationId,
      ticket_id: ticketId,
      uploaded_by: userId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    })

    setBusy(false)

    if (error) {
      // Keep storage and metadata consistent.
      await supabase.storage.from(BUCKET).remove([path])
      notify.error('Allegato non registrato', error.message)
      return
    }

    await refresh()
    notify.success('Allegato caricato', file.name)
  }

  const onDownload = async (attachment: TicketAttachmentRow) => {
    const supabase = getSupabaseBrowserClient()
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(attachment.storage_path, 60)

    if (error || !data) {
      notify.error('Download non disponibile', error?.message)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const onRemove = async (attachment: TicketAttachmentRow) => {
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase
      .from('ticket_attachments')
      .delete()
      .eq('id', attachment.id)
      .eq('organization_id', organizationId)

    if (error) {
      notify.error('Rimozione non riuscita', error.message)
      return
    }
    await supabase.storage.from(BUCKET).remove([attachment.storage_path])
    await refresh()
    notify.success('Allegato rimosso')
  }

  return (
    <div className="flex flex-col gap-2">
      {attachments.length === 0 ? (
        <InlineEmpty>Nessun allegato.</InlineEmpty>
      ) : (
        <ul className="flex flex-col divide-y divide-line-subtle">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 py-1.5">
              <Paperclip className="size-3.5 shrink-0 text-fg-muted" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-sm text-fg">{attachment.file_name}</span>
                <span className="text-caption text-fg-muted" data-numeric>
                  {formatFileSize(attachment.size_bytes)} · {formatTimeAgo(attachment.created_at)}
                </span>
              </span>
              <IconButton
                label={`Scarica ${attachment.file_name}`}
                size="sm"
                onClick={() => void onDownload(attachment)}
              >
                <Download aria-hidden />
              </IconButton>
              {canDelete ? (
                <IconButton
                  label={`Rimuovi ${attachment.file_name}`}
                  size="sm"
                  variant="destructive"
                  onClick={() => void onRemove(attachment)}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canUpload ? (
        <>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              void onPick(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload />}
            loading={busy}
            onClick={() => inputRef.current?.click()}
            className="self-start"
          >
            Aggiungi allegato
          </Button>
        </>
      ) : null}
    </div>
  )
}
