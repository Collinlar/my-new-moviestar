import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getTrendingMovies } from '@/lib/queries'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, formatRating, capitalise } from '@/lib/utils'
import { PosterImg } from '@/components/PosterImg'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Trending African Movies This Week',
  description:
    'Discover the most-reviewed and highest-rated African movies trending right now. Updated weekly based on community reviews and watchlist activity.',
  alternates: { canonical: `${SITE_URL}/trending` },
}

export const revalidate = 3600

export default async function TrendingPage() {
  const movies = await getTrendingMovies(20)

  const crumbs = breadcrumbSchema([
    { name: 'Home',     url: SITE_URL },
    { name: 'Trending', url: `${SITE_URL}/trending` },
  ])

  const top3 = movies.slice(0, 3)
  const rest  = movies.slice(3)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
            <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                Trending this week
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}>
                The chart
              </h1>
              <p style={{ fontSize: '16px', lineHeight: '1.55', color: '#8C857A', margin: 0 }}>
                Ranked by reviews, watchlist additions, and community engagement. Updated weekly.
              </p>
            </div>
          </div>
        </section>

        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '80px' }}>
          {movies.length > 0 ? (
            <>
              {/* ── TOP 3 ─────────────────────────────────────────────── */}
              {top3.length > 0 && (
                <div style={{ marginBottom: '56px' }}>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 20px' }}>
                    Top 3
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {top3.map((movie, rank) => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}`}
                        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}
                      >
                        {/* Poster */}
                        <div style={{ aspectRatio: '2/3', borderRadius: '14px', overflow: 'hidden', background: '#15120E', position: 'relative' }}>
                          {movie.poster_url ? (
                            <PosterImg
                              role="card"
                              film={movie}
                              alt={`${movie.title} poster`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading={rank < 3 ? 'eager' : 'lazy'}
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', opacity: 0.15 }}>
                              🎬
                            </div>
                          )}

                          {/* Rank */}
                          <div style={{
                            position: 'absolute', top: '10px', left: '10px',
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#C8963E', color: '#0B0A09',
                            ...SERIF, fontSize: '16px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {rank + 1}
                          </div>

                          {/* Rating */}
                          {movie.average_rating > 0 && (
                            <div style={{
                              position: 'absolute', top: '10px', right: '10px',
                              height: '24px', padding: '0 8px', borderRadius: '999px',
                              background: 'rgba(11,10,9,0.8)',
                              ...MONO, fontSize: '10px', fontWeight: 700, color: '#C8963E',
                              display: 'flex', alignItems: 'center',
                            }}>
                              {formatRating(movie.average_rating)}
                            </div>
                          )}

                          {/* Bottom gradient */}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(to top, rgba(11,10,9,0.85) 0%, transparent 100%)' }} aria-hidden="true" />
                          <div style={{ position: 'absolute', bottom: '12px', left: '12px', right: '12px' }}>
                            <p style={{ margin: 0, ...SERIF, fontSize: 'clamp(15px,1.8vw,20px)', color: '#F6EFE2', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {movie.title}
                            </p>
                            {movie.review_count > 0 && (
                              <p style={{ margin: '4px 0 0', ...MONO, fontSize: '10px', color: 'rgba(237,228,210,0.5)' }}>
                                {movie.review_count} {movie.review_count === 1 ? 'review' : 'reviews'}
                              </p>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* ── REST OF THE CHART ─────────────────────────────────── */}
              {rest.length > 0 && (
                <div>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6A6258', margin: '0 0 20px' }}>
                    The rest of the chart
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    {rest.map((movie, i) => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}`}
                        style={{
                          textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: '16px',
                          padding: '14px 0',
                          borderBottom: '1px solid rgba(237,228,210,0.06)',
                        }}
                      >
                        {/* Rank */}
                        <span style={{ ...MONO, fontSize: '13px', color: 'rgba(200,150,62,0.3)', fontWeight: 700, width: '28px', flexShrink: 0, textAlign: 'right' }}>
                          {i + 4}
                        </span>

                        {/* Poster thumb */}
                        <div style={{ width: '36px', height: '52px', borderRadius: '6px', overflow: 'hidden', background: '#15120E', flexShrink: 0 }}>
                          {movie.poster_url ? (
                            <PosterImg
                              role="tiny"
                              film={movie}
                              alt={movie.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', opacity: 0.2 }}>🎬</div>
                          )}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {movie.title}
                          </p>
                          <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                            {movie.release_year}
                            {movie.genre ? ` · ${capitalise(movie.genre)}` : ''}
                          </p>
                        </div>

                        {/* Rating */}
                        {movie.average_rating > 0 && (
                          <span style={{ ...MONO, fontSize: '12px', color: '#C8963E', fontWeight: 700, flexShrink: 0 }}>
                            ★ {formatRating(movie.average_rating)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ padding: '80px 24px', borderRadius: '20px', border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontSize: '40px', opacity: 0.2 }} aria-hidden="true">📈</span>
              <p style={{ ...SERIF, fontSize: '22px', color: '#F6EFE2', margin: 0 }}>Trending data loading</p>
              <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>Check back shortly for this week's chart.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
