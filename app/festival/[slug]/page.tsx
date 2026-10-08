import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, formatRating } from '@/lib/utils'
import { PosterImg } from '@/components/PosterImg'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient() as any
  const { data: fest } = await supabase
    .from('festivals')
    .select('name, short_name, country, city, description')
    .eq('slug', slug)
    .single()

  if (!fest) return { title: 'Festival — MuvieStars' }

  return {
    title: `${fest.name} (${fest.short_name}) — African Film Festivals on MuvieStars`,
    description: fest.description || `Explore ${fest.short_name} award winners and nominated African films on MuvieStars.`,
    alternates: { canonical: `${SITE_URL}/festival/${slug}` },
  }
}

export const dynamic = 'force-dynamic'

export default async function FestivalPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient() as any

  const { data: fest } = await supabase
    .from('festivals')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!fest) notFound()

  const { data: awardsRaw } = await supabase
    .from('movie_awards')
    .select(`
      id, category, year, won,
      movie:movies(id, title, release_year, poster_url, genre, average_rating, director)
    `)
    .or(`name.ilike.%${fest.short_name}%,name.ilike.%${fest.name}%`)
    .order('year', { ascending: false })
    .order('won', { ascending: false })

  const awards = (awardsRaw as any[]) || []

  const byYear = awards.reduce((acc: Record<number, any[]>, award: any) => {
    const yr = award.year
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(award)
    return acc
  }, {})

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  const totalFilms = new Set(awards.map((a: any) => a.movie?.id).filter(Boolean)).size
  const totalWins  = awards.filter((a: any) => a.won).length
  const latestYear = years[0]

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: SITE_URL },
    { name: 'Festivals', url: `${SITE_URL}/festivals` },
    { name: fest.short_name, url: `${SITE_URL}/festival/${slug}` },
  ])

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

            <Link
              href="/festivals"
              style={{ ...MONO, fontSize: '12px', color: '#6A6258', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '28px' }}
            >
              ← All festivals
            </Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '680px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...MONO, fontSize: '11px', fontWeight: 700, color: '#C8963E', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {fest.short_name}
                </span>
                {fest.frequency && (
                  <span style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}>{fest.frequency}</span>
                )}
              </div>

              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,56px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}>
                {fest.name}
              </h1>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(fest.city || fest.country) && (
                  <span style={{ ...MONO, fontSize: '12px', color: '#6A6258' }}>
                    📍 {fest.city ? `${fest.city}, ` : ''}{fest.country}
                  </span>
                )}
                {fest.founded && (
                  <span style={{ ...MONO, fontSize: '12px', color: '#6A6258' }}>Est. {fest.founded}</span>
                )}
                {fest.website && (
                  <a
                    href={fest.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...MONO, fontSize: '12px', color: '#6A6258', textDecoration: 'none' }}
                  >
                    Official site ↗
                  </a>
                )}
              </div>

              {fest.description && (
                <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.65', color: '#8C857A', maxWidth: '560px' }}>
                  {fest.description}
                </p>
              )}

              {/* Stats */}
              {awards.length > 0 && (
                <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', paddingTop: '8px' }}>
                  <div>
                    <span style={{ ...SERIF, fontSize: '28px', color: '#F6EFE2' }}>{totalFilms}</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>films</span>
                  </div>
                  <div>
                    <span style={{ ...SERIF, fontSize: '28px', color: '#F6EFE2' }}>{awards.length}</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>entries</span>
                  </div>
                  <div>
                    <span style={{ ...SERIF, fontSize: '28px', color: '#C8963E' }}>{totalWins}</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>wins tracked</span>
                  </div>
                  {latestYear && (
                    <div>
                      <span style={{ ...SERIF, fontSize: '28px', color: '#F6EFE2' }}>{latestYear}</span>
                      <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '6px' }}>latest</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── AWARDS BY YEAR ────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '760px' }}>
            {awards.length === 0 ? (
              <div style={{ padding: '64px 24px', borderRadius: '20px', border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '32px', opacity: 0.2 }}>🏆</span>
                <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>
                  No award records for {fest.short_name} yet.
                </p>
                <p style={{ ...MONO, fontSize: '12px', color: '#4B4540', margin: 0, maxWidth: '320px', textAlign: 'center' }}>
                  Search for films that competed at {fest.short_name} and add their entries via the admin panel.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {years.map(year => {
                  const yearAwards = byYear[year]
                  const winners  = yearAwards.filter((a: any) => a.won)
                  const nominees = yearAwards.filter((a: any) => !a.won)

                  return (
                    <div key={year}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px' }}>
                        <h2 style={{ ...SERIF, fontWeight: 400, fontSize: '28px', color: '#F6EFE2', margin: 0 }}>
                          {year}
                        </h2>
                        <span style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}>
                          {winners.length} {winners.length === 1 ? 'win' : 'wins'} · {yearAwards.length} entries
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {winners.map((award: any) => (
                          <AwardEntry key={award.id} award={award} won />
                        ))}
                        {nominees.map((award: any) => (
                          <AwardEntry key={award.id} award={award} won={false} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      </main>

      <Footer />
    </>
  )
}

function AwardEntry({ award, won }: { award: any; won: boolean }) {
  const movie = award.movie
  if (!movie) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 16px', borderRadius: '12px',
      background: won ? 'rgba(200,150,62,0.06)' : '#0F0D0B',
      border: won ? '1px solid rgba(200,150,62,0.2)' : '1px solid rgba(237,228,210,0.06)',
    }}>
      {/* Poster */}
      <Link href={`/movie/${movie.id}`} style={{ flexShrink: 0 }} tabIndex={-1} aria-hidden="true">
        {movie.poster_url ? (
          <PosterImg
            role="tiny"
            film={movie}
            alt={movie.title}
            style={{ width: '36px', height: '52px', borderRadius: '6px', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '36px', height: '52px', borderRadius: '6px', background: '#15120E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', opacity: 0.2 }}>🎬</div>
        )}
      </Link>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Link
          href={`/movie/${movie.id}`}
          style={{ fontSize: '14px', fontWeight: 500, color: '#F6EFE2', textDecoration: 'none' }}
        >
          {movie.title}
        </Link>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
          <span style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}>{movie.release_year}</span>
          {movie.average_rating > 0 && (
            <span style={{ ...MONO, fontSize: '11px', color: '#C8963E' }}>
              ★ {formatRating(movie.average_rating)}
            </span>
          )}
        </div>
        <p style={{ ...MONO, fontSize: '11px', color: '#6A6258', margin: '3px 0 0' }}>{award.category}</p>
      </div>

      {/* Win badge */}
      {won && (
        <div style={{ flexShrink: 0, ...MONO, fontSize: '11px', fontWeight: 700, color: '#C8963E', display: 'flex', alignItems: 'center', gap: '5px' }}>
          🏆 Won
        </div>
      )}
    </div>
  )
}
