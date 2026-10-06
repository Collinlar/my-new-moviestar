import type { Metadata } from 'next'
import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { HelpfulButton } from '@/components/HelpfulButton'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Community Reviews of African Films',
  description:
    'Read the latest community reviews of African movies from MuvieStars members. Discover what people think about Nollywood, Ghallywood, and African cinema.',
  alternates: { canonical: `${SITE_URL}/all-reviews` },
}

export const revalidate = 1800

export default async function AllReviewsPage() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, content, created_at, helpful_count,
      movie:movies(id, title, release_year, genre, poster_url),
      profile:profiles(username, display_name, avatar_url)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(30)

  const reviewList = (reviews as any[]) || []

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
            <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                Community reviews
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}>
                What people are saying
              </h1>
              <p style={{ fontSize: '17px', lineHeight: '1.55', color: '#8C857A', margin: 0 }}>
                The latest thoughts from MuvieStars members on African cinema.
              </p>
            </div>
          </div>
        </section>

        {/* ── REVIEWS ───────────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
          {reviewList.length > 0 ? (
            <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  {review.movie?.poster_url && (
                    <Link href={`/movie/${review.movie.id}`} style={{ flexShrink: 0 }} tabIndex={-1} aria-hidden="true">
                      <img
                        src={review.movie.poster_url}
                        alt={review.movie.title}
                        style={{ width: '44px', height: '62px', borderRadius: '8px', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </Link>
                  )}

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      {/* Movie link */}
                      {review.movie && (
                        <div>
                          <Link
                            href={`/movie/${review.movie.id}`}
                            style={{ fontSize: '14px', fontWeight: 600, color: '#EDE4D2', textDecoration: 'none' }}
                            itemProp="itemReviewed"
                            itemScope
                            itemType="https://schema.org/Movie"
                          >
                            <span itemProp="name">{review.movie.title}</span>
                          </Link>
                          <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>
                            ({review.movie.release_year})
                          </span>
                        </div>
                      )}

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
                            style={{ fontSize: '12px', color: i < review.rating ? '#C8963E' : 'rgba(237,228,210,0.12)' }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Author + date */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}
                        itemProp="author"
                        itemScope
                        itemType="https://schema.org/Person"
                      >
                        by{' '}
                        {review.profile?.username ? (
                          <Link
                            href={`/u/${review.profile.username}`}
                            style={{ color: '#A39B8F', textDecoration: 'none' }}
                            itemProp="name"
                          >
                            {review.profile.display_name || review.profile.username}
                          </Link>
                        ) : (
                          <span itemProp="name">{review.profile?.display_name || 'Member'}</span>
                        )}
                      </span>
                      <time
                        style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}
                        dateTime={review.created_at}
                        itemProp="datePublished"
                      >
                        {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </time>
                    </div>

                    {review.content && (
                      <p
                        style={{ margin: '0 0 10px', fontSize: '14px', lineHeight: '1.6', color: '#A39B8F', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                        itemProp="reviewBody"
                      >
                        {review.content}
                      </p>
                    )}

                    <HelpfulButton reviewId={review.id} initialCount={review.helpful_count || 0} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{ padding: '80px 24px', borderRadius: '20px', border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '40px', opacity: 0.2 }} aria-hidden="true">💬</span>
              <div>
                <p style={{ ...SERIF, fontSize: '22px', color: '#F6EFE2', margin: '0 0 8px' }}>No reviews yet</p>
                <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>Be the first to review an African film.</p>
              </div>
              <NavLink button pendingLabel="Opening the archive..."
                href="/browse"
                style={{
                  height: '44px', padding: '0 24px', borderRadius: '12px',
                  background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
                  color: '#C8963E', fontSize: '14px', fontWeight: 600,
                  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', ...MONO,
                }}
              >
                Browse films to review
              </NavLink>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
