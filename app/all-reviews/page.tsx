import type { Metadata } from 'next'
import Link from 'next/link'
import { Star, MessageSquare } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { HelpfulButton } from '@/components/HelpfulButton'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL, formatRating } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Community Reviews of African Films',
  description:
    'Read the latest community reviews of African movies from MuvieStars members. Discover what people think about Nollywood, Ghallywood, and African cinema.',
  alternates: { canonical: `${SITE_URL}/all-reviews` },
}

export const revalidate = 1800

export default async function AllReviewsPage() {
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select(`
      id, rating, content, created_at, helpful_count,
      movie:movies(id, title, release_year, genre, poster_url),
      profile:profiles(username, display_name, avatar_url)
    `)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <>
      <Navigation />

      <main className="pt-16">
        <section className="py-14 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <h1 className="text-3xl font-bold text-film-cream flex items-center gap-3">
              <MessageSquare className="w-7 h-7 text-film-gold" aria-hidden="true" />
              Community reviews
            </h1>
            <p className="mt-2 text-film-muted">
              The latest thoughts from MuvieStars members on African cinema.
            </p>
          </div>
        </section>

        <div className="section-container py-12">
          {reviews && reviews.length > 0 ? (
            <div className="space-y-5">
              {reviews.map((review: any) => (
                <article
                  key={review.id}
                  className="bg-cinema-dark border border-cinema-border rounded-xl p-5"
                  itemScope
                  itemType="https://schema.org/Review"
                >
                  <div className="flex items-start gap-4">
                    {/* Movie poster thumbnail */}
                    {review.movie?.poster_url && (
                      <Link href={`/movie/${review.movie.id}`} className="flex-shrink-0">
                        <div className="w-12 h-16 rounded overflow-hidden bg-cinema-surface">
                          <img
                            src={review.movie.poster_url}
                            alt={review.movie.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </Link>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Movie link */}
                      {review.movie && (
                        <Link
                          href={`/movie/${review.movie.id}`}
                          className="text-base font-semibold text-film-cream hover:text-film-gold transition-colors"
                          itemProp="itemReviewed"
                          itemScope
                          itemType="https://schema.org/Movie"
                        >
                          <span itemProp="name">{review.movie.title}</span>
                          {' '}
                          <span className="text-film-muted font-normal text-sm">({review.movie.release_year})</span>
                        </Link>
                      )}

                      <div className="flex items-center gap-3 mt-1.5">
                        {/* Stars */}
                        <div
                          className="flex gap-0.5"
                          itemProp="reviewRating"
                          itemScope
                          itemType="https://schema.org/Rating"
                        >
                          <meta itemProp="ratingValue" content={String(review.rating)} />
                          <meta itemProp="bestRating" content="5" />
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < review.rating ? 'text-film-amber fill-current' : 'text-cinema-border'}`}
                              aria-hidden="true"
                            />
                          ))}
                        </div>

                        {/* Author */}
                        <span
                          className="text-xs text-film-muted"
                          itemProp="author"
                          itemScope
                          itemType="https://schema.org/Person"
                        >
                          by{' '}
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
                              {review.profile?.display_name || 'Member'}
                            </span>
                          )}
                        </span>

                        <time
                          className="text-xs text-film-subtle"
                          dateTime={review.created_at}
                          itemProp="datePublished"
                        >
                          {new Date(review.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </time>
                      </div>

                      {review.content && (
                        <p className="mt-3 text-sm text-film-muted leading-relaxed line-clamp-3" itemProp="reviewBody">
                          {review.content}
                        </p>
                      )}

                      <div className="mt-3">
                        <HelpfulButton
                          reviewId={review.id}
                          initialCount={review.helpful_count || 0}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <MessageSquare className="w-10 h-10 text-film-subtle mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-film-cream mb-2">No reviews yet</h2>
              <p className="text-film-muted mb-6">Be the first to review an African film.</p>
              <Link href="/browse" className="btn-gold">Browse films to review</Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
