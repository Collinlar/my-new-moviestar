import { createClient } from '@/lib/supabase/server'
import { getCurrentClubCycle, getMovieById, type Movie } from '@/lib/queries'
import { cleanTitle } from '@/lib/data-quality'

/** Where a person is in this week's Club, from nothing yet to having said what they thought. */
export type ClubState = 'none' | 'watching' | 'seen' | 'took'

export interface ClubWeek {
  movie: Movie
  /** Whole days until the next pick, counting today. */
  daysLeft: number
  /** People who joined this week. */
  participantCount: number
  state: ClubState
}

const DAY = 86_400_000

/** The part of this week's Club that is the same for everyone: the film, the days left, how many have joined. */
export type ClubWeekPublic = Omit<ClubWeek, 'state'>

/** Days until the cycle ends. Falls back to the Monday-to-Sunday week when the cycle has no end date. */
export function daysUntil(endsAt?: string | null, now = new Date()): number {
  if (endsAt) return Math.max(1, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / DAY))
  const sinceMonday = (now.getDay() - 1 + 7) % 7
  return 7 - sinceMonday
}

/**
 * A film title split into the name and a long subtitle. Upload-style titles such as
 * "KETEKE (2017) - A Pregnant Woman, A Missed Train" read far better as a name plus a line under it.
 */
export function splitTitle(raw: string): { main: string; sub: string | null } {
  const clean = cleanTitle(raw).title || raw
  const m = clean.match(/^(.{2,40}?)\s+[-–—:]\s+(.{12,})$/)
  return m ? { main: m[1].trim(), sub: m[2].trim() } : { main: clean, sub: null }
}

/**
 * This week's Club pick and what the signed-in person has done with it. One place, so the homepage
 * and the Club page can never disagree about whether someone has joined.
 */
export async function getClubWeek(userId: string | null): Promise<ClubWeek | null> {
  const cycle = await getCurrentClubCycle()
  if (!cycle) return null
  const movie = await getMovieById(cycle.movie_id)
  if (!movie) return null

  const supabase = (await createClient()) as any
  let participantCount = 0
  let state: ClubState = 'none'
  try {
    const [{ count }, mine, take] = await Promise.all([
      supabase.from('club_participation').select('*', { count: 'exact', head: true }).eq('movie_id', movie.id).in('status', ['watching', 'completed']),
      userId ? supabase.from('club_participation').select('status').eq('movie_id', movie.id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
      userId ? supabase.from('takes').select('movie_id').eq('movie_id', movie.id).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null }),
    ])
    participantCount = (count as number) || 0
    const status = mine?.data?.status as string | undefined
    // Saying what you thought finishes the week, whether or not you ever tapped "I've seen it".
    state = take?.data ? 'took' : status === 'completed' ? 'seen' : status === 'watching' ? 'watching' : 'none'
  } catch {
    // The participation table may not exist yet. The pick still shows.
  }

  return { movie, daysLeft: daysUntil(cycle.ends_at), participantCount, state }
}

/**
 * The shared half of getClubWeek: no cookies and nothing about the visitor, so it can be fetched once and cached for the
 * homepage. Pair it with getClubState for someone who is signed in.
 */
export async function getClubWeekPublic(): Promise<ClubWeekPublic | null> {
  const cycle = await getCurrentClubCycle()
  if (!cycle) return null
  const movie = await getMovieById(cycle.movie_id)
  if (!movie) return null
  let participantCount = 0
  try {
    const supabase = (await createClient()) as any
    const { count } = await supabase.from('club_participation').select('*', { count: 'exact', head: true }).eq('movie_id', movie.id).in('status', ['watching', 'completed'])
    participantCount = (count as number) || 0
  } catch {
    // The participation table may not exist yet. The pick still shows.
  }
  return { movie, daysLeft: daysUntil(cycle.ends_at), participantCount }
}

/** Where this person is in the Club film: the other half of getClubWeek, two small queries about them alone. */
export async function getClubState(userId: string, movieId: string): Promise<ClubState> {
  try {
    const supabase = (await createClient()) as any
    const [mine, take] = await Promise.all([
      supabase.from('club_participation').select('status').eq('movie_id', movieId).eq('user_id', userId).maybeSingle(),
      supabase.from('takes').select('movie_id').eq('movie_id', movieId).eq('user_id', userId).maybeSingle(),
    ])
    const status = mine?.data?.status as string | undefined
    return take?.data ? 'took' : status === 'completed' ? 'seen' : status === 'watching' ? 'watching' : 'none'
  } catch {
    return 'none'
  }
}
