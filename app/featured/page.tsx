import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCardWide } from '@/components/MovieCard'
import { getFeaturedMovies } from '@/lib/queries'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: "Editor's Picks — Featured African Films",
  description:
    "Hand-curated selection of outstanding African films. The MuvieStars editorial team's recommended viewing from across Nollywood, Ghallywood, and the continent.",
  alternates: { canonical: `${SITE_URL}/featured` },
}

export const revalidate = 3600

export default async function FeaturedPage() {
  const movies = await getFeaturedMovies(24)

  return (
    <>
      <Navigation />

      <main className="pt-16">
        <section className="py-14 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <h1 className="text-3xl font-bold text-film-cream flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-film-gold" aria-hidden="true" />
              Editor's picks
            </h1>
            <p className="mt-2 text-film-muted max-w-lg">
              Hand-selected films our editors think every African cinema fan should discover.
            </p>
          </div>
        </section>

        <div className="section-container py-12">
          {movies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {movies.map((movie) => (
                <MovieCardWide
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
              <p className="text-film-muted">Featured selections coming soon.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
