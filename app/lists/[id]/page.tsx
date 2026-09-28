import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

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
      .select('added_at, movie:movies(id, title, release_year, genre, language, poster_url, average_rating, review_count)')
      .eq('list_id', id)
      .order('added_at', { ascending: false }),
  ])

  const movies = (items || []).map((i: any) => i.movie).filter(Boolean)
  const creator  = profileData?.display_name || profileData?.username || 'MuvieStars member'
  const username = profileData?.username
  const initial  = creator.charAt(0).toUpperCase()

  const createdYear = new Date(list.created_at).getFullYear()

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '760px' }}>

              {/* Creator + visibility */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {username ? (
                  <Link
                    href={`/u/${username}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                  >
                    {profileData?.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt={creator}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'rgba(200,150,62,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        ...MONO, fontSize: '12px', fontWeight: 700, color: '#C8963E',
                      }}>
                        {initial}
                      </div>
                    )}
                    <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                      by {creator}
                    </span>
                  </Link>
                ) : (
                  <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>by {creator}</span>
                )}

                {!list.is_public && (
                  <span style={{
                    height: '22px', padding: '0 10px', borderRadius: '999px',
                    background: 'rgba(106,98,88,0.15)', color: '#6A6258',
                    ...MONO, fontSize: '11px', fontWeight: 600,
                    display: 'inline-flex', alignItems: 'center',
                  }}>
                    Private
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 style={{
                ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,80px)',
                lineHeight: '0.95', color: '#F6EFE2', margin: 0,
              }}>
                {list.name}
              </h1>

              {/* Description */}
              {list.description && (
                <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.55', color: '#8C857A', maxWidth: '580px' }}>
                  {list.description}
                </p>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...MONO, fontSize: '13px', color: '#6A6258' }}>
                  {movies.length} {movies.length === 1 ? 'film' : 'films'}
                </span>
                <span style={{ ...MONO, fontSize: '13px', color: '#6A6258' }}>
                  {createdYear}
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* ── FILMS ───────────────────────────────────────────────────── */}
        <section className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
          {movies.length === 0 ? (
            <div style={{
              padding: '64px 24px', borderRadius: '20px',
              border: '1px solid rgba(237,228,210,0.06)',
              textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
            }}>
              <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>
                No films in this list yet.
              </p>
              {isOwner && (
                <Link
                  href="/browse"
                  style={{
                    height: '44px', padding: '0 20px', borderRadius: '12px',
                    background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
                    color: '#C8963E', fontSize: '14px', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center',
                    fontFamily: '"Geist Mono", monospace', fontWeight: 600,
                  }}
                >
                  Browse films to add
                </Link>
              )}
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '20px',
            }}>
              {movies.map((movie: any) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  {/* Poster */}
                  <div style={{
                    aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden',
                    background: '#15120E', position: 'relative',
                  }}>
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px', opacity: 0.2,
                      }}>
                        🎬
                      </div>
                    )}

                    {/* Rating badge */}
                    {movie.average_rating > 0 && (
                      <div style={{
                        position: 'absolute', top: '8px', right: '8px',
                        height: '24px', padding: '0 8px', borderRadius: '999px',
                        background: 'rgba(11,10,9,0.75)',
                        ...MONO, fontSize: '11px', fontWeight: 700, color: '#C8963E',
                        display: 'flex', alignItems: 'center',
                      }}>
                        {movie.average_rating.toFixed(1)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <p style={{
                      margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0',
                      lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {movie.title}
                    </p>
                    <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                      {movie.release_year}{movie.genre ? ` · ${movie.genre}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer />
    </>
  )
}
