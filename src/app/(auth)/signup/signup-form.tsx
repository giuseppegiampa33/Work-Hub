'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import type { z } from 'zod'
import { signUp } from '@/features/auth/actions'
import { signUpSchema } from '@/features/auth/schemas'
import { AuthFooterLink, AuthHeading, FormAlert } from '@/components/app/auth-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type FormValues = z.input<typeof signUpSchema>

export function SignupForm() {
  const router = useRouter()
  const [formError, setFormError] = React.useState<string | null>(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await signUp(values)

    if (!result.ok) {
      if (result.field === 'email' || result.field === 'password' || result.field === 'fullName') {
        form.setError(result.field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    if (result.data.needsEmailConfirmation) {
      setAwaitingConfirmation(values.email)
      return
    }

    router.replace('/onboarding')
  })

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-col gap-4">
        <span
          className="inline-flex size-9 items-center justify-center rounded-md border border-success-line bg-success-subtle text-success"
          aria-hidden
        >
          <MailCheck className="size-4" />
        </span>
        <AuthHeading
          title="Controlla la tua email"
          description={
            <>
              Abbiamo inviato un link di conferma a{' '}
              <strong className="font-medium text-fg">{awaitingConfirmation}</strong>. Aprilo per
              attivare l&apos;account e proseguire con la creazione dell&apos;organizzazione.
            </>
          }
        />
        <FormAlert tone="info">
          Se il link non arriva, verifica la cartella spam oppure chiedi all&apos;amministratore del
          progetto Supabase di disattivare la conferma email.
        </FormAlert>
        <AuthFooterLink>
          <Link
            href="/login"
            className="font-medium text-brand-text underline-offset-2 hover:underline"
          >
            Torna all&apos;accesso
          </Link>
        </AuthFooterLink>
      </div>
    )
  }

  return (
    <>
      <AuthHeading
        title="Crea un account"
        description="Un account personale può far parte di più organizzazioni. Dopo la registrazione potrai creare la tua o unirti con un invito."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <Field
          label="Nome e cognome"
          htmlFor="fullName"
          error={form.formState.errors.fullName?.message}
          required
        >
          <Input
            id="fullName"
            autoComplete="name"
            autoFocus
            placeholder="Mario Rossi"
            invalid={Boolean(form.formState.errors.fullName)}
            {...form.register('fullName')}
          />
        </Field>

        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nome@azienda.it"
            invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          description="Almeno 8 caratteri."
          error={form.formState.errors.password?.message}
          required
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            invalid={Boolean(form.formState.errors.password)}
            {...form.register('password')}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="block"
          loading={form.formState.isSubmitting}
          className="mt-1"
        >
          Crea account
        </Button>
      </form>

      <AuthFooterLink>
        Hai già un account?{' '}
        <Link href="/login" className="font-medium text-brand-text underline-offset-2 hover:underline">
          Accedi
        </Link>
      </AuthFooterLink>
    </>
  )
}
