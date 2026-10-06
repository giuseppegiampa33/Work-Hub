'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { updatePassword } from '@/features/auth/actions'
import { updatePasswordSchema } from '@/features/auth/schemas'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthFooterLink, AuthHeading, FormAlert } from '@/components/app/auth-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { notify } from '@/components/ui/toast'

type FormValues = z.input<typeof updatePasswordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [hasSession, setHasSession] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    void supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)))
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await updatePassword(values)
    if (!result.ok) {
      if (result.field === 'password' || result.field === 'confirmPassword') {
        form.setError(result.field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }
    notify.success('Password aggiornata')
    router.replace('/dashboard')
  })

  return (
    <>
      <AuthHeading
        title="Imposta una nuova password"
        description="Scegli una password di almeno 8 caratteri. Verrai riportato all'applicazione al salvataggio."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {hasSession === false ? (
          <FormAlert tone="warning">
            Questa pagina va aperta dal link ricevuto via email. Il link potrebbe essere scaduto:
            richiedine uno nuovo.
          </FormAlert>
        ) : null}
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <Field
          label="Nuova password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
        </Field>

        <Field
          label="Conferma password"
          htmlFor="confirmPassword"
          error={form.formState.errors.confirmPassword?.message}
          required
        >
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(form.formState.errors.confirmPassword)}
            {...form.register('confirmPassword')}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="block"
          loading={form.formState.isSubmitting}
          disabled={hasSession === false}
          className="mt-1"
        >
          Salva la password
        </Button>
      </form>

      <AuthFooterLink>
        <Link
          href="/forgot-password"
          className="font-medium text-brand-text underline-offset-2 hover:underline"
        >
          Richiedi un nuovo link
        </Link>
      </AuthFooterLink>
    </>
  )
}
