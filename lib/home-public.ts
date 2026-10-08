import { unstable_cache } from 'next/cache'
import { getClubWeekPublic, type ClubWeekPublic } from '@/lib/club'
import { getCanonMovies, getOldButGoldMovies, type Movie } from '@/lib/queries'
import { getFeaturedPeople, getHeroDeckPool, getWorthYourTime } from '@/lib/home'
import { getPublishedDecks } from '@/lib/decks'
import { getPublishedChallenges } from '@/lib/challenges'
import { getCurrentSelection } from '@/lib/selections'
import { getPublicCycles } from '@/lib/awards'
import { loadSpotlightCandidates, type LiveSpotlight } from '@/lib/spotlight-data'
import { createStaticClient } from '@/lib/supabase/static'
import { getSupabaseUrl } from '@/lib/supabase/env'
import { withClient } from '@/lib/supabase/scope'

/** Everything on the homepage that is the same for every visitor. */
export interface HomePublic {
  club: ClubWeekPublic | null
  obg: Movie[]
  worth: Awaited<ReturnType<typeof getWorthYourTime>>
  deckPool: Awaited<ReturnType<typeof getHeroDeckPool>>
  canon: Movie[]
  people: Awaited<ReturnType<typeof getFeaturedPeople>>
  decks: Awaited<ReturnType<typeof getPublishedDecks>>
  challenges: Awaited<ReturnType<typeof getPublishedChallenges>>
  selection: Awaited<ReturnType<typeof getCurrentSelection>>
  honours: Awaited<ReturnType<typeof getPublicCycles>>
  /** Not "the live one": the page picks that on every visit, so a Spotlight starts and ends on the minute. */
  spotlights: LiveSpotlight[]
}

/**
 * Fetches the shared part of the homepage: fifteen small database calls, run together. A visitor's own cookies are not
 * involved (inside withClient the calls use a plain public client), which is what lets the result be cached.
 */
async function load(): Promise<HomePublic> {
  const client = createStaticClient()
  return withClient(client, async () => {
    const [club, obg, worth, deckPool, canon, people, decks, challenges, selection, honours, spotlights] = await Promise.all([
      getClubWeekPublic().catch(() => null),
      getOldButGoldMovies(6),
      getWorthYourTime(6),
      getHeroDeckPool(null, 14).catch(() => []),
      getCanonMovies(5),
      getFeaturedPeople(8),
      getPublishedDecks({ featuredOnly: true, limit: 3 }).catch(() => []),
      getPublishedChallenges({ featuredOnly: true, openOnly: true, limit: 2 }).catch(() => []),
      getCurrentSelection().catch(() => null),
      getPublicCycles(1).catch(() => []),
      loadSpotlightCandidates(client),
    ])
    return { club, obg, worth, deckPool, canon, people, decks, challenges, selection, honours, spotlights }
  })
}

const isBlank = (h: HomePublic) => !h.club && !h.obg.length && !h.worth.length && !h.canon.length && !h.decks.length && !h.deckPool.length

// Cached for a minute and shared by every visitor. The database is asked once a minute, not once per visit, so the
// homepage answers without waiting for it. The key carries the database address so two environments never share an answer.
const cached = unstable_cache(
  async () => {
    const home = await load()
    // A blank page usually means the database could not be reached. Do not keep that for a minute.
    if (isBlank(home)) throw new Error('home came back empty')
    return home
  },
  ['home-public-v1', getSupabaseUrl()],
  { revalidate: 60, tags: ['home'] },
)

/**
 * The shared homepage data, from the cache when it is fresh. If the cache cannot be used (or the data came back blank),
 * it is fetched directly, which is exactly what the homepage did before.
 */
export async function getHomePublic(): Promise<HomePublic> {
  try {
    return await cached()
  } catch {
    return load()
  }
}
