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

export async function getDbStats(): Promise<{ movieCount: number; reviewCount: number; countryCount: number }> {
  try {
    const supabase = await createClient() as any
    const [moviesRes, reviewsRes, countriesRes] = await Promise.all([
      supabase.from('movies').select('*', { count: 'exact', head: true }),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('movies').select('country').neq('country', null),
    ])
    const uniqueCountries = new Set(
      (countriesRes.data || [])
        .map((m: { country: string | null }) => m.country)
        .filter((c): c is string => !!c && c.trim() !== '')
    )
    return {
      movieCount:   moviesRes.count  || 0,
      reviewCount:  reviewsRes.count || 0,
      countryCount: uniqueCountries.size,
    }
  } catch {
    return { movieCount: 0, reviewCount: 0, countryCount: 0 }
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
