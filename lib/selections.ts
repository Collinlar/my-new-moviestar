import { createClient } from '@/lib/supabase/server'
import type { Movie } from '@/lib/queries'
import { MIN_SELECTION_FILMS, SELECTION_LABELS, periodLabel, type SelectionLabel } from '@/lib/selections-shared'

export { MIN_SELECTION_FILMS, SELECTION_LABELS, periodLabel }
export type { SelectionLabel }

export interface Selection {
  id: string
  slug: string
  title: string
  label: SelectionLabel
  intro: string | null
  period: string | null
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  published_at: string | null
}

export interface SelectionFilm {
  position: number
  note: string | null
  movie: Movie
}

export interface SelectionSummary extends Selection {
  film_count: number
  posters: string[]
}

export const SELECTION_COLUMNS = 'id, slug, title, label, intro, period, status, sort_order, published_at'

const listed = (items: any[] | null | undefined): SelectionFilm[] =>
  ((items ?? []) as Array<{ position: number; note: string | null; movie: Movie | null }>)
    .filter((i) => i.movie && i.movie.listing_status === 'approved')
    .sort((a, b) => a.position - b.position)
    .map((i) => ({ position: i.position, note: i.note, movie: i.movie as Movie }))

/** Published Selections that are worth showing, newest period first. */
export async function getPublishedSelections(opts: { limit?: number; client?: any } = {}): Promise<SelectionSummary[]> {
  const supabase = opts.client ?? ((await createClient()) as any)
  const { data, error } = await supabase
    .from('selections')
    .select(`${SELECTION_COLUMNS}, selection_items(position, movie:movies(id, poster_url, listing_status))`)
    .eq('status', 'published')
    .order('period', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .order('published_at', { ascending: false })
    .limit(opts.limit ?? 50)
  if (error || !data) return []

  const out: SelectionSummary[] = []
  for (const row of data as Array<Selection & { selection_items: any[] }>) {
    const { selection_items, ...selection } = row
    const films = listed(selection_items)
    if (films.length < MIN_SELECTION_FILMS) continue
    out.push({
      ...selection,
      film_count: films.length,
      posters: films.map((f) => f.movie.poster_url).filter((p): p is string => !!p && /^https?:\/\//.test(p)).slice(0, 4),
    })
  }
  return out
}

export async function getSelectionBySlug(slug: string): Promise<{ selection: Selection; films: SelectionFilm[] } | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('selections')
    .select(`${SELECTION_COLUMNS}, selection_items(position, note, movie:movies(*))`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return null
  const { selection_items, ...selection } = data as Selection & { selection_items: any[] }
  return { selection, films: listed(selection_items) }
}

/** The newest published Selection with enough films, with its films. For the homepage. */
export async function getCurrentSelection(): Promise<{ selection: Selection; films: SelectionFilm[] } | null> {
  const summaries = await getPublishedSelections({ limit: 10 })
  const top = summaries[0]
  if (!top) return null
  return getSelectionBySlug(top.slug)
}

/** Published Selections a film belongs to, for the mark on its page. */
export async function getSelectionsForMovie(movieId: string): Promise<Array<Pick<Selection, 'slug' | 'title' | 'label' | 'period'> & { note: string | null }>> {
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('selection_items')
    .select('note, selection:selections(slug, title, label, period, status)')
    .eq('movie_id', movieId)
    .limit(10)
  return ((data ?? []) as any[])
    .filter((r) => r.selection && r.selection.status === 'published')
    .map((r) => ({ slug: r.selection.slug, title: r.selection.title, label: r.selection.label, period: r.selection.period, note: r.note ?? null }))
    .sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))
}
