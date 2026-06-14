import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Star, Calendar, Globe, ArrowLeft, Award, Film, Quote, Users, Play, ExternalLink } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import {
  getMovieById, getMovieReviews, getMovieCast,
  getMovieAwards, getAllMovieIds, browseMovies,
} from '@/lib/queries'
import { ReviewForm } from '@/components/ReviewForm'
import { WatchlistButton } from '@/components/WatchlistButton'
import { HelpfulButton } from '@/components/HelpfulButton'
import { SaveToListButton } from '@/components/SaveToListButton'
import { movieSchema, breadcrumbSchema } from '@/lib/schema'
import { capitalise, formatRating, truncate, SITE_URL } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const ids = await getAllMovieIds()
  return ids.slice(0, 500).map((id) => ({ id }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const movie = await getMovieById(id)
  if (!movie) return { title: 'Movie Not Found' }

  const title   = `${movie.title} (${movie.release_year})`
  const desc    = truncate(movie.synopsis || movie.description, 160)
  const country = movie.country ? ` from ${movie.country}` : ''
  const dir     = movie.director || movie.creator?.name
  const fullDesc = desc || `${movie.title} is a ${movie.release_year} ${movie.genre} film${country}${dir ? ` directed by ${dir}` : ''}.`

  return {
    title,
    description: fullDesc,
    keywords: [
      movie.title, movie.genre, capitalise(movie.language),
      movie.country || '', movie.director || '',
      'African movie', 'African cinema', 'movie review',
    ].filter(Boolean),
    alternates: { canonical: `${SITE_URL}/movie/${id}` },
    openGraph: {
      title,
      description: fullDesc,
      type: 'video.movie',
      url: `${SITE_URL}/movie/${id}`,
      images: movie.poster_url
        ? [{ url: movie.poster_url, width: 800, height: 1200, alt: `${movie.title} poster` }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: fullDesc,
      images: movie.poster_url ? [movie.poster_url] : undefined,
    },
  }
}

export const revalidate = 3600

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params
  const [movie, reviews, cast, awards] = await Promise.all([
    getMovieById(id),
    getMovieReviews(id, 8),
    getMovieCast(id),
    getMovieAwards(id),
  ])

  if (!movie) notFound()

  const { movies: relatedMovies } = await browseMovies({
    genre: movie.genre, limit: 6,
  }).catch(() => ({ movies: [], total: 0 }))

  const similar = relatedMovies.filter((m) => m.id !== id).slice(0, 4)

  const schema = movieSchema(movie, reviews)
  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'Browse', url: `${SITE_URL}/browse` },
    { name: movie.title, url: `${SITE_URL}/movie/${id}` },
  ])

  const dir    = movie.director || movie.creator?.name
  const wonAwards = awards.filter((a) => a.won)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [schema, crumbs] }) }}
      />

      <Navigation />

      <main>
        {/* ─── HERO ─────────────────────────────────────────────────── */}
        <section className="relative pt-16 overflow-hidden" aria-label={`${movie.title} header`}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-cinema-black" aria-hidden="true">
            {movie.poster_url && (
              <Image
                src={movie.poster_url}
                alt=""
                fill
                className="object-cover opacity-10 blur-lg scale-110"
                priority
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-cinema-black/50 via-cinema-black/80 to-cinema-black" />
          </div>

          <div className="relative section-container py-16">
            {/* Back link */}
            <nav aria-label="Back navigation" className="mb-8">
              <Link
                href="/browse"
                className="btn-ghost text-sm gap-2 inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Back to browse
              </Link>
            </nav>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-8">
              <ol className="flex items-center gap-2 text-xs text-film-muted flex-wrap">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true"><span>/</span></li>
                <li><Link href="/browse" className="hover:text-film-cream transition-colors">Browse</Link></li>
                <li aria-hidden="true"><span>/</span></li>
                <li className="text-film-cream" aria-current="page">{movie.title}</li>
              </ol>
            </nav>

            <div className="flex flex-col lg:flex-row gap-10">
              {/* Poster */}
              <div className="flex-shrink-0 w-48 sm:w-56 mx-auto lg:mx-0">
                <div className="poster-wrap rounded-xl overflow-hidden border border-cinema-border shadow-2xl shadow-cinema-black">
                  {movie.poster_url ? (
                    <Image
                      src={movie.poster_url}
                      alt={`${movie.title} movie poster`}
                      fill
                      sizes="(max-width: 1024px) 200px, 224px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-cinema-surface">
                      <span className="text-5xl opacity-20">🎬</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                {movie.average_rating > 0 && (
                  <div className="mt-4 text-center">
                    <div className="text-3xl font-bold text-film-amber">
                      {formatRating(movie.average_rating)}
                    </div>
                    <div className="flex justify-center gap-0.5 mt-1" aria-label={`${formatRating(movie.average_rating)} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.round(movie.average_rating) ? 'text-film-amber fill-current' : 'text-cinema-border'}`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="text-xs text-film-muted mt-1">
                      {movie.review_count.toLocaleString()} {movie.review_count === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-film-cream leading-tight">
                  {movie.title}
                </h1>
                {movie.original_title && movie.original_title !== movie.title && (
                  <p className="mt-1 text-film-muted italic">{movie.original_title}</p>
                )}
                {movie.tagline && (
                  <p className="mt-3 text-film-muted italic text-lg">"{movie.tagline}"</p>
                )}

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm text-film-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {movie.release_year}
                  </span>
                  <span className="flex items-center gap-1">
                    <Film className="w-3.5 h-3.5" aria-hidden="true" />
                    {capitalise(movie.genre)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                    {capitalise(movie.language)}
                  </span>
                  {movie.country && (
                    <span>{movie.country}</span>
                  )}
                  {movie.industry && movie.industry !== 'Other' && (
                    <Link
                      href={`/browse?industry=${encodeURIComponent(movie.industry)}`}
                      className="px-2 py-0.5 rounded-full bg-film-gold/10 border border-film-gold/30 text-xs text-film-amber hover:bg-film-gold/20 transition-colors"
                    >
                      {movie.industry}
                    </Link>
                  )}
                  {movie.rating && (
                    <span className="px-2 py-0.5 border border-cinema-border rounded text-xs">
                      {movie.rating}
                    </span>
                  )}
                </div>

                {/* Awards won */}
                {wonAwards.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {wonAwards.slice(0, 3).map((award) => (
                      <div
                        key={award.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-film-amber/10 border border-film-amber/20 text-xs text-film-amber"
                      >
                        <Award className="w-3 h-3" aria-hidden="true" />
                        {award.name} {award.year}
                      </div>
                    ))}
                  </div>
                )}

                {/* Synopsis */}
                <div className="mt-6 space-y-1">
                  <h2 className="sr-only">Synopsis</h2>
                  <p className="text-film-cream leading-relaxed">
                    {movie.synopsis || movie.description}
                  </p>
                </div>

                {/* Credits */}
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  {dir && (
                    <div>
                      <dt className="text-film-subtle text-xs uppercase tracking-wider">Director</dt>
                      <dd className="text-film-cream mt-1 font-medium">{dir}</dd>
                    </div>
                  )}
                  {movie.producer && (
                    <div>
                      <dt className="text-film-subtle text-xs uppercase tracking-wider">Producer</dt>
                      <dd className="text-film-cream mt-1 font-medium">{movie.producer}</dd>
                    </div>
                  )}
                  {movie.production_company && (
                    <div>
                      <dt className="text-film-subtle text-xs uppercase tracking-wider">Studio</dt>
                      <dd className="text-film-cream mt-1 font-medium">{movie.production_company}</dd>
                    </div>
                  )}
                  {movie.distribution_status && (
                    <div>
                      <dt className="text-film-subtle text-xs uppercase tracking-wider">Availability</dt>
                      <dd className="text-film-cream mt-1 font-medium">{capitalise(movie.distribution_status)}</dd>
                    </div>
                  )}
                </div>

                {/* Keywords */}
                {movie.keywords && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {movie.keywords.split(',').map(k => k.trim()).filter(Boolean).map(k => (
                      <Link
                        key={k}
                        href={`/search?q=${encodeURIComponent(k)}`}
                        className="px-2.5 py-1 rounded-full border border-cinema-border text-xs text-film-muted hover:text-film-cream hover:border-film-gold/40 transition-colors"
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#community-reviews" className="btn-gold">
                    Write a review
                  </a>
                  <WatchlistButton movieId={id} />
                  <SaveToListButton movieId={id} />
                  {movie.youtube_url && (
                    <a
                      href={movie.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost"
                    >
                      Watch here
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── WHERE TO WATCH ──────────────────────────────────────────── */}
        {movie.streaming_links && movie.streaming_links.length > 0 && (
          <section className="py-10 bg-cinema-dark border-b border-cinema-border" aria-labelledby="watch-heading">
            <div className="section-container">
              <h2 id="watch-heading" className="text-base font-semibold text-film-cream mb-4 flex items-center gap-2">
                <Play className="w-4 h-4 text-film-gold" aria-hidden="true" />
                Where to watch
              </h2>
              <div className="flex flex-wrap gap-3">
                {movie.streaming_links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cinema-border bg-cinema-black hover:border-film-gold/50 hover:bg-cinema-surface transition-colors group"
                  >
                    <span className="text-sm font-semibold text-film-cream group-hover:text-film-gold transition-colors">
                      {link.platform}
                    </span>
                    {link.free && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-film-gold/15 text-film-amber border border-film-gold/20">
                        FREE
                      </span>
                    )}
                    <ExternalLink className="w-3 h-3 text-film-subtle group-hover:text-film-gold transition-colors" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── CANON ESSAY ─────────────────────────────────────────────── */}
        {movie.is_canon && movie.canon_essay && (
          <section className="py-16 border-y border-cinema-border" aria-labelledby="canon-essay-heading">
            <div className="section-container max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-5 h-5 text-film-gold flex-shrink-0" aria-hidden="true" />
                <h2 id="canon-essay-heading" className="text-xs font-semibold text-film-gold uppercase tracking-widest">
                  African Film Canon
                </h2>
              </div>
              <blockquote className="space-y-4">
                {movie.canon_essay.split('\n\n').filter(Boolean).map((para, i) => (
                  <p key={i} className="text-film-cream leading-[1.8] text-base">
                    {para}
                  </p>
                ))}
              </blockquote>
              <p className="mt-6 text-xs text-film-subtle">
                — {movie.canon_essay_author || 'MuvieStars Editorial'}
              </p>
            </div>
          </section>
        )}

        {/* ─── CULTURAL CONTEXT ────────────────────────────────────────── */}
        {movie.cultural_context && (
          <section className="py-16 bg-cinema-dark border-y border-cinema-border" aria-labelledby="context-heading">
            <div className="section-container max-w-3xl">
              <h2 id="context-heading" className="text-lg font-semibold text-film-cream mb-4 flex items-center gap-2">
                <Quote className="w-5 h-5 text-film-gold" aria-hidden="true" />
                Cultural context
              </h2>
              <p className="text-film-muted leading-relaxed">{movie.cultural_context}</p>
            </div>
          </section>
        )}

        {/* ─── CAST & CREW ──────────────────────────────────────────────── */}
        {cast.length > 0 && (
          <section className="py-16 bg-cinema-black" aria-labelledby="cast-heading">
            <div className="section-container">
              <h2 id="cast-heading" className="text-xl font-bold text-film-cream mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-film-gold" aria-hidden="true" />
                Cast &amp; crew
              </h2>
              <div className="scroll-rail">
                {cast.map((member) => {
                  const name = member.person?.full_name ?? '—'
                  return (
                    <div
                      key={member.id}
                      className="flex-shrink-0 w-28 bg-cinema-dark rounded-lg border border-cinema-border p-3 text-center"
                    >
                      {member.person?.profile_image ? (
                        <img
                          src={member.person.profile_image}
                          alt={name}
                          className="w-14 h-14 rounded-full object-cover border border-cinema-border mx-auto mb-2"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-cinema-surface border border-cinema-border mx-auto mb-2 flex items-center justify-center text-xl text-film-muted">
                          {name.charAt(0)}
                        </div>
                      )}
                      <p className="text-xs font-semibold text-film-cream line-clamp-2">{name}</p>
                      {member.character_name ? (
                        <p className="text-[10px] text-film-muted mt-0.5 line-clamp-1">as {member.character_name}</p>
                      ) : (
                        <p className="text-[10px] text-film-subtle mt-0.5 capitalize">{member.role?.replace('_', ' ')}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── AWARDS ───────────────────────────────────────────────────── */}
        {awards.length > 0 && (
          <section className="py-16 bg-cinema-dark border-t border-cinema-border" aria-labelledby="awards-heading">
            <div className="section-container">
              <h2 id="awards-heading" className="text-xl font-bold text-film-cream mb-6 flex items-center gap-2">
                <Award className="w-5 h-5 text-film-gold" aria-hidden="true" />
                Awards and nominations
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {awards.map((award) => (
                  <div
                    key={award.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border ${
                      award.won
                        ? 'bg-film-amber/5 border-film-amber/20'
                        : 'bg-cinema-black border-cinema-border'
                    }`}
                  >
                    <Award
                      className={`w-4 h-4 flex-shrink-0 mt-0.5 ${award.won ? 'text-film-amber' : 'text-film-subtle'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${award.won ? 'text-film-amber' : 'text-film-cream'}`}>
                        {award.name}
                      </p>
                      <p className="text-xs text-film-muted mt-0.5">
                        {award.category} • {award.year}
                        {award.won && <span className="ml-2 text-film-amber font-semibold">Won</span>}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── REVIEWS ──────────────────────────────────────────────────── */}
        <section id="community-reviews" className="py-16 bg-cinema-black" aria-labelledby="reviews-heading">
          <div className="section-container">
            <h2 id="reviews-heading" className="text-xl font-bold text-film-cream mb-6">
              Community reviews
              {movie.review_count > 0 && (
                <span className="ml-2 text-base font-normal text-film-muted">
                  ({movie.review_count.toLocaleString()})
                </span>
              )}
            </h2>

            <ReviewForm movieId={id} />

            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    className="bg-cinema-dark border border-cinema-border rounded-xl p-5"
                    itemScope
                    itemType="https://schema.org/Review"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full bg-cinema-surface border border-cinema-border flex items-center justify-center text-sm text-film-muted font-semibold"
                          aria-hidden="true"
                        >
                          {(review.profile?.display_name || review.profile?.username || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p
                            className="text-sm font-semibold"
                            itemProp="author"
                            itemScope
                            itemType="https://schema.org/Person"
                          >
                            {review.profile?.username ? (
                              <Link
                                href={`/u/${review.profile.username}`}
                                className="text-film-cream hover:text-film-gold transition-colors"
                                itemProp="name"
                              >
                                {review.profile.display_name || review.profile.username}
                              </Link>
                            ) : (
                              <span itemProp="name" className="text-film-cream">
                                {review.profile?.display_name || 'MuvieStars Member'}
                              </span>
                            )}
                          </p>
                          <time
                            className="text-xs text-film-muted"
                            dateTime={review.created_at}
                            itemProp="datePublished"
                          >
                            {new Date(review.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </time>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-0.5 flex-shrink-0"
                        itemProp="reviewRating"
                        itemScope
                        itemType="https://schema.org/Rating"
                      >
                        <meta itemProp="ratingValue" content={String(review.rating)} />
                        <meta itemProp="bestRating" content="5" />
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? 'text-film-amber fill-current' : 'text-cinema-border'}`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>

                    {review.content && (
                      <p
                        className="mt-4 text-sm text-film-muted leading-relaxed"
                        itemProp="reviewBody"
                      >
                        {review.content}
                      </p>
                    )}

                    <div className="mt-3">
                      <HelpfulButton
                        reviewId={review.id}
                        initialCount={review.helpful_count || 0}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-cinema-border rounded-xl">
                <Quote className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
                <p className="text-film-muted text-sm">No reviews yet. Be the first.</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── SIMILAR FILMS ────────────────────────────────────────────── */}
        {similar.length > 0 && (
          <section className="py-16 bg-cinema-dark border-t border-cinema-border" aria-labelledby="similar-heading">
            <div className="section-container">
              <h2 id="similar-heading" className="text-xl font-bold text-film-cream mb-6">
                More {capitalise(movie.genre)} films
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {similar.map((m) => (
                  <MovieCard
                    key={m.id}
                    id={m.id}
                    title={m.title}
                    release_year={m.release_year}
                    genre={m.genre}
                    language={m.language}
                    poster_url={m.poster_url}
                    average_rating={m.average_rating}
                    review_count={m.review_count}
                    director={m.director || m.creator?.name}
                  />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}
