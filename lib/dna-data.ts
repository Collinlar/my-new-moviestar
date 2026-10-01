import { computeDna, type Dna, type DnaTake } from '@/lib/dna'

// Reads the inputs for Movie DNA. Takes a Supabase client so the page (signed-in client) and the
// share image (public client) can both use it.

const chunk = <T,>(list: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export async function loadDnaTakes(supabase: any, userId: string): Promise<DnaTake[]> {
  const { data: takes } = await supabase
    .from('takes')
    .select('movie_id, reaction, rating')
    .eq('user_id', userId)
    .limit(1000)
  const rows = (takes ?? []) as Array<{ movie_id: string; reaction: string | null; rating: number | null }>
  if (rows.length === 0) return []

  const movieRows: any[] = []
  for (const ids of chunk(rows.map((r) => r.movie_id), 150)) {
    const { data } = await supabase
      .from('movies')
      .select('id, genre, industry, country, release_year, average_rating, review_count')
      .in('id', ids)
    movieRows.push(...(data ?? []))
  }
  const movies = new Map<string, any>(movieRows.map((m) => [m.id, m]))

  const { data: reactions } = await supabase
    .from('movie_reactions')
    .select('movie_id, movie_reaction_tags(reaction_tags(slug, label))')
    .eq('user_id', userId)
    .eq('status', 'published')
    .limit(1000)
  const tagsByMovie = new Map<string, Array<{ slug: string; label: string }>>()
  for (const r of (reactions ?? []) as any[]) {
    const tags = (r.movie_reaction_tags ?? []).map((t: any) => t.reaction_tags).filter(Boolean)
    tagsByMovie.set(r.movie_id, tags)
  }

  return rows.map((r) => {
    const m = movies.get(r.movie_id)
    return {
      reaction: r.reaction,
      rating: r.rating,
      genre: m?.genre ?? null,
      industry: m?.industry ?? null,
      country: m?.country ?? null,
      release_year: m?.release_year ?? null,
      community_avg: m?.average_rating ?? null,
      community_count: m?.review_count ?? null,
      tags: tagsByMovie.get(r.movie_id) ?? [],
    }
  })
}

export async function loadDna(supabase: any, userId: string): Promise<{ dna: Dna; takes: DnaTake[] }> {
  const takes = await loadDnaTakes(supabase, userId)
  return { dna: computeDna(takes), takes }
}

export interface BlindSpot {
  industry: string
  /** Listed films from this industry that the person has not taken. */
  listed: number
  deck: { slug: string; title: string } | null
}

/** An industry with a real body of listed films that the person has not touched yet. */
export async function findBlindSpot(supabase: any, takes: DnaTake[]): Promise<BlindSpot | null> {
  const seen = new Set(takes.map((t) => (t.industry ?? '').toLowerCase()))
  const { data: films } = await supabase
    .from('movies')
    .select('industry')
    .eq('listing_status', 'approved')
    .not('industry', 'is', null)
    .limit(1000)

  const counts = new Map<string, number>()
  for (const f of (films ?? []) as Array<{ industry: string }>) {
    if (!f.industry || f.industry.toLowerCase() === 'other') continue
    counts.set(f.industry, (counts.get(f.industry) ?? 0) + 1)
  }
  // Three listed films is the least that makes it worth pointing someone there.
  const pick = [...counts.entries()]
    .filter(([industry, n]) => n >= 3 && !seen.has(industry.toLowerCase()))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  if (!pick) return null
  const [industry, listed] = pick

  // If a published deck already has films from that industry, send them there to start.
  const { data: decks } = await supabase
    .from('decks')
    .select('slug, title, kind, deck_items(movie:movies(industry, listing_status))')
    .eq('status', 'published')
    .eq('kind', 'curated')
  let best: { slug: string; title: string; n: number } | null = null
  for (const d of (decks ?? []) as any[]) {
    const n = (d.deck_items ?? []).filter((i: any) => i.movie?.listing_status === 'approved' && i.movie?.industry === industry).length
    if (n >= 2 && (!best || n > best.n)) best = { slug: d.slug, title: d.title, n }
  }
  return { industry, listed, deck: best ? { slug: best.slug, title: best.title } : null }
}

/** The person's Movie DNA share card, made the first time they open their DNA. */
export async function ensureDnaCard(supabase: any, userId: string): Promise<string | null> {
  const { data: existing } = await supabase
    .from('share_cards')
    .select('share_token')
    .eq('object_type', 'dna')
    .eq('object_id', userId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing?.share_token) return existing.share_token

  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  const { data: made, error } = await supabase
    .from('share_cards')
    .insert({ object_type: 'dna', object_id: userId, user_id: userId, share_token: token })
    .select('share_token')
    .single()
  if (made?.share_token) return made.share_token
  if (error) {
    // Two tabs can race to make it. Take whichever one won.
    const { data: again } = await supabase
      .from('share_cards')
      .select('share_token')
      .eq('object_type', 'dna')
      .eq('object_id', userId)
      .eq('user_id', userId)
      .maybeSingle()
    return again?.share_token ?? null
  }
  return null
}

/** Has the person opened their DNA yet? Used to decide whether to nudge them. */
export async function hasSeenDna(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('share_cards')
    .select('id')
    .eq('object_type', 'dna')
    .eq('object_id', userId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}
