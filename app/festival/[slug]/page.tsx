import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clapperboard, MapPin, Calendar, ExternalLink, Trophy, Star } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, formatRating } from '@/lib/utils'

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

  // Find awards where the name contains the festival short name or full name
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

  // Group by year
  const byYear = awards.reduce((acc: Record<number, any[]>, award: any) => {
    const yr = award.year
    if (!acc[yr]) acc[yr] = []
    acc[yr].push(award)
    return acc
  }, {})

  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  const totalFilms   = new Set(awards.map((a: any) => a.movie?.id).filter(Boolean)).size
  const totalWins    = awards.filter((a: any) => a.won).length
  const latestYear   = years[0]

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

      <main className="pt-16 min-h-screen">

        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <section className="py-14 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container max-w-4xl">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/festivals" className="hover:text-film-cream transition-colors">Festivals</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">{fest.short_name}</li>
              </ol>
            </nav>

            <div className="flex items-start gap-5">
              <div className="w-14 h-14 rounded-xl bg-cinema-surface border border-cinema-border flex items-center justify-center flex-shrink-0">
                <Clapperboard className="w-6 h-6 text-film-gold" aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-film-gold tracking-widest uppercase mb-1">
                  {fest.short_name} · {fest.frequency}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-film-cream leading-tight">
                  {fest.name}
                </h1>

                <div className="flex flex-wrap items-center gap-5 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-film-subtle">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    {fest.city ? `${fest.city}, ` : ''}{fest.country}
                  </span>
                  {fest.founded && (
                    <span className="flex items-center gap-1.5 text-xs text-film-subtle">
                      <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                      Est. {fest.founded}
                    </span>
                  )}
                  {fest.website && (
                    <a
                      href={fest.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-film-subtle hover:text-film-gold transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                      Official site
                    </a>
                  )}
                </div>

                {fest.description && (
                  <p className="text-sm text-film-muted mt-4 max-w-2xl leading-relaxed">
                    {fest.description}
                  </p>
                )}

                {/* Stats row */}
                {awards.length > 0 && (
                  <div className="flex flex-wrap gap-8 mt-6">
                    <div>
                      <div className="text-2xl font-bold text-film-cream">{totalFilms}</div>
                      <div className="text-xs text-film-muted">Films in database</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-film-cream">{awards.length}</div>
                      <div className="text-xs text-film-muted">Award entries</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-film-gold">{totalWins}</div>
                      <div className="text-xs text-film-muted">Wins tracked</div>
                    </div>
                    {latestYear && (
                      <div>
                        <div className="text-2xl font-bold text-film-cream">{latestYear}</div>
                        <div className="text-xs text-film-muted">Latest entry</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── AWARDS BY YEAR ─────────────────────────────────────── */}
        <section className="section-container max-w-4xl py-12">
          {awards.length === 0 ? (
            <div className="text-center py-20 border border-cinema-border rounded-xl">
              <Trophy className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-film-muted text-sm mb-2">
                No award records for {fest.short_name} yet.
              </p>
              <p className="text-xs text-film-subtle max-w-sm mx-auto">
                Awards are added via the admin panel on each film's page. Search for films that
                competed at {fest.short_name} and add their entries there.
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {years.map(year => {
                const yearAwards = byYear[year]
                const winners = yearAwards.filter((a: any) => a.won)
                const nominees = yearAwards.filter((a: any) => !a.won)

                return (
                  <div key={year}>
                    <h2 className="text-lg font-bold text-film-cream mb-5 flex items-center gap-3">
                      {year}
                      <span className="text-xs font-normal text-film-subtle">
                        {winners.length} {winners.length === 1 ? 'win' : 'wins'} · {yearAwards.length} entries
                      </span>
                    </h2>

                    <div className="space-y-3">
                      {/* Winners first */}
                      {winners.map((award: any) => (
                        <AwardEntry key={award.id} award={award} won />
                      ))}
                      {/* Then nominees */}
                      {nominees.map((award: any) => (
                        <AwardEntry key={award.id} award={award} won={false} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

      </main>

      <Footer />
    </>
  )
}

function AwardEntry({ award, won }: { award: any; won: boolean }) {
  const movie = award.movie
  if (!movie) return null

  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
      won
        ? 'bg-film-gold/5 border-film-gold/20'
        : 'bg-cinema-dark border-cinema-border'
    }`}>
      {/* Poster */}
      <Link href={`/movie/${movie.id}`} className="flex-shrink-0" tabIndex={-1} aria-hidden="true">
        {movie.poster_url ? (
          <img
            src={movie.poster_url}
            alt={movie.title}
            className="w-10 h-14 rounded object-cover border border-cinema-border"
            loading="lazy"
          />
        ) : (
          <div className="w-10 h-14 rounded bg-cinema-surface border border-cinema-border" />
        )}
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/movie/${movie.id}`}
          className="text-sm font-semibold text-film-cream hover:text-film-gold transition-colors"
        >
          {movie.title}
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-0.5">
          <span className="text-xs text-film-subtle">{movie.release_year}</span>
          {movie.average_rating > 0 && (
            <span className="flex items-center gap-1 text-xs text-film-amber">
              <Star className="w-2.5 h-2.5 fill-current" aria-hidden="true" />
              {formatRating(movie.average_rating)}
            </span>
          )}
        </div>
        <p className="text-xs text-film-muted mt-1">{award.category}</p>
      </div>

      {/* Win badge */}
      {won && (
        <div className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold text-film-gold">
          <Trophy className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
          Won
        </div>
      )}
    </div>
  )
}
