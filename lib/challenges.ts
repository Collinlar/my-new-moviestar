import { createClient } from '@/lib/supabase/server'
import type { Movie } from '@/lib/queries'
import { challengeState, sponsorLabel } from '@/lib/challenges-shared'

export { sponsorLabel }

export type ChallengeKind = 'deck' | 'club_paired'

export interface Challenge {
  id: string
  slug: string
  title: string
  description: string | null
  kind: ChallengeKind
  deck_id: string
  club_cycle_id: string | null
  goal: number
  starts_at: string
  ends_at: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  sponsor_name: string | null
  sponsor_url: string | null
  sort_order: number
  published_at: string | null
}

export interface ChallengeSummary extends Challenge {
  deck: { slug: string; title: string }
  film_count: number
  posters: string[]
}

export interface ChallengeFilm {
  position: number
  note: string | null
  movie: Movie
}

export interface ChallengeDetail {
  challenge: Challenge
  deck: { slug: string; title: string }
  films: ChallengeFilm[]
  clubFilm: { cycleNumber: number; movie: Pick<Movie, 'id' | 'title' | 'poster_url' | 'release_year'> } | null
}

export const CHALLENGE_COLUMNS =
  'id, slug, title, description, kind, deck_id, club_cycle_id, goal, starts_at, ends_at, status, featured, sponsor_name, sponsor_url, sort_order, published_at'

/** Ended challenges stay listed for this long, then drop off the index (the page itself stays). */
const KEEP_ENDED_DAYS = 45

const listed = (items: any[] | null | undefined) =>
  ((items ?? []) as Array<{ position: number; note?: string | null; movie: any }>)
    .filter((i) => i.movie && i.movie.listing_status === 'approved')
    .sort((a, b) => a.position - b.position)

/** Published challenges whose deck is intact. Open ones first, then upcoming, then recently ended. */
export async function getPublishedChallenges(opts: { featuredOnly?: boolean; openOnly?: boolean; limit?: number; client?: any } = {}): Promise<ChallengeSummary[]> {
  const supabase = opts.client ?? ((await createClient()) as any)
  let query = supabase
    .from('challenges')
    .select(`${CHALLENGE_COLUMNS}, deck:decks(slug, title, status, kind, deck_items(position, movie:movies(id, poster_url, listing_status)))`)
    .eq('status', 'published')
  if (opts.featuredOnly) query = query.eq('featured', true)
  const { data, error } = await query.order('ends_at', { ascending: true }).limit(opts.limit ?? 50)
  if (error || !data) return []

  const now = new Date()
  const cutoff = now.getTime() - KEEP_ENDED_DAYS * 86_400_000
  const rank = { open: 0, upcoming: 1, ended: 2 }
  const out: ChallengeSummary[] = []
  for (const row of data as any[]) {
    const { deck, ...challenge } = row
    if (!deck || deck.status !== 'published' || deck.kind !== 'curated') continue
    const films = listed(deck.deck_items)
    if (films.length < challenge.goal) continue
    const state = challengeState(challenge, now)
    if (opts.openOnly && state === 'ended') continue
    if (state === 'ended' && new Date(challenge.ends_at).getTime() < cutoff) continue
    out.push({
      ...challenge,
      deck: { slug: deck.slug, title: deck.title },
      film_count: films.length,
      posters: films.map((f) => f.movie.poster_url).filter((p: string | null): p is string => !!p && /^https?:\/\//.test(p)).slice(0, 4),
    })
  }
  return out.sort((a, b) => rank[challengeState(a, now)] - rank[challengeState(b, now)] || +new Date(a.ends_at) - +new Date(b.ends_at))
}

/** A challenge with its deck films. Null when the challenge or its deck is not publicly available. */
export async function getChallengeBySlug(slug: string): Promise<ChallengeDetail | null> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('challenges')
    .select(`${CHALLENGE_COLUMNS}, deck:decks(slug, title, status, kind, deck_items(position, note, movie:movies(*))), club:club_cycles(cycle_number, movie:movies(id, title, poster_url, release_year))`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (!data) return null

  const { deck, club, ...challenge } = data as any
  if (!deck || deck.status !== 'published' || deck.kind !== 'curated') return null
  const films = listed(deck.deck_items).map((i) => ({ position: i.position, note: i.note ?? null, movie: i.movie as Movie }))
  // A deck that has lost films since publishing can no longer be finished, so the page is withdrawn.
  if (films.length < challenge.goal) return null
  return {
    challenge,
    deck: { slug: deck.slug, title: deck.title },
    films,
    clubFilm: club?.movie ? { cycleNumber: club.cycle_number, movie: club.movie } : null,
  }
}

export interface ChallengeProgress {
  joined: boolean
  /** Film ids the person has taken inside the window. */
  takenIds: string[]
  clubDone: boolean
  completion: { id: string; completed_at: string; shareToken: string | null } | null
}

export async function getChallengeProgress(userId: string, detail: ChallengeDetail): Promise<ChallengeProgress> {
  const supabase = (await createClient()) as any
  const { challenge, films, clubFilm } = detail
  const ids = [...films.map((f) => f.movie.id), ...(clubFilm ? [clubFilm.movie.id] : [])]

  const [{ data: join }, { data: takes }, { data: completion }] = await Promise.all([
    supabase.from('challenge_joins').select('joined_at').eq('challenge_id', challenge.id).eq('user_id', userId).maybeSingle(),
    supabase
      .from('takes')
      .select('movie_id')
      .eq('user_id', userId)
      .in('movie_id', ids)
      .gte('created_at', challenge.starts_at)
      .lte('created_at', challenge.ends_at),
    supabase.from('challenge_completions').select('id, completed_at').eq('challenge_id', challenge.id).eq('user_id', userId).maybeSingle(),
  ])

  const taken = new Set(((takes ?? []) as Array<{ movie_id: string }>).map((t) => t.movie_id))
  let shareToken: string | null = null
  if (completion) {
    const { data: card } = await supabase
      .from('share_cards')
      .select('share_token')
      .eq('object_type', 'challenge')
      .eq('object_id', completion.id)
      .eq('user_id', userId)
      .maybeSingle()
    shareToken = card?.share_token ?? null
  }

  return {
    joined: !!join,
    takenIds: films.filter((f) => taken.has(f.movie.id)).map((f) => f.movie.id),
    clubDone: !!clubFilm && taken.has(clubFilm.movie.id),
    completion: completion ? { id: completion.id, completed_at: completion.completed_at, shareToken } : null,
  }
}

/** Open challenges that use a deck, for the banner on the deck page. */
export async function getOpenChallengesForDeck(deckId: string): Promise<Array<Pick<Challenge, 'slug' | 'title' | 'goal' | 'starts_at' | 'ends_at' | 'sponsor_name'>>> {
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('challenges')
    .select('slug, title, goal, starts_at, ends_at, sponsor_name')
    .eq('deck_id', deckId)
    .eq('status', 'published')
    .gte('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true })
    .limit(3)
  return (data ?? []) as any[]
}

export interface Laurel {
  id: string
  completed_at: string
  challenge: { slug: string; title: string; sponsor_name: string | null }
}

/** Completed challenges for a profile, newest first. */
export async function getLaurels(userId: string, limit = 24): Promise<Laurel[]> {
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('challenge_completions')
    .select('id, completed_at, challenge:challenges(slug, title, sponsor_name, status)')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as any[]).filter((r) => r.challenge && r.challenge.status === 'published')
}
