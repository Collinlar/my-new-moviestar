import { createClient } from '@/lib/supabase/server'
import { spreadByIndustry } from '@/lib/hero-deck'
import { onlyListed } from '@/lib/listing'
import type { Movie, Person } from '@/lib/queries'

type FilmCard = Pick<Movie, 'id' | 'title' | 'poster_url' | 'release_year' | 'country' | 'genre' | 'poster_focus_x' | 'poster_focus_y' | 'poster_color'> & { why_listed?: string | null }
const CARD = 'id, title, poster_url, release_year, country, genre, why_listed, average_rating, review_count'

/**
 * "Worth your time": listed films, with the ones an editor has written a reason for first,
 * then the best rated. Only listed films ever appear here.
 */
export async function getWorthYourTime(limit = 6): Promise<FilmCard[]> {
  const supabase = (await createClient()) as any
  const { data } = await onlyListed(supabase.from('movies').select(CARD))
    .order('review_count', { ascending: false })
    .order('release_year', { ascending: false })
    .limit(60)
  const films = ((data as Array<FilmCard & { average_rating: number; review_count: number }>) ?? [])
  return films
    .sort((a, b) =>
      Number(!!b.why_listed) - Number(!!a.why_listed) ||
      (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
      (b.review_count ?? 0) - (a.review_count ?? 0))
    .slice(0, limit)
}

/**
 * Films for the homepage swipe preview: listed, with a poster, the better-regarded ones, then spread across
 * industries and shuffled so each visit can open on different films. Only listed films ever appear here.
 */
export async function getHeroDeckPool(excludeId?: string | null, limit = 12): Promise<Array<FilmCard & { industry: string | null }>> {
  const supabase = (await createClient()) as any
  const pool = (columns: string) => onlyListed(supabase.from('movies').select(columns))
    .not('poster_url', 'is', null)
    .order('review_count', { ascending: false })
    .order('release_year', { ascending: false })
    .limit(60)
  // The focal point and colour columns arrive with the poster upload migration. Until it has run, fall back to the plain card.
  let { data, error } = await pool(CARD + ', industry, poster_focus_x, poster_focus_y, poster_color')
  if (error) ({ data } = await pool(CARD + ', industry'))
  const films = ((data ?? []) as Array<FilmCard & { industry: string | null; average_rating: number; review_count: number }>)
    .filter((f) => f.poster_url && f.id !== excludeId)
    .sort((a, b) =>
      Number(!!b.why_listed) - Number(!!a.why_listed) ||
      (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
      (b.review_count ?? 0) - (a.review_count ?? 0))
    .slice(0, 30)
  return spreadByIndustry(films, limit)
}

export async function getFeaturedPeople(limit = 8): Promise<Array<Pick<Person, 'id' | 'slug' | 'full_name' | 'profile_image' | 'country'>>> {
  const supabase = (await createClient()) as any
  const { data, error } = await supabase
    .from('people')
    .select('id, slug, full_name, profile_image, country')
    .eq('is_featured', true)
    .order('full_name', { ascending: true })
    .limit(limit)
  return error ? [] : (data ?? [])
}

/** Another listed film in the genre of the user's most recent "loved it", skipping anything they have already reacted to. */
export async function getBecauseYouLoved(userId: string, limit = 6): Promise<{ source: { id: string; title: string }; films: FilmCard[] } | null> {
  const supabase = (await createClient()) as any
  const [{ data: loved }, { data: mine }] = await Promise.all([
    supabase
      .from('movie_reactions')
      .select('movie:movies(id, title, genre, industry)')
      .eq('user_id', userId)
      .eq('status', 'published')
      .eq('reaction', 'loved')
      .order('updated_at', { ascending: false })
      .limit(1),
    supabase.from('movie_reactions').select('movie_id').eq('user_id', userId),
  ])
  const src = loved?.[0]?.movie as { id: string; title: string; genre: string | null; industry: string | null } | undefined
  if (!src?.genre) return null

  const exclude = new Set<string>([src.id, ...((mine ?? []) as Array<{ movie_id: string }>).map((m) => m.movie_id)])
  const { data: pool } = await onlyListed(supabase.from('movies').select(`${CARD}, industry`).eq('genre', src.genre))
    .order('review_count', { ascending: false })
    .limit(60)

  const films = ((pool ?? []) as Array<FilmCard & { industry: string | null }>)
    .filter((m) => !exclude.has(m.id))
    .sort((a, b) => Number(b.industry === src.industry) - Number(a.industry === src.industry))
    .slice(0, limit)

  return films.length > 0 ? { source: { id: src.id, title: src.title }, films } : null
}

/** Films the user marked "seen" while swiping but never reacted to. */
export async function getUnfinishedTitles(userId: string, limit = 6): Promise<FilmCard[]> {
  const supabase = (await createClient()) as any
  const [{ data: seen }, { data: reacted }] = await Promise.all([
    supabase
      .from('movie_interactions')
      .select('movie_id, created_at')
      .eq('user_id', userId)
      .eq('interaction_type', 'seen')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('movie_reactions').select('movie_id').eq('user_id', userId),
  ])
  const done = new Set(((reacted ?? []) as Array<{ movie_id: string }>).map((r) => r.movie_id))
  const ids = [...new Set(((seen ?? []) as Array<{ movie_id: string }>).map((s) => s.movie_id))].filter((id) => !done.has(id)).slice(0, limit)
  if (ids.length === 0) return []

  const { data } = await supabase.from('movies').select(CARD).in('id', ids)
  const byId = new Map(((data ?? []) as FilmCard[]).map((m) => [m.id, m]))
  return ids.map((id) => byId.get(id)).filter((m): m is FilmCard => !!m)
}

export interface RecentTake {
  id: string
  reaction: string
  rating: number | null
  one_liner: string | null
  movie: { id: string; title: string; poster_url: string | null; release_year: number | null }
  token: string | null
}

/** The user's latest takes, each with its share link when one exists. */
export async function getRecentTakes(userId: string, limit = 4): Promise<RecentTake[]> {
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('movie_reactions')
    .select('id, reaction, rating, one_liner, movie:movies(id, title, poster_url, release_year)')
    .eq('user_id', userId)
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(limit)
  const takes = ((data ?? []) as Array<Omit<RecentTake, 'token'>>).filter((t) => t.movie)
  if (takes.length === 0) return []

  const { data: cards } = await supabase
    .from('share_cards')
    .select('object_id, share_token')
    .eq('object_type', 'take')
    .in('object_id', takes.map((t) => t.id))
  const token = new Map(((cards ?? []) as Array<{ object_id: string; share_token: string }>).map((c) => [c.object_id, c.share_token]))
  return takes.map((t) => ({ ...t, token: token.get(t.id) ?? null }))
}
