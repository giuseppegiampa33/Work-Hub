import type { Metadata } from 'next'
import { SignupForm } from './signup-form'

export const metadata: Metadata = { title: 'Crea un account' }

export default function SignupPage() {
  return <SignupForm />
}
