import { createClient } from '@/lib/supabase/server'
import type { Movie } from '@/lib/queries'
import type { MoodConfig } from '@/lib/mood'
import { TRANSITION_MIN_POOL } from '@/lib/listing'

// Films marked "haven't seen it" come back after this many days.
const UNSEEN_COOLOFF_DAYS = 14

// How strongly each reaction pulls a genre or industry up or down in your taste profile.
const REACTION_WEIGHT: Record<string, number> = {
  loved: 2,
  liked: 1,
  okay: 0,
  not_for_me: -1.5,
}

export interface PoolRow {
  id: string
  genre: string | null
  industry: string | null
  release_year: number | null
  review_count: number | null
  average_rating: number | null
  poster_url: string | null
  listing_status?: string | null
}

type Affinity = Record<string, number>

function buildAffinity(rows: Array<{ key: string | null; weight: number }>): Affinity {
  const sum: Record<string, number> = {}
  const n: Record<string, number> = {}
  for (const { key, weight } of rows) {
    if (!key) continue
    sum[key] = (sum[key] ?? 0) + weight
    n[key] = (n[key] ?? 0) + 1
  }
  const out: Affinity = {}
  // Dividing by n + 1 keeps one strong reaction from dominating the whole profile.
  for (const key of Object.keys(sum)) out[key] = sum[key] / (n[key] + 1)
  return out
}

async function loadHistory(supabase: any, userId: string) {
  const hard = new Set<string>()
  const soft = new Set<string>()
  const genreRows: Array<{ key: string | null; weight: number }> = []
  const industryRows: Array<{ key: string | null; weight: number }> = []

  try {
    const [reactions, watchlist, interactions] = await Promise.all([
      supabase
        .from('movie_reactions')
        .select('movie_id, reaction, movie:movies(genre, industry)')
        .eq('user_id', userId),
      supabase.from('watchlists').select('movie_id').eq('user_id', userId),
      supabase
        .from('movie_interactions')
        .select('movie_id, interaction_type, created_at')
        .eq('user_id', userId)
        .in('interaction_type', ['seen', 'unseen', 'not_interested']),
    ])

    for (const r of (reactions.data ?? []) as any[]) {
      hard.add(r.movie_id)
      const weight = REACTION_WEIGHT[r.reaction] ?? 0
      genreRows.push({ key: r.movie?.genre ?? null, weight })
      industryRows.push({ key: r.movie?.industry ?? null, weight })
    }
    for (const w of (watchlist.data ?? []) as any[]) hard.add(w.movie_id)

    const cutoff = Date.now() - UNSEEN_COOLOFF_DAYS * 86_400_000
    for (const i of (interactions.data ?? []) as any[]) {
      if (i.interaction_type === 'unseen') {
        if (new Date(i.created_at).getTime() > cutoff) soft.add(i.movie_id)
      } else {
        hard.add(i.movie_id)
      }
    }
  } catch {
    // Personalisation is a bonus. A failed lookup should still give a deck.
  }

  return {
    hard,
    soft,
    genreAffinity: buildAffinity(genreRows),
    industryAffinity: buildAffinity(industryRows),
    personalised: genreRows.length > 0,
  }
}

function applyMood(query: any, mood: MoodConfig) {
  const m = mood.query
  const matchers: string[] = []
  if (m.genres?.length) matchers.push(`genre.in.(${m.genres.join(',')})`)
  for (const term of m.terms ?? []) {
    for (const col of ['title', 'keywords', 'description']) matchers.push(`${col}.ilike.*${term}*`)
  }
  if (matchers.length) query = query.or(matchers.join(','))

  if (m.industries?.length) query = query.in('industry', m.industries)
  if (m.notIndustries?.length) {
    const list = m.notIndustries.map(i => `"${i}"`).join(',')
    query = query.or(`industry.is.null,industry.not.in.(${list})`)
  }
  if (m.yearFrom) query = query.gte('release_year', m.yearFrom)
  if (m.yearTo) query = query.lte('release_year', m.yearTo)
  return query
}

export interface History {
  hard: Set<string>
  soft: Set<string>
  genreAffinity: Affinity
  industryAffinity: Affinity
  personalised: boolean
}

const EMPTY_HISTORY: History = {
  hard: new Set(),
  soft: new Set(),
  genreAffinity: {},
  industryAffinity: {},
  personalised: false,
}

// Pure ranking step: returns the ids of the cards to show, in order.
export function rankDeck(
  pool: PoolRow[],
  history: History,
  mood: MoodConfig | null,
  limit: number,
  random: () => number = Math.random,
): string[] {
  let candidates = pool.filter(r => !history.hard.has(r.id) && !history.soft.has(r.id))
  if (candidates.length < limit) {
    // Not enough fresh films: let the recently skipped ones back in before running dry.
    candidates = pool.filter(r => !history.hard.has(r.id))
  }
  if (candidates.length === 0) return []

  const noise = mood?.query.explore !== undefined
    ? 0.5 + mood.query.explore * 2.5
    : history.personalised ? 1.6 : 2.4
  const moodGenres = mood?.query.genres ?? []

  const scored = candidates.map(r => {
    const popularity = Math.log1p(r.review_count ?? 0) * 0.6
    const rating = ((r.average_rating ?? 0) / 5) * 0.5
    const poster = r.poster_url?.startsWith('http') ? 0.4 : -1
    // Listed films always come before drafts (the bonus beats the largest random swing), so
    // drafts only fill the gaps when there are not enough listed films to build a deck.
    const listed = r.listing_status === 'approved' ? 3.5 : 0
    // A film tagged with the mood's own genre beats one that only mentions it in its text.
    const moodFit = r.genre && moodGenres.includes(r.genre) ? 1.5 : 0
    const taste =
      (r.genre ? history.genreAffinity[r.genre] ?? 0 : 0) * 0.8 +
      (r.industry ? history.industryAffinity[r.industry] ?? 0 : 0) * 0.5
    return { row: r, score: popularity + rating + poster + listed + moodFit + taste + random() * noise }
  })

  // Greedy pick with a small penalty for repeating a genre or industry already in the deck,
  // so a 30-card stack does not end up as 25 dramas from one industry.
  const picked: PoolRow[] = []
  const genreCount: Record<string, number> = {}
  const industryCount: Record<string, number> = {}
  const remaining = [...scored]

  while (picked.length < limit && remaining.length > 0) {
    let bestIdx = 0
    let bestScore = -Infinity
    for (let i = 0; i < remaining.length; i++) {
      const { row, score } = remaining[i]
      // Never spread away from the genre a mood is explicitly asking for.
      const wantedGenre = !!row.genre && moodGenres.includes(row.genre)
      const adjusted =
        score -
        (wantedGenre ? 0 : 0.12 * (genreCount[row.genre ?? ''] ?? 0)) -
        0.08 * (industryCount[row.industry ?? ''] ?? 0)
      if (adjusted > bestScore) { bestScore = adjusted; bestIdx = i }
    }
    const [{ row }] = remaining.splice(bestIdx, 1)
    picked.push(row)
    genreCount[row.genre ?? ''] = (genreCount[row.genre ?? ''] ?? 0) + 1
    industryCount[row.industry ?? ''] = (industryCount[row.industry ?? ''] ?? 0) + 1
  }

  return picked.map(p => p.id)
}

export async function getSwipeDeck(opts: {
  userId: string | null
  mood?: MoodConfig | null
  limit?: number
}): Promise<Movie[]> {
  const { userId, mood = null, limit = 30 } = opts
  const supabase = (await createClient()) as any

  // Decks draw from listed films. Until enough films are listed, drafts fill the gaps so the
  // product is not empty mid-triage. The threshold is on the whole catalogue, not the mood,
  // so once triage is done a small mood honestly runs out instead of quietly using drafts.
  const { count: listedCount } = await supabase
    .from('movies')
    .select('id', { count: 'exact', head: true })
    .eq('listing_status', 'approved')
  const statuses = (listedCount ?? 0) < TRANSITION_MIN_POOL ? ['approved', 'draft'] : ['approved']

  let poolQuery = supabase
    .from('movies')
    .select('id, genre, industry, release_year, review_count, average_rating, poster_url, listing_status')
    .in('listing_status', statuses)
    .limit(1000)
  if (mood) poolQuery = applyMood(poolQuery, mood)

  const [{ data: poolData }, history] = await Promise.all([
    poolQuery,
    userId ? loadHistory(supabase, userId) : Promise.resolve(EMPTY_HISTORY),
  ])

  const ids = rankDeck((poolData ?? []) as PoolRow[], history, mood, limit)
  if (ids.length === 0) return []

  const { data: full } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .in('id', ids)

  const byId = new Map<string, Movie>((full ?? []).map((m: Movie) => [m.id, m]))
  return ids.map(id => byId.get(id)).filter((m): m is Movie => !!m)
}
