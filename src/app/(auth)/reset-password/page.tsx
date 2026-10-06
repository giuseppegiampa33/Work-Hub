import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = { title: 'Nuova password' }

/**
 * Reached from the recovery email through `/auth/callback`, which has already
 * exchanged the token for a session. Without that session the form says so
 * instead of silently failing on submit.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
