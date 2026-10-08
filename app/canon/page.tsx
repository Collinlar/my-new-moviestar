import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getCanonMovies } from '@/lib/queries'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'
import { PosterImg } from '@/components/PosterImg'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'African Film Canon — Essential Films in African Cinema History',
  description:
    'The definitive collection of landmark African films. Essential viewing for anyone who wants to understand African cinema — curated by the MuvieStars editorial team.',
  keywords: [
    'African film canon', 'essential African movies', 'greatest African films',
    'African cinema classics', 'must-watch Nollywood', 'African film history',
    'landmark African films', 'African movie masterpieces',
  ],
  alternates: { canonical: `${SITE_URL}/canon` },
}

export const revalidate = 86400

const CANON_FAQ = [
  {
    question: 'What is the African Film Canon?',
    answer:
      'The African Film Canon is a curated list of films selected for their cultural significance, artistic achievement, and contribution to African cinema history. These are films that every serious lover of African cinema should watch.',
  },
  {
    question: 'How are films selected for the African Film Canon?',
    answer:
      'Films are selected by the MuvieStars editorial team based on criteria including critical acclaim, cultural impact, representation of African storytelling traditions, historical importance, and influence on subsequent African filmmakers.',
  },
]

export default async function CanonPage() {
  const movies = await getCanonMovies(50)

  const crumbs = breadcrumbSchema([
    { name: 'Home',  url: SITE_URL },
    { name: 'Canon', url: `${SITE_URL}/canon` },
  ])

  const essayFilms  = movies.filter(m => m.canon_essay)
  const otherFilms  = movies.filter(m => !m.canon_essay)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [crumbs, faqSchema(CANON_FAQ)] }),
        }}
      />

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
            <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                African Film Canon
              </p>

              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,80px)', lineHeight: '0.95', color: '#F6EFE2', margin: 0 }}>
                The landmark films.
              </h1>

              <p style={{ fontSize: '18px', lineHeight: '1.55', color: '#8C857A', margin: 0, maxWidth: '520px' }}>
                Selected for cultural significance, artistic achievement, and lasting impact on African storytelling.
              </p>

              <span style={{ ...MONO, fontSize: '13px', color: '#6A6258' }}>
                {movies.length} canonical films documented
              </span>
            </div>
          </div>
        </section>

        {movies.length === 0 ? (
          <div style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '48px', opacity: 0.2 }}>🏆</span>
            <p style={{ ...SERIF, fontSize: '22px', color: '#F6EFE2' }}>Canon being curated</p>
            <p style={{ fontSize: '15px', color: '#6A6258' }}>The editorial team is assembling this collection.</p>
          </div>
        ) : (
          <>
            {/* ── ESSAY FILMS ─────────────────────────────────────────── */}
            {essayFilms.length > 0 && (
              <section>
                <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '64px', paddingBottom: '64px' }}>
                  <div style={{ maxWidth: '860px' }}>
                    {essayFilms.map((movie, i) => (
                      <article
                        key={movie.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr',
                          gap: '28px',
                          paddingTop: i === 0 ? 0 : '48px',
                          paddingBottom: '48px',
                          borderBottom: '1px solid rgba(237,228,210,0.06)',
                        }}
                      >
                        {/* Number */}
                        <div style={{
                          ...MONO, fontSize: '13px', fontWeight: 700,
                          color: 'rgba(200,150,62,0.25)', width: '28px',
                          paddingTop: '4px', userSelect: 'none', flexShrink: 0,
                        }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>

                        {/* Content */}
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '24px', alignItems: 'start' }}>
                          {/* Poster */}
                          <Link href={`/movie/${movie.id}`} tabIndex={-1} aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
                            <div style={{ width: '80px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#15120E' }}>
                              {movie.poster_url && (
                                <PosterImg
                                  role="tiny"
                                  film={movie}
                                  alt={movie.title}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  loading="lazy"
                                />
                              )}
                            </div>
                          </Link>

                          {/* Text */}
                          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '10px' }}>
                              <Link
                                href={`/movie/${movie.id}`}
                                style={{ ...SERIF, fontSize: 'clamp(18px,2.5vw,26px)', color: '#F6EFE2', textDecoration: 'none', lineHeight: 1.1 }}
                              >
                                {movie.title}
                              </Link>
                              <span style={{ ...MONO, fontSize: '12px', color: '#6A6258' }}>{movie.release_year}</span>
                              {movie.average_rating > 0 && (
                                <span style={{ ...MONO, fontSize: '12px', color: '#C8963E' }}>
                                  ★ {movie.average_rating.toFixed(1)}
                                </span>
                              )}
                            </div>

                            {(movie.director || movie.creator?.name) && (
                              <p style={{ ...MONO, fontSize: '11px', color: '#6A6258', margin: 0 }}>
                                {movie.director || movie.creator?.name}
                              </p>
                            )}

                            <p style={{ fontSize: '15px', lineHeight: '1.65', color: '#A39B8F', margin: 0 }}>
                              {truncate(movie.canon_essay!, 320)}
                            </p>

                            <Link
                              href={`/movie/${movie.id}`}
                              style={{ ...MONO, fontSize: '11px', color: '#C8963E', textDecoration: 'none', letterSpacing: '0.06em' }}
                            >
                              Read full essay →
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── OTHER CANON FILMS (no essay) ────────────────────────── */}
            {otherFilms.length > 0 && (
              <section style={{ borderTop: '1px solid rgba(237,228,210,0.06)', paddingTop: '56px', paddingBottom: '72px' }}>
                <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
                  {essayFilms.length > 0 && (
                    <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6A6258', margin: '0 0 28px' }}>
                      Also in the Canon
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                    {otherFilms.map((movie) => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}`}
                        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', background: '#15120E', position: 'relative' }}>
                          {movie.poster_url ? (
                            <PosterImg
                              role="card"
                              film={movie}
                              alt={movie.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.15 }}>
                              🎬
                            </div>
                          )}

                          {/* Canon badge */}
                          <div style={{
                            position: 'absolute', top: '7px', left: '7px',
                            height: '20px', padding: '0 6px', borderRadius: '999px',
                            background: 'rgba(200,150,62,0.85)',
                            ...MONO, fontSize: '9px', fontWeight: 700, color: '#0B0A09',
                            display: 'flex', alignItems: 'center', letterSpacing: '0.06em',
                          }}>
                            CANON
                          </div>

                          {movie.average_rating > 0 && (
                            <div style={{
                              position: 'absolute', top: '7px', right: '7px',
                              height: '22px', padding: '0 7px', borderRadius: '999px',
                              background: 'rgba(11,10,9,0.8)',
                              ...MONO, fontSize: '10px', fontWeight: 700, color: '#C8963E',
                              display: 'flex', alignItems: 'center',
                            }}>
                              {movie.average_rating.toFixed(1)}
                            </div>
                          )}
                        </div>

                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {movie.title}
                          </p>
                          <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                            {movie.release_year}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* ── FAQ ───────────────────────────────────────────────────── */}
        <section style={{ borderTop: '1px solid rgba(237,228,210,0.06)', paddingTop: '72px', paddingBottom: '80px' }} aria-labelledby="canon-faq-heading">
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ maxWidth: '640px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}>
                About the Canon
              </p>
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {CANON_FAQ.map((item, i) => (
                  <div
                    key={item.question}
                    style={{
                      paddingTop: i === 0 ? 0 : '28px',
                      paddingBottom: '28px',
                      borderBottom: i < CANON_FAQ.length - 1 ? '1px solid rgba(237,228,210,0.06)' : 'none',
                    }}
                  >
                    <dt style={{ fontSize: '17px', fontWeight: 600, color: '#F6EFE2', marginBottom: '10px' }}>{item.question}</dt>
                    <dd style={{ margin: 0, fontSize: '15px', lineHeight: '1.65', color: '#8C857A' }}>{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
