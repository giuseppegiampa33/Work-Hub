'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { requestPasswordReset } from '@/features/auth/actions'
import { requestPasswordResetSchema } from '@/features/auth/schemas'
import { AuthFooterLink, AuthHeading, FormAlert } from '@/components/app/auth-form'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type FormValues = z.input<typeof requestPasswordResetSchema>

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const result = await requestPasswordReset(values)
    if (!result.ok) {
      setFormError(result.error)
      return
    }
    setSent(true)
  })

  return (
    <>
      <AuthHeading
        title="Recupera la password"
        description="Inserisci l'indirizzo del tuo account: ti invieremo un link per impostare una nuova password."
      />

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError ? <FormAlert>{formError}</FormAlert> : null}
        {sent ? (
          <FormAlert tone="success">
            Se esiste un account con questo indirizzo, il link è in arrivo. Il link resta valido per
            un&apos;ora.
          </FormAlert>
        ) : null}

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

        <Button
          type="submit"
          variant="primary"
          size="block"
          loading={form.formState.isSubmitting}
          className="mt-1"
        >
          {sent ? 'Invia di nuovo' : 'Invia il link'}
        </Button>
      </form>

      <AuthFooterLink>
        <Link href="/login" className="font-medium text-brand-text underline-offset-2 hover:underline">
          Torna all&apos;accesso
        </Link>
      </AuthFooterLink>
    </>
  )
}
