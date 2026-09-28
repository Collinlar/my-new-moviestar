import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SearchBar } from '@/components/SearchBar'
import { searchMovies } from '@/lib/queries'
import { SITE_URL, capitalise } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams
  if (!q) return { title: 'Search African Movies' }
  return {
    title: `"${q}" — Search results`,
    description: `Search results for "${q}" in the MuvieStars African movie database.`,
    robots: { index: false },
    alternates: { canonical: `${SITE_URL}/search?q=${encodeURIComponent(q)}` },
  }
}

export const dynamic = 'force-dynamic'

const POPULAR_SEARCHES = ['Nollywood', 'Ghanaian drama', 'African comedy', 'Wolof films', 'South African thriller']

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const results = q ? await searchMovies(q, 24) : []

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '40px' }}>
            <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,5vw,56px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                {q ? `Results for "${q}"` : 'Search the archive'}
              </h1>
              {q && (
                <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: 0 }}>
                  {results.length} {results.length === 1 ? 'film' : 'films'} found
                </p>
              )}
              <SearchBar defaultValue={q} />
            </div>
          </div>
        </section>

        {/* ── RESULTS ───────────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
          {!q ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'flex-start' }}>
              <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: 0 }}>
                Search by film title, director, actor, genre, or country.
              </p>
              <div>
                <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6A6258', margin: '0 0 12px' }}>
                  Popular searches
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {POPULAR_SEARCHES.map((term) => (
                    <Link
                      key={term}
                      href={`/search?q=${encodeURIComponent(term)}`}
                      style={{
                        height: '36px', padding: '0 16px', borderRadius: '999px',
                        border: '1px solid rgba(237,228,210,0.12)',
                        color: '#8C857A', ...MONO, fontSize: '13px',
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                      }}
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
              {results.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', background: '#15120E', position: 'relative' }}>
                    {movie.poster_url ? (
                      <img
                        src={movie.poster_url}
                        alt={movie.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.15 }}>
                        🎬
                      </div>
                    )}
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
                      {movie.genre ? ` · ${capitalise(movie.genre)}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: '80px 24px', borderRadius: '20px', border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              <span style={{ fontSize: '40px', opacity: 0.2 }} aria-hidden="true">🔍</span>
              <div>
                <p style={{ ...SERIF, fontSize: '22px', color: '#F6EFE2', margin: '0 0 8px' }}>No films found for "{q}"</p>
                <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>
                  Try a different spelling, or search by genre, country, or filmmaker name.
                </p>
              </div>
              <Link
                href="/browse"
                style={{
                  height: '44px', padding: '0 24px', borderRadius: '12px',
                  border: '1px solid rgba(237,228,210,0.12)',
                  color: '#EDE4D2', fontSize: '14px', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', ...MONO,
                }}
              >
                Browse the full archive
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
