import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Film, List, Lock } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient() as any
  const { data: list } = await supabase
    .from('movie_lists')
    .select('name, description, is_public, user_id')
    .eq('id', id)
    .single()

  if (!list || !list.is_public) return { title: 'List — MuvieStars' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name')
    .eq('user_id', list.user_id)
    .single()

  const creator = profile?.display_name || profile?.username || 'MuvieStars member'
  return {
    title: `${list.name} — ${creator} on MuvieStars`,
    description: list.description || `A curated list of African films by ${creator}.`,
    alternates: { canonical: `${SITE_URL}/lists/${id}` },
  }
}

export const dynamic = 'force-dynamic'

export default async function ListPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient() as any

  const { data: list } = await supabase
    .from('movie_lists')
    .select('id, name, description, is_public, created_at, user_id')
    .eq('id', id)
    .single()

  if (!list) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === list.user_id

  if (!list.is_public && !isOwner) notFound()

  const [{ data: profileData }, { data: items }] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('user_id', list.user_id)
      .single(),

    supabase
      .from('movie_list_items')
      .select(`
        added_at,
        movie:movies(id, title, release_year, genre, language, poster_url, average_rating, review_count)
      `)
      .eq('list_id', id)
      .order('added_at', { ascending: false }),
  ])

  const movies = (items || []).map((i: any) => i.movie).filter(Boolean)
  const creator = profileData?.display_name || profileData?.username || 'MuvieStars member'
  const username = profileData?.username

  return (
    <>
      <Navigation />

      <main className="pt-16 min-h-screen">

        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <section className="py-12 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container max-w-4xl">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-cinema-surface border border-cinema-border flex items-center justify-center flex-shrink-0">
                {list.is_public
                  ? <List className="w-5 h-5 text-film-gold" aria-hidden="true" />
                  : <Lock className="w-5 h-5 text-film-subtle" aria-hidden="true" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-film-cream leading-tight">{list.name}</h1>

                {list.description && (
                  <p className="text-sm text-film-muted mt-2 max-w-xl leading-relaxed">
                    {list.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <span className="text-sm text-film-muted">
                    <span className="text-film-cream font-semibold">{movies.length}</span>
                    {' '}{movies.length === 1 ? 'film' : 'films'}
                  </span>

                  {username ? (
                    <Link
                      href={`/u/${username}`}
                      className="flex items-center gap-2 text-sm text-film-muted hover:text-film-cream transition-colors"
                    >
                      {profileData?.avatar_url ? (
                        <img
                          src={profileData.avatar_url}
                          alt={creator}
                          className="w-5 h-5 rounded-full object-cover border border-cinema-border"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-cinema-surface border border-cinema-border flex items-center justify-center text-[10px] font-bold text-film-gold">
                          {creator.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span>by {creator}</span>
                    </Link>
                  ) : (
                    <span className="text-sm text-film-muted">by {creator}</span>
                  )}


                  {!list.is_public && (
                    <span className="flex items-center gap-1 text-xs text-film-subtle">
                      <Lock className="w-3 h-3" aria-hidden="true" />
                      Private
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── MOVIES ─────────────────────────────────────────────── */}
        <section className="section-container max-w-4xl py-10">
          {movies.length === 0 ? (
            <div className="text-center py-20 border border-cinema-border rounded-xl">
              <Film className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-film-muted text-sm">No films in this list yet.</p>
              {isOwner && (
                <Link href="/browse" className="btn-gold text-sm mt-4 inline-flex">
                  Browse films to add
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {movies.map((movie: any) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  release_year={movie.release_year}
                  genre={movie.genre}
                  language={movie.language}
                  poster_url={movie.poster_url}
                  average_rating={movie.average_rating}
                  review_count={movie.review_count}
                />
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer />
    </>
  )
}
