import type { Metadata } from 'next'
import Link from 'next/link'
import { Award, Star } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { getCanonMovies } from '@/lib/queries'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [crumbs, faqSchema(CANON_FAQ)] }),
        }}
      />

      <Navigation />

      <main className="pt-16">
        <section className="py-16 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container max-w-3xl">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">African Film Canon</li>
              </ol>
            </nav>

            <div className="flex items-start gap-4">
              <Award className="w-10 h-10 text-film-gold flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-film-cream">
                  African Film Canon
                </h1>
                <p className="mt-3 text-film-muted leading-relaxed text-lg">
                  The landmark films that define African cinema. Selected for cultural significance,
                  artistic achievement, and lasting impact on African storytelling.
                </p>
                <p className="mt-4 text-sm text-film-subtle">
                  {movies.length} canonical films documented
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="section-container py-12">
          {movies.length === 0 ? (
            <div className="text-center py-20">
              <Award className="w-10 h-10 text-film-subtle mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-film-cream mb-2">Canon being curated</h2>
              <p className="text-film-muted">The editorial team is assembling this collection.</p>
            </div>
          ) : (
            <>
              {/* Films with essays — editorial list */}
              {movies.filter(m => m.canon_essay).length > 0 && (
                <div className="space-y-0 mb-16">
                  {movies.filter(m => m.canon_essay).map((movie, i) => (
                    <article
                      key={movie.id}
                      className="group border-b border-cinema-border py-10 first:pt-0 grid grid-cols-[auto_1fr] gap-6 sm:gap-10"
                    >
                      {/* Number */}
                      <div className="text-2xl font-bold text-film-gold/30 tabular-nums w-8 pt-1 select-none">
                        {String(i + 1).padStart(2, '0')}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-5">
                        {/* Poster */}
                        <Link href={`/movie/${movie.id}`} className="flex-shrink-0 hidden sm:block" tabIndex={-1} aria-hidden="true">
                          <div className="w-24 aspect-[2/3] rounded-lg overflow-hidden border border-cinema-border bg-cinema-surface">
                            {movie.poster_url ? (
                              <img
                                src={movie.poster_url}
                                alt={movie.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                loading="lazy"
                              />
                            ) : null}
                          </div>
                        </Link>

                        {/* Content */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-3 mb-1">
                            <Link
                              href={`/movie/${movie.id}`}
                              className="text-xl font-bold text-film-cream hover:text-film-gold transition-colors leading-tight"
                            >
                              {movie.title}
                            </Link>
                            <span className="text-sm text-film-subtle">{movie.release_year}</span>
                            {movie.average_rating > 0 && (
                              <span className="flex items-center gap-1 text-xs text-film-amber">
                                <Star className="w-3 h-3 fill-current" aria-hidden="true" />
                                {movie.average_rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                          {(movie.director || movie.creator?.name) && (
                            <p className="text-xs text-film-subtle mb-4">
                              {movie.director || movie.creator?.name}
                            </p>
                          )}
                          <p className="text-film-muted leading-relaxed text-sm">
                            {truncate(movie.canon_essay!, 320)}
                          </p>
                          <Link
                            href={`/movie/${movie.id}`}
                            className="inline-block mt-4 text-xs font-medium text-film-gold hover:text-film-amber transition-colors"
                          >
                            Read full essay →
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Films without essays — compact grid */}
              {movies.filter(m => !m.canon_essay).length > 0 && (
                <>
                  {movies.filter(m => m.canon_essay).length > 0 && (
                    <h2 className="text-sm font-semibold text-film-subtle uppercase tracking-widest mb-6">
                      Also in the Canon
                    </h2>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                    {movies.filter(m => !m.canon_essay).map((movie) => (
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
                        isCanon
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* FAQ */}
        <section className="py-16 bg-cinema-dark border-t border-cinema-border" aria-labelledby="canon-faq-heading">
          <div className="section-container max-w-2xl">
            <h2 id="canon-faq-heading" className="text-xl font-bold text-film-cream mb-8">
              About the African Film Canon
            </h2>
            <dl className="space-y-6">
              {CANON_FAQ.map((item) => (
                <div key={item.question} className="border-b border-cinema-border pb-6 last:border-0">
                  <dt className="text-base font-semibold text-film-cream mb-3">{item.question}</dt>
                  <dd className="text-sm text-film-muted leading-relaxed">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
