'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { signIn } from '@/features/auth/actions'
import { credentialsSchema } from '@/features/auth/schemas'
import { AuthFooterLink, AuthHeading, FormAlert } from '@/components/app/auth-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type FormValues = z.input<typeof credentialsSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const linkError = searchParams.get('error')
  const nextParam = searchParams.get('next')
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await signIn(values)

    if (!result.ok) {
      if (result.field === 'email' || result.field === 'password') {
        form.setError(result.field, { message: result.error })
      } else {
        setFormError(result.error)
      }
      return
    }

    const destination = result.data.hasOrganization ? (nextParam ?? '/dashboard') : '/onboarding'
    router.replace(destination)
  })

  return (
    <>
      <AuthHeading
        title="Accedi"
        description="Usa le credenziali del tuo account personale. Potrai scegliere l'organizzazione dopo l'accesso."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {linkError ? <FormAlert tone="warning">{linkError}</FormAlert> : null}
        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message} required>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            placeholder="nome@azienda.it"
            invalid={Boolean(form.formState.errors.email)}
            {...form.register('email')}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
          required
          action={
            <Link
              href="/forgot-password"
              className="text-meta text-brand-text underline-offset-2 hover:underline"
            >
              Password dimenticata?
            </Link>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
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
          Accedi
        </Button>
      </form>

      <AuthFooterLink>
        Non hai un account?{' '}
        <Link href="/signup" className="font-medium text-brand-text underline-offset-2 hover:underline">
          Crea un account
        </Link>
      </AuthFooterLink>
    </>
  )
}
