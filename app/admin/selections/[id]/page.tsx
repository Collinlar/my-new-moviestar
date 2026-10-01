import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { SelectionEditor } from '@/components/admin/SelectionEditor'
import { SELECTION_COLUMNS } from '@/lib/selections'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminSelectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { supabase } = await requireAdmin()

  const { data: selection } = await (supabase as any)
    .from('selections')
    .select(`${SELECTION_COLUMNS}, selection_items(position, note, movie:movies(id, title, release_year, poster_url, listing_status, why_listed))`)
    .eq('id', id)
    .maybeSingle()
  if (!selection) notFound()

  return (
    <div className="p-8">
      <Link href="/admin/selections" className="text-sm text-film-muted">← All selections</Link>
      <h1 className="text-2xl font-bold text-film-cream mt-3 mb-8">{selection.title}</h1>
      <SelectionEditor selection={selection} />
    </div>
  )
}
