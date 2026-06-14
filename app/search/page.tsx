import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { SearchBar } from '@/components/SearchBar'
import { searchMovies } from '@/lib/queries'
import { SITE_URL } from '@/lib/utils'

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

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const results = q ? await searchMovies(q, 24) : []

  return (
    <>
      <Navigation />

      <main className="pt-16">
        <section className="py-12 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <h1 className="text-2xl font-bold text-film-cream mb-2">
              {q ? `Results for "${q}"` : 'Search the archive'}
            </h1>
            {q && (
              <p className="text-film-muted mb-6">
                {results.length} {results.length === 1 ? 'film' : 'films'} found
              </p>
            )}
            <SearchBar defaultValue={q} />
          </div>
        </section>

        <div className="section-container py-10">
          {!q ? (
            <div className="text-center py-20">
              <p className="text-film-muted">
                Type a movie title, director name, actor, genre, or country above.
              </p>
              <div className="mt-8">
                <p className="text-xs text-film-subtle uppercase tracking-wider mb-4">Popular searches</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Nollywood', 'Ghanaian drama', 'African comedy', 'Wolof films', 'South African thriller'].map((term) => (
                    <Link key={term} href={`/search?q=${encodeURIComponent(term)}`} className="genre-tag">
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map((movie) => (
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
                  director={movie.director || movie.creator?.name}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <span className="text-5xl block mb-4" aria-hidden="true">🔍</span>
              <h2 className="text-xl font-semibold text-film-cream mb-2">No films found for "{q}"</h2>
              <p className="text-film-muted mb-6">
                Try a different spelling, or search by genre, country, or filmmaker name.
              </p>
              <Link href="/browse" className="btn-outline">Browse the full archive</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
