import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { DeckEditor } from '@/components/admin/DeckEditor'
import { DECK_COLUMNS } from '@/lib/decks'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { supabase } = await requireAdmin()

  const { data: deck } = await (supabase as any)
    .from('decks')
    .select(`${DECK_COLUMNS}, deck_items(position, note, movie:movies(id, title, release_year, poster_url, listing_status))`)
    .eq('id', id)
    .maybeSingle()
  if (!deck) notFound()

  return (
    <div className="p-8">
      <Link href="/admin/decks" className="text-sm text-film-muted">← All decks</Link>
      <h1 className="text-2xl font-bold text-film-cream mt-3 mb-8">{deck.title}</h1>
      <DeckEditor deck={deck} />
    </div>
  )
}
