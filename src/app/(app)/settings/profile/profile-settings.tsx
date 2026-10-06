'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LogOut } from 'lucide-react'
import type { z } from 'zod'
import {
  signOut,
  updatePassword,
  updateProfile,
  updateProfileAvatar,
} from '@/features/auth/actions'
import { updatePasswordSchema, updateProfileSchema } from '@/features/auth/schemas'
import { leaveOrganization } from '@/features/organizations/actions'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { FormAlert } from '@/components/app/auth-form'
import { ImageUpload } from '@/components/app/image-upload'
import { notify } from '@/components/ui/toast'

type ProfileValues = z.input<typeof updateProfileSchema>
type PasswordValues = z.input<typeof updatePasswordSchema>

export function ProfileSettings({
  userId,
  email,
  fullName,
  avatarUrl,
  organizationCount,
}: {
  userId: string
  email: string
  fullName: string
  avatarUrl: string | null
  organizationCount: number
}) {
  const router = useRouter()
  const [avatar, setAvatar] = React.useState(avatarUrl)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)
  const [passwordDone, setPasswordDone] = React.useState(false)
  const [confirmLeave, setConfirmLeave] = React.useState(false)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { fullName },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSaveProfile = profileForm.handleSubmit(async (values) => {
    const result = await updateProfile(values)
    if (!result.ok) {
      profileForm.setError('fullName', { message: result.error })
      return
    }
    notify.success('Profilo aggiornato')
    router.refresh()
  })

  const onSavePassword = passwordForm.handleSubmit(async (values) => {
    setPasswordError(null)
    setPasswordDone(false)
    const result = await updatePassword(values)
    if (!result.ok) {
      if (result.field === 'password' || result.field === 'confirmPassword') {
        passwordForm.setError(result.field, { message: result.error })
      } else {
        setPasswordError(result.error)
      }
      return
    }
    passwordForm.reset({ password: '', confirmPassword: '' })
    setPasswordDone(true)
    notify.success('Password aggiornata')
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Dati personali"
          description="Il nome compare nei ticket, nei commenti e nei report."
        />
        <CardBody className="flex flex-col gap-5">
          <ImageUpload
            bucket="avatars"
            pathPrefix={userId}
            currentUrl={avatar}
            label="Carica avatar"
            preview={
              <Avatar id={userId} name={fullName} email={email} src={avatar} size="xl" />
            }
            onUploaded={async (publicUrl) => {
              const result = await updateProfileAvatar(publicUrl)
              if (!result.ok) throw new Error(result.error)
              setAvatar(publicUrl)
              router.refresh()
            }}
            onRemoved={async () => {
              const result = await updateProfileAvatar(null)
              if (!result.ok) {
                notify.error(result.error)
                return
              }
              setAvatar(null)
              router.refresh()
            }}
          />

          <form onSubmit={onSaveProfile} className="flex flex-col gap-4" noValidate>
            <Field
              label="Nome e cognome"
              htmlFor="profile-name"
              error={profileForm.formState.errors.fullName?.message}
              required
            >
              <Input
                id="profile-name"
                autoComplete="name"
                invalid={Boolean(profileForm.formState.errors.fullName)}
                {...profileForm.register('fullName')}
              />
            </Field>

            <Field
              label="Email"
              htmlFor="profile-email"
              description="L'indirizzo di accesso non è modificabile dall'applicazione."
            >
              <Input id="profile-email" value={email} readOnly disabled />
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={profileForm.formState.isSubmitting}
              disabled={!profileForm.formState.isDirty}
              className="self-start"
            >
              Salva modifiche
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Password" description="Almeno 8 caratteri." />
        <CardBody>
          <form onSubmit={onSavePassword} className="flex flex-col gap-4" noValidate>
            {passwordError ? <FormAlert>{passwordError}</FormAlert> : null}
            {passwordDone ? (
              <FormAlert tone="success">
                Password aggiornata. Resti collegato su questo dispositivo.
              </FormAlert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nuova password"
                htmlFor="new-password"
                error={passwordForm.formState.errors.password?.message}
                required
              >
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  invalid={Boolean(passwordForm.formState.errors.password)}
                  {...passwordForm.register('password')}
                />
              </Field>

              <Field
                label="Conferma password"
                htmlFor="confirm-password"
                error={passwordForm.formState.errors.confirmPassword?.message}
                required
              >
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  invalid={Boolean(passwordForm.formState.errors.confirmPassword)}
                  {...passwordForm.register('confirmPassword')}
                />
              </Field>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={passwordForm.formState.isSubmitting}
              className="self-start"
            >
              Aggiorna password
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Sessione e appartenenze"
          description={`Il tuo account fa parte di ${organizationCount} ${organizationCount === 1 ? 'organizzazione' : 'organizzazioni'}.`}
        />
        <CardBody className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="md"
            icon={<LogOut />}
            onClick={() => void signOut()}
          >
            Esci da Work-Hub
          </Button>
          <Button
            variant="destructive-outline"
            size="md"
            onClick={() => setConfirmLeave(true)}
          >
            Esci da questa organizzazione
          </Button>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Uscire da questa organizzazione?"
        description="Perderai l'accesso ai suoi dati. Un proprietario potrà invitarti di nuovo. Se sei l'unico proprietario, l'operazione verrà rifiutata."
        confirmLabel="Esci dall'organizzazione"
        onConfirm={async () => {
          const result = await leaveOrganization()
          setConfirmLeave(false)
          if (!result.ok) {
            notify.error(result.error)
            return
          }
          notify.success('Hai lasciato l’organizzazione')
          router.replace('/onboarding')
        }}
      />
    </div>
  )
}
