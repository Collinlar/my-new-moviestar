import { createClient } from '@/lib/supabase/server'
import { createStaticClient } from '@/lib/supabase/static'

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
  full_name: string
  bio?: string
  profile_image?: string
  country?: string
  birth_year?: number
  verified?: boolean
  imdb_id?: string
  website?: string
}

export async function getFeaturedMovies(limit = 6): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .eq('featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as Movie[]) || []
}

export async function getTrendingMovies(limit = 8): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data, error } = await supabase.rpc('get_trending_movies')
  if (error || !data) {
    const { data: fallback } = await supabase
      .from('movies')
      .select('*, creator:creators(id, name, image_url)')
      .order('review_count', { ascending: false })
      .limit(limit)
    return (fallback as Movie[]) || []
  }
  return ((data as Movie[]) || []).slice(0, limit)
}

export async function getCanonMovies(limit = 8): Promise<Movie[]> {
  const supabase = await createClient() as any
  const { data } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .eq('is_canon', true)
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
    .select('id, role, character_name, department, billing_order, person:people(id, full_name, profile_image)')
    .eq('movie_id', movieId)
    .order('billing_order', { ascending: true })
  return data || []
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
  const { data } = await supabase
    .from('movies')
    .select('*, creator:creators(id, name, image_url)')
    .lte('release_year', 2000)
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

export async function getMovieVerdict(movieId: string): Promise<MovieVerdict | null> {
  try {
    const supabase = await createClient() as any

    const { data: reactions } = await supabase
      .from('movie_reactions')
      .select(`
        id,
        reaction,
        movie_reaction_tags (
          reaction_tags ( slug, label )
        )
      `)
      .eq('movie_id', movieId)
      .eq('status', 'published')

    if (!reactions || reactions.length === 0) return null

    const total = reactions.length
    const breakdown = { loved: 0, liked: 0, okay: 0, not_for_me: 0 }
    const tagCounts: Record<string, { label: string; count: number }> = {}

    for (const r of reactions) {
      if (r.reaction in breakdown) {
        breakdown[r.reaction as keyof typeof breakdown]++
      }
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
        pct: Math.round((count / total) * 100),
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
