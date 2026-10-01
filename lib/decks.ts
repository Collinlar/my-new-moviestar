import { createClient } from '@/lib/supabase/server'
import { MOOD_MAP, type MoodConfig } from '@/lib/mood'
import type { Movie } from '@/lib/queries'
import { MIN_DECK_FILMS, sponsorLabel } from '@/lib/decks-shared'

export { MIN_DECK_FILMS, sponsorLabel }

export type DeckKind = 'curated' | 'mood'
export type DeckStatus = 'draft' | 'published' | 'archived'

export interface Deck {
  id: string
  slug: string
  title: string
  description: string | null
  kind: DeckKind
  mood_slug: string | null
  status: DeckStatus
  featured: boolean
  sponsor_name: string | null
  sponsor_url: string | null
  sort_order: number
  published_at: string | null
}

export interface DeckFilm {
  position: number
  note: string | null
  movie: Movie
}

export interface DeckSummary extends Deck {
  /** Listed films in a curated deck. Null for a mood deck, whose films are picked by rule. */
  film_count: number | null
  posters: string[]
}

export const DECK_COLUMNS =
  'id, slug, title, description, kind, mood_slug, status, featured, sponsor_name, sponsor_url, sort_order, published_at'

export const DECK_CHIP = { bg: '#12242B', text: '#C8963E' }

/** Lets the swipe screen show a deck with the same header it uses for a mood. */
export function deckAsMood(d: Deck): MoodConfig {
  const tagline = sponsorLabel(d) ?? d.description ?? 'A hand-picked deck'
  return {
    slug: `deck-${d.slug}`,
    label: d.title,
    tagline: tagline.length > 80 ? `${tagline.slice(0, 77).trimEnd()}...` : tagline,
    chipBg: DECK_CHIP.bg,
    chipText: DECK_CHIP.text,
    query: {},
  }
}

const listedFilms = (items: any[] | null | undefined): DeckFilm[] =>
  ((items ?? []) as Array<{ position: number; note: string | null; movie: Movie | null }>)
    .filter((i) => i.movie && i.movie.listing_status === 'approved')
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ position: i.position, note: i.note, movie: i.movie as Movie }))

/** Published decks worth showing, featured first. Only listed films ever count toward a deck. */
export async function getPublishedDecks(opts: { featuredOnly?: boolean; limit?: number; client?: any } = {}): Promise<DeckSummary[]> {
  const supabase = opts.client ?? ((await createClient()) as any)
  let query = supabase
    .from('decks')
    .select(`${DECK_COLUMNS}, deck_items(position, note, movie:movies(id, title, poster_url, listing_status))`)
    .eq('status', 'published')
  if (opts.featuredOnly) query = query.eq('featured', true)

  const { data, error } = await query
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(opts.limit ?? 50)
  if (error || !data) return []

  const out: DeckSummary[] = []
  for (const row of data as Array<Deck & { deck_items: any[] }>) {
    const { deck_items, ...deck } = row
    if (deck.kind === 'mood') {
      if (!deck.mood_slug || !MOOD_MAP[deck.mood_slug]) continue
      out.push({ ...deck, film_count: null, posters: [] })
      continue
    }
    const films = listedFilms(deck_items)
    if (films.length < MIN_DECK_FILMS) continue
    out.push({
      ...deck,
      film_count: films.length,
      posters: films.map((f) => f.movie.poster_url).filter((p): p is string => !!p && /^https?:\/\//.test(p)).slice(0, 4),
    })
  }
  return out
}

export async function getDeckBySlug(slug: string): Promise<{ deck: Deck; films: DeckFilm[] } | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('decks')
    .select(`${DECK_COLUMNS}, deck_items(position, note, movie:movies(*))`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return null

  const { deck_items, ...deck } = data as Deck & { deck_items: any[] }
  if (deck.kind === 'mood' && (!deck.mood_slug || !MOOD_MAP[deck.mood_slug])) return null
  return { deck, films: deck.kind === 'mood' ? [] : listedFilms(deck_items) }
}
