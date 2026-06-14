import type { Metadata } from 'next'
import Link from 'next/link'
import { TrendingUp, Star } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { getTrendingMovies } from '@/lib/queries'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, formatRating } from '@/lib/utils'

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Navigation />

      <main className="pt-16">
        <section className="py-14 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">Trending</li>
              </ol>
            </nav>

            <h1 className="text-3xl font-bold text-film-cream flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-film-gold" aria-hidden="true" />
              Trending this week
            </h1>
            <p className="mt-2 text-film-muted max-w-lg">
              African films ranked by recent reviews, watchlist additions, and community engagement.
              Updated weekly.
            </p>
          </div>
        </section>

        <div className="section-container py-12">
          {movies.length > 0 ? (
            <>
              {/* Top 3 ranked prominently */}
              <div className="mb-10">
                <p className="section-label mb-4">Top 3</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {movies.slice(0, 3).map((movie, rank) => (
                    <Link
                      key={movie.id}
                      href={`/movie/${movie.id}`}
                      className="cinema-card group relative overflow-hidden"
                    >
                      {/* Rank badge */}
                      <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-film-gold text-cinema-black font-bold text-base flex items-center justify-center">
                        {rank + 1}
                      </div>

                      <div className="poster-wrap">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={`${movie.title} poster`}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading={rank < 3 ? 'eager' : 'lazy'}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-cinema-surface">
                            <span className="text-4xl opacity-20">🎬</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-poster-overlay" aria-hidden="true" />
                        <div className="absolute bottom-3 inset-x-3">
                          <h2 className="text-base font-bold text-white line-clamp-2">{movie.title}</h2>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Star className="w-3.5 h-3.5 text-film-amber fill-current" aria-hidden="true" />
                            <span className="text-sm font-semibold text-film-amber">{formatRating(movie.average_rating)}</span>
                            <span className="text-xs text-white/70">({movie.review_count})</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Remaining as grid */}
              <p className="section-label mb-4">The rest of the chart</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {movies.slice(3).map((movie, i) => (
                  <div key={movie.id} className="relative">
                    <div className="absolute -top-1 -left-1 z-10 w-6 h-6 rounded-full bg-cinema-surface border border-cinema-border text-film-muted text-[10px] font-bold flex items-center justify-center">
                      {i + 4}
                    </div>
                    <MovieCard
                      id={movie.id}
                      title={movie.title}
                      release_year={movie.release_year}
                      genre={movie.genre}
                      language={movie.language}
                      poster_url={movie.poster_url}
                      average_rating={movie.average_rating}
                      review_count={movie.review_count}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20">
              <TrendingUp className="w-10 h-10 text-film-subtle mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-film-cream mb-2">Trending data loading</h2>
              <p className="text-film-muted">Check back shortly for this week's chart.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
