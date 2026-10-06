import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireOrgContext } from '@/lib/auth/guards'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ClientDetailView } from './client-detail-view'

export const metadata: Metadata = { title: 'Scheda cliente' }

/**
 * Client detail.
 *
 * The record is fetched on the server so the page has a title and content in
 * the first paint; the counts and the related lists hydrate on the client where
 * they can be refetched without reloading the page.
 */
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const context = await requireOrgContext()

  if (!context.can('clients:view')) notFound()

  const supabase = await createSupabaseServerClient()
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', context.organizationId)
    .eq('id', id)
    .maybeSingle()

  if (!client) notFound()

  return <ClientDetailView client={client} />
}
