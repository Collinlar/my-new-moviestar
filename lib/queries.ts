import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'
import { cleanSearchTerm, isUuid, type Socials } from '@/lib/people'
import { onlyListed, type ListingStatus } from '@/lib/listing'

export interface StreamingLink {
  platform: string
  url: string
  free: boolean
}

export interface Movie {
  id: string
  title: string
  description: string
  synopsis?: string
  genre: string
  language: string
  industry?: string
  release_year: number
  poster_url: string
  youtube_url?: string
  average_rating: number
  review_count: number
  editor_note?: string
  director?: string
  producer?: string
  country?: string
  rating?: string
  tagline?: string
  keywords?: string
  cultural_context?: string
  original_title?: string
  production_company?: string
  distribution_status?: string
  streaming_links?: StreamingLink[]
  festivals?: string
  is_canon?: boolean
  featured?: boolean
  canon_essay?: string
  canon_essay_author?: string
  listing_status?: ListingStatus
  why_listed?: string | null
  creator?: { id: string; name: string; image_url?: string }
}

export interface Review {
  id: string
  movie_id: string
  user_id: string
  rating: number
  content: string
  created_at: string
  helpful_count?: number
  profile?: { username?: string; display_name?: string; avatar_url?: string }
}

export interface Creator {
  id: string
  name: string
  bio?: string
  image_url?: string
  movie_count?: number
}

export interface Person {
  id: string
  slug: string
  full_name: string
  bio?: string | null
  profile_image?: string | null
  country?: string | null
  date_of_birth?: string | null
  date_of_death?: string | null
  aliases?: string[]
  socials?: Socials
  verified?: boolean
  imdb_id?: string | null
  website?: string | null
  is_featured?: boolean
  updated_at?: string
}

// Explicit list so the public site never selects claimed_by (a user id).
export const PERSON_COLUMNS =
  'id, slug, full_name, bio, profile_image, country, date_of_birth, date_of_death, aliases, socials, verified, imdb_id, website, is_featured, updated_at'

export interface PersonCredit {
  role: string
  character_name: string | null
  billing_order: number | null
  movie: Pick<Movie, 'id' | 'title' | 'release_year' | 'genre' | 'poster_url' | 'average_rating' | 'review_count'>
}

export async function getFeaturedMovies(limit = 6): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await onlyListed(
    supabase
      .from('movies')
      .select('*, creator:creators(id, name, image_url)')
      .eq('featured', true),
  )
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as Movie[]) || []
}

export async function getTrendingMovies(limit = 8): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data, error } = await supabase.rpc('get_trending_movies')
  if (error || !data) {
    const { data: fallback } = await onlyListed(
      supabase
        .from('movies')
        .select('*, creator:creators(id, name, image_url)'),
    )
      .order('review_count', { ascending: false })
      .limit(limit)
    return (fallback as Movie[]) || []
  }
  // The trending function predates listing statuses, so keep only listed films.
  const trending = (data as Movie[]) || []
  if (trending.length === 0) return []
  const { data: listed } = await onlyListed(
    supabase.from('movies').select('id').in('id', trending.map((m) => m.id)),
  )
  const listedIds = new Set(((listed as { id: string }[]) || []).map((m) => m.id))
  return trending.filter((m) => listedIds.has(m.id)).slice(0, limit)
}

export async function getCanonMovies(limit = 8): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await onlyListed(
    supabase
      .from('movies')
      .select('*, creator:creators(id, name, image_url)')
      .eq('is_canon', true),
  )
    .order('release_year', { ascending: true })
    .limit(limit)
  return (data as Movie[]) || []
}

export async function getMovieById(id: string): Promise<Movie | null> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .eq('id', id)
    .single()
  return data as Movie | null
}

export async function getMovieReviews(movieId: string, limit = 10): Promise<Review[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('reviews')
    .select('*, profile:profiles(username, display_name, avatar_url)')
    .eq('movie_id', movieId)
    .eq('status', 'approved')
    .order('helpful_count', { ascending: false })
    .limit(limit)
  return (data as Review[]) || []
}

export async function getMovieCast(movieId: string) {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movie_people')
    .select('id, role, character_name, department, billing_order, person:people(id, slug, full_name, profile_image)')
    .eq('movie_id', movieId)
    .order('billing_order', { ascending: true })
  return data || []
}

/** Accepts a slug or, for old links, a UUID. */
export async function getPersonByRef(ref: string): Promise<Person | null> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('people')
    .select(PERSON_COLUMNS)
    .eq(isUuid(ref) ? 'id' : 'slug', ref)
    .maybeSingle()
  return (data as Person | null) ?? null
}

export async function getPersonCredits(personId: string): Promise<PersonCredit[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movie_people')
    .select('role, character_name, billing_order, movie:movies(id, title, release_year, genre, poster_url, average_rating, review_count)')
    .eq('person_id', personId)
  return ((data as PersonCredit[]) || []).filter(c => c.movie)
}

export async function searchPeople(q: string, limit = 12): Promise<Person[]> {
  const term = cleanSearchTerm(q)
  if (!term) return []
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('people')
    .select(PERSON_COLUMNS)
    .ilike('search_text', `%${term}%`)
    .order('is_featured', { ascending: false })
    .order('full_name', { ascending: true })
    .limit(limit)
  return (data as Person[]) || []
}

/** Profiles worth indexing: they have a bio or at least one credit. */
export async function getIndexablePeople(): Promise<Array<{ slug: string; updated_at: string }>> {
  const supabase = createStaticClient() as any
  const out: Array<{ slug: string; updated_at: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('people')
      .select('slug, bio, updated_at, credits:movie_people(count)')
      .order('slug')
      .range(from, from + 999)
    if (error || !data || data.length === 0) break
    for (const p of data as any[]) {
      if (p.bio || (p.credits?.[0]?.count ?? 0) > 0) out.push({ slug: p.slug, updated_at: p.updated_at })
    }
    if (data.length < 1000) break
  }
  return out
}

export async function getMovieAwards(movieId: string) {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movie_awards')
    .select('*')
    .eq('movie_id', movieId)
    .order('year', { ascending: false })
  return data || []
}

export async function getDbStats(): Promise<{ movieCount: number; reviewCount: number; countryCount: number; creatorCount: number }> {
  try {
    const supabase = await createClient() as any
    const [moviesRes, reviewsRes, countriesRes, creatorsRes] = await Promise.all([
      supabase.from('movies').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('movies').select('country').neq('country', null),
      supabase.from('creators').select('*', { count: 'exact', head: true }),
    ])
    const uniqueCountries = new Set(
      (countriesRes.data || [])
        .map((m: { country: string | null }) => m.country)
        .filter((c): c is string => !!c && c.trim() !== '')
    )
    return {
      movieCount:   moviesRes.count   || 0,
      reviewCount:  reviewsRes.count  || 0,
      countryCount: uniqueCountries.size,
      creatorCount: creatorsRes.count || 0,
    }
  } catch {
    return { movieCount: 0, reviewCount: 0, countryCount: 0, creatorCount: 0 }
  }
}

export async function browseMovies(opts: {
  genre?: string
  language?: string
  industry?: string
  country?: string
  yearFrom?: number
  yearTo?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}) {
  const supabase = await createClient() as any
  let query = supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)', { count: 'exact' })

  if (opts.genre)    query = query.eq('genre', opts.genre)
  if (opts.language) query = query.eq('language', opts.language)
  if (opts.industry) query = query.eq('industry', opts.industry)
  if (opts.country)  query = query.eq('country', opts.country)
  if (opts.yearFrom) query = query.gte('release_year', opts.yearFrom)
  if (opts.yearTo)   query = query.lte('release_year', opts.yearTo)
  if (opts.search) {
    query = query.or(
      `title.ilike.%${opts.search}%,description.ilike.%${opts.search}%`
    )
  }

  const col = opts.sortBy || 'created_at'
  const dir = { ascending: opts.sortOrder !== 'desc' }
  query = query.order(col, dir)

  if (opts.limit) query = query.limit(opts.limit)
  if (opts.offset) query = query.range(opts.offset, opts.offset + (opts.limit || 12) - 1)

  const { data, count } = await query
  return { movies: (data as Movie[]) || [], total: (count as number) || 0 }
}

export async function searchMovies(q: string, limit = 20): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,director.ilike.%${q}%,keywords.ilike.%${q}%`)
    .limit(limit)
  return (data as Movie[]) || []
}

export async function getOldButGoldMovies(limit = 6): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await onlyListed(
    supabase
      .from('movies')
      .select('*, creator:creators(id, name, image_url)')
      .lte('release_year', 2010),
  )
    .order('review_count', { ascending: false })
    .limit(limit)
  return (data as Movie[]) || []
}

export async function getTopCreators(limit = 8): Promise<Creator[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('creators')
    .select('*, movies(count)')
    .limit(limit)
  return (data as Creator[]) || []
}

export async function getCreatorById(id: string): Promise<Creator | null> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('creators')
    .select('*')
    .eq('id', id)
    .single()
  return data as Creator | null
}

export async function getCreatorMovies(creatorId: string): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .eq('creator_id', creatorId)
    .order('release_year', { ascending: false })
  return (data as Movie[]) || []
}

export async function getAllMovieIds(): Promise<string[]> {
  /* Uses the cookie-free static client — safe to call at build time */
  const supabase = createStaticClient() as any
  const { data } = await supabase
    .from('movies')
    .select('id')
    .order('created_at', { ascending: false })
  return (data || []).map((m: { id: string }) => m.id)
}

/** Films that belong in the sitemap. Rejected, archived and delisted films are left out. */
export async function getSitemapMovies(): Promise<Array<{ id: string; listing_status: ListingStatus; updated_at: string }>> {
  const supabase = createStaticClient() as any
  const out: Array<{ id: string; listing_status: ListingStatus; updated_at: string }> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('movies')
      .select('id, listing_status, updated_at')
      .not('listing_status', 'in', '(rejected,archived,delisted)')
      .order('created_at', { ascending: false })
      .range(from, from + 999)
    if (error || !data || data.length === 0) break
    out.push(...(data as typeof out))
    if (data.length < 1000) break
  }
  return out
}

export async function getAllCreatorIds(): Promise<string[]> {
  const supabase = createStaticClient() as any
  const { data } = await supabase.from('creators').select('id')
  return (data || []).map((c: { id: string }) => c.id)
}

export interface MovieVerdict {
  total:               number
  enjoyed_pct:         number
  reaction_breakdown:  { loved: number; liked: number; okay: number; not_for_me: number }
  top_tags:            { slug: string; label: string; count: number; pct: number }[]
  confidence:          'forming' | 'building' | 'confident'
}

export interface CommunityTake {
  user_id: string
  reaction: string
  rating: number | null
  quick_take: string
  name: string
}

/** Short one-line takes from viewers, most helpful first. Longer reviews are listed separately. */
export async function getCommunityTakes(movieId: string, limit = 6): Promise<CommunityTake[]> {
  try {
    const supabase = await createClient() as any
    const { data } = await supabase
      .from('takes')
      .select('user_id, reaction, rating, quick_take, helpful_count, updated_at')
      .eq('movie_id', movieId)
      .not('quick_take', 'is', null)
      .order('helpful_count', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(limit)
    const rows = (data ?? []) as Array<Omit<CommunityTake, 'name'>>
    if (rows.length === 0) return []

    const { data: people } = await supabase
      .from('public_profiles')
      .select('user_id, display_name')
      .in('user_id', rows.map((r) => r.user_id))
    const names = new Map(((people ?? []) as Array<{ user_id: string; display_name: string | null }>).map((p) => [p.user_id, p.display_name]))
    return rows.map((r) => ({ ...r, name: names.get(r.user_id) || 'A MuvieStars member' }))
  } catch {
    return []
  }
}

export async function getMovieVerdict(movieId: string): Promise<MovieVerdict | null> {
  try {
    const supabase = await createClient() as any

    // Every person counts once, whether they left a quick review, a full review or both.
    // Tags only exist on quick reviews, so they are counted against quick reviewers.
    const [{ data: takes }, { data: quick }] = await Promise.all([
      supabase.from('takes').select('reaction').eq('movie_id', movieId),
      supabase
        .from('movie_reactions')
        .select(`
          id,
          movie_reaction_tags (
            reaction_tags ( slug, label )
          )
        `)
        .eq('movie_id', movieId)
        .eq('status', 'published'),
    ])

    if (!takes || takes.length === 0) return null

    const total = takes.length
    const quickCount = Math.max(quick?.length ?? 0, 1)
    const breakdown = { loved: 0, liked: 0, okay: 0, not_for_me: 0 }
    const tagCounts: Record<string, { label: string; count: number }> = {}

    for (const t of takes as { reaction: string }[]) {
      if (t.reaction in breakdown) {
        breakdown[t.reaction as keyof typeof breakdown]++
      }
    }
    for (const r of (quick ?? []) as any[]) {
      for (const rt of r.movie_reaction_tags || []) {
        const tag = rt.reaction_tags as { slug: string; label: string } | null
        if (tag?.slug) {
          if (!tagCounts[tag.slug]) tagCounts[tag.slug] = { label: tag.label, count: 0 }
          tagCounts[tag.slug].count++
        }
      }
    }

    const enjoyed_pct = Math.round(((breakdown.loved + breakdown.liked) / total) * 100)
    const top_tags = Object.entries(tagCounts)
      .map(([slug, { label, count }]) => ({
        slug, label, count,
        pct: Math.round((count / quickCount) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    const confidence: MovieVerdict['confidence'] =
      total < 5 ? 'forming' : total < 20 ? 'building' : 'confident'

    return { total, enjoyed_pct, reaction_breakdown: breakdown, top_tags, confidence }
  } catch {
    return null
  }
}

export async function getCurrentClubCycle(): Promise<{ movie_id: string; title_override?: string } | null> {
  try {
    const supabase = await createClient() as any
    const { data } = await supabase
      .from('club_cycles')
      .select('movie_id, title_override')
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .gte('ends_at',   new Date().toISOString())
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  } catch {
    return null
  }
}

export async function getPreviousClubCycles(limit = 6): Promise<Array<{
  id: string; cycle_number: number; movie_id: string; starts_at: string; ends_at: string
}>> {
  try {
    const supabase = await createClient() as any
    const { data } = await supabase
      .from('club_cycles')
      .select('id, cycle_number, movie_id, starts_at, ends_at')
      .eq('status', 'completed')
      .order('ends_at', { ascending: false })
      .limit(limit)
    return data || []
  } catch {
    return []
  }
}
