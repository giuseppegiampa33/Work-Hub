import { redirect } from 'next/navigation'

/** The middleware sends anonymous traffic to `/login`; everyone else works here. */
export default function RootPage() {
  redirect('/dashboard')
}
