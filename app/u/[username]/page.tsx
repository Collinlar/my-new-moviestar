import type { Metadata } from 'next'
import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/utils'
import { getLaurels } from '@/lib/challenges'
import { formatDay } from '@/lib/challenges-shared'
import { PosterImg } from '@/components/PosterImg'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} — MuvieStars`,
    description: `Reviews and film ratings by @${username} on MuvieStars, Africa's movie database.`,
    alternates: { canonical: `${SITE_URL}/u/${username}` },
  }
}

export const dynamic = 'force-dynamic'

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient() as any

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, username, bio, avatar_url, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [{ data: reviews }, { data: publicLists }, laurels] = await Promise.all([
    supabase
      .from('reviews')
      .select('id, rating, content, created_at, helpful_count, movie:movies(id, title, release_year, poster_url, genre)')
      .eq('user_id', profile.user_id)
      .eq('status', 'approved')
      .order('helpful_count', { ascending: false })
      .limit(50),

    supabase
      .from('movie_lists')
      .select('id, name, description, created_at')
      .eq('user_id', profile.user_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20),

    getLaurels(profile.user_id).catch(() => []),
  ])

  const reviewList  = (reviews as any[]) || []
  const lists       = (publicLists as any[]) || []
  const displayName = profile.display_name || `@${profile.username}`
  const initial     = displayName.charAt(0).toUpperCase()
  const joinedDate  = new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  const SECTION: React.CSSProperties = {
    borderTop: '1px solid rgba(237,228,210,0.06)',
    paddingTop: '64px',
    paddingBottom: '64px',
  }

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ─── PROFILE HEADER ─────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>

              {/* Avatar */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(200,150,62,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  ...SERIF, fontSize: '32px', color: '#C8963E',
                }}>
                  {initial}
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                    {displayName}
                  </h1>
                  <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: '4px 0 0' }}>@{profile.username}</p>
                </div>

                {profile.bio && (
                  <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.55', color: '#8C857A', maxWidth: '560px' }}>
                    {profile.bio}
                  </p>
                )}

                {/* Stats */}
                <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', paddingTop: '4px' }}>
                  <div>
                    <span style={{ ...SERIF, fontSize: '24px', color: '#F6EFE2' }}>{reviewList.length}</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>
                      {reviewList.length === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                  {lists.length > 0 && (
                    <div>
                      <span style={{ ...SERIF, fontSize: '24px', color: '#F6EFE2' }}>{lists.length}</span>
                      <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>
                        {lists.length === 1 ? 'list' : 'lists'}
                      </span>
                    </div>
                  )}
                  <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', alignSelf: 'center' }}>
                    Member since {joinedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── LAURELS ────────────────────────────────────────────────── */}
        {laurels.length > 0 && (
          <section style={SECTION}>
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 24px' }}>
                Laurels
              </p>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                {laurels.map((l) => (
                  <li key={l.id}>
                    <NavLink
                      href={`/challenges/${l.challenge.slug}`}
                      style={{ padding: '18px 22px', borderRadius: '14px', background: '#0F0D0B', border: '1px solid rgba(200,150,62,0.3)', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '4px', minHeight: '44px' }}
                    >
                      <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8963E' }}>Challenge completed</span>
                      <span style={{ ...SERIF, fontSize: '24px', lineHeight: 1.1, color: '#F6EFE2' }}>{l.challenge.title}</span>
                      <span style={{ fontSize: '13px', color: '#6A6258' }}>{formatDay(l.completed_at)}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ─── LISTS ──────────────────────────────────────────────────── */}
        {lists.length > 0 && (
          <section style={SECTION}>
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 24px' }}>
                Lists
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {lists.map((list: any) => (
                  <Link
                    key={list.id}
                    href={`/lists/${list.id}`}
                    style={{
                      padding: '20px 24px', borderRadius: '14px',
                      background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)',
                      textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '6px',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#F6EFE2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {list.name}
                    </p>
                    {list.description && (
                      <p style={{ margin: 0, fontSize: '13px', color: '#6A6258', lineHeight: '1.45', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {list.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── REVIEWS ────────────────────────────────────────────────── */}
        <section style={SECTION}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}>
              Reviews
            </p>

            {reviewList.length === 0 ? (
              <div style={{
                padding: '56px 24px', borderRadius: '20px',
                border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center',
                display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
              }}>
                <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>
                  {displayName} {profile.display_name ? "hasn't" : "haven't"} published any reviews yet.
                </p>
                <NavLink button pendingLabel="Opening the archive..."
                  href="/browse"
                  style={{
                    height: '44px', padding: '0 20px', borderRadius: '12px',
                    border: '1px solid rgba(237,228,210,0.12)', color: '#EDE4D2',
                    fontSize: '14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                    ...MONO,
                  }}
                >
                  Browse films
                </NavLink>
              </div>
            ) : (
              <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reviewList.map((review: any) => (
                  <article
                    key={review.id}
                    style={{
                      padding: '20px 24px', borderRadius: '16px',
                      background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)',
                      display: 'flex', gap: '18px',
                    }}
                    itemScope
                    itemType="https://schema.org/Review"
                  >
                    {/* Poster */}
                    <Link href={`/movie/${review.movie?.id}`} style={{ flexShrink: 0 }} tabIndex={-1} aria-hidden="true">
                      {review.movie?.poster_url ? (
                        <PosterImg
                          role="tiny"
                          film={review.movie}
                          alt={review.movie?.title}
                          style={{ width: '44px', height: '62px', borderRadius: '8px', objectFit: 'cover', display: 'block' }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{
                          width: '44px', height: '62px', borderRadius: '8px',
                          background: '#15120E',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', opacity: 0.3,
                        }}>🎬</div>
                      )}
                    </Link>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div>
                          <Link
                            href={`/movie/${review.movie?.id}`}
                            style={{ fontSize: '14px', fontWeight: 600, color: '#EDE4D2', textDecoration: 'none' }}
                            itemProp="itemReviewed"
                            itemScope
                            itemType="https://schema.org/Movie"
                          >
                            <span itemProp="name">{review.movie?.title}</span>
                          </Link>
                          <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>
                            ({review.movie?.release_year})
                          </span>
                        </div>

                        {/* Stars */}
                        <div
                          style={{ display: 'flex', gap: '2px', flexShrink: 0 }}
                          itemProp="reviewRating"
                          itemScope
                          itemType="https://schema.org/Rating"
                        >
                          <meta itemProp="ratingValue" content={String(review.rating)} />
                          <meta itemProp="bestRating" content="5" />
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              aria-hidden="true"
                              style={{ fontSize: '13px', color: i < review.rating ? '#C8963E' : 'rgba(237,228,210,0.12)' }}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </div>

                      {review.content && (
                        <p
                          style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#A39B8F', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                          itemProp="reviewBody"
                        >
                          {review.content}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                        <time
                          style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}
                          dateTime={review.created_at}
                          itemProp="datePublished"
                        >
                          {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </time>
                        {review.helpful_count > 0 && (
                          <span style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}>
                            {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
