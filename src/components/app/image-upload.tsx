'use client'

import * as React from 'react'
import { Trash2, Upload } from 'lucide-react'
import { UPLOAD } from '@/config/app'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/**
 * Image upload for avatars and organization logos.
 *
 * The path always starts with the id the bucket policy matches on
 * (`<user_id>/…` or `<organization_id>/…`), so authorisation is decided by the
 * key, not by a claim in the request. The old object is removed after the new
 * URL is persisted, so a failed save never leaves the record pointing at
 * nothing.
 */
export function ImageUpload({
  bucket,
  pathPrefix,
  currentUrl,
  onUploaded,
  onRemoved,
  preview,
  label,
  maxBytes = UPLOAD.avatarMaxBytes,
}: {
  bucket: 'avatars' | 'org-logos'
  pathPrefix: string
  currentUrl: string | null
  onUploaded: (publicUrl: string) => Promise<void>
  onRemoved: () => Promise<void>
  preview: React.ReactNode
  label: string
  maxBytes?: number
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

  const onPick = async (file: File | undefined) => {
    if (!file) return

    if (!(UPLOAD.imageMimeTypes as readonly string[]).includes(file.type)) {
      notify.error('Formato non supportato', 'Usa PNG, JPEG o WebP.')
      return
    }
    if (file.size > maxBytes) {
      notify.error('Immagine troppo grande', `Il limite è ${formatFileSize(maxBytes)}.`)
      return
    }

    setBusy(true)
    const supabase = getSupabaseBrowserClient()
    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png'
    const path = `${pathPrefix}/${crypto.randomUUID()}.${extension}`

    const upload = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
      contentType: file.type,
    })

    if (upload.error) {
      setBusy(false)
      notify.error('Caricamento non riuscito', upload.error.message)
      return
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path)

    try {
      await onUploaded(data.publicUrl)
      notify.success('Immagine aggiornata')
    } catch {
      await supabase.storage.from(bucket).remove([path])
      notify.error('Salvataggio non riuscito')
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async () => {
    setBusy(true)
    try {
      await onRemoved()
      notify.success('Immagine rimossa')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD.imageMimeTypes.join(',')}
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
          >
            {currentUrl ? 'Sostituisci' : label}
          </Button>
          {currentUrl ? (
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 />}
              disabled={busy}
              onClick={() => void onRemove()}
            >
              Rimuovi
            </Button>
          ) : null}
        </div>
        <p className="text-caption text-fg-muted">
          PNG, JPEG o WebP, fino a {formatFileSize(maxBytes)}.
        </p>
      </div>
    </div>
  )
}
