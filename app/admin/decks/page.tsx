import { requireAdmin } from '@/lib/admin'
import { DecksManager } from '@/components/admin/DecksManager'

export const dynamic = 'force-dynamic'

export default async function AdminDecksPage() {
  const { supabase } = await requireAdmin()

  const { data: decks } = await (supabase as any)
    .from('decks')
    .select('id, slug, title, kind, mood_slug, status, featured, sponsor_name, sort_order, deck_items(count)')
    .order('status', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Decks
          <span className="ml-2 text-base font-normal text-film-muted">({(decks ?? []).length})</span>
        </h1>
        <p className="mt-2 text-sm text-film-muted max-w-xl">
          A deck is a short, ordered set of listed films. Only films that have passed listing can go in. A sponsor name is shown on every page the deck appears on and never changes which films qualify.
        </p>
      </div>

      <DecksManager decks={(decks as any[]) ?? []} />
    </div>
  )
}
