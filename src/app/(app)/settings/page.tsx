import { redirect } from 'next/navigation'

/** `/settings` is a section index; the profile page is always reachable. */
export default function SettingsIndexPage() {
  redirect('/settings/profile')
}
