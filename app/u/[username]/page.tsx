import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Star, Film, Calendar, List } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/utils'

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params
  return {
    title: `@${username} — MuvieStars`,
    description: `Reviews and film ratings by @${username} on MuvieStars, Africa's movie database.`,
    alternates: { canonical: `${SITE_URL}/u/${username}` },
  }
}

export const dynamic = 'force-dynamic'

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient() as any

  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, username, bio, avatar_url, created_at')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [{ data: reviews }, { data: publicLists }] = await Promise.all([
    supabase
      .from('reviews')
      .select(`
        id, rating, content, created_at, helpful_count,
        movie:movies(id, title, release_year, poster_url, genre)
      `)
      .eq('user_id', profile.user_id)
      .eq('status', 'approved')
      .order('helpful_count', { ascending: false })
      .limit(50),

    supabase
      .from('movie_lists')
      .select('id, name, description, created_at')
      .eq('user_id', profile.user_id)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const reviewList  = (reviews as any[]) || []
  const lists       = (publicLists as any[]) || []
  const displayName = profile.display_name || `@${profile.username}`
  const initial     = displayName.charAt(0).toUpperCase()
  const joinedDate  = new Date(profile.created_at).toLocaleDateString('en-GB', {
    month: 'long', year: 'numeric',
  })

  return (
    <>
      <Navigation />

      <main className="pt-16 min-h-screen">

        {/* ─── PROFILE HEADER ─────────────────────────────────────── */}
        <section className="py-12 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container max-w-3xl">
            <div className="flex items-start gap-5">
              {/* Avatar */}
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-16 h-16 rounded-full object-cover border border-cinema-border flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-cinema-surface border border-cinema-border flex items-center justify-center text-xl font-bold text-film-gold flex-shrink-0">
                  {initial}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-film-cream">{displayName}</h1>
                <p className="text-sm text-film-subtle mt-0.5">@{profile.username}</p>

                {profile.bio && (
                  <p className="text-sm text-film-muted mt-3 max-w-lg leading-relaxed">
                    {profile.bio}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-5 mt-4">
                  <div className="text-sm">
                    <span className="font-semibold text-film-cream">{reviewList.length}</span>
                    <span className="text-film-muted ml-1">
                      {reviewList.length === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                  {lists.length > 0 && (
                    <div className="text-sm">
                      <span className="font-semibold text-film-cream">{lists.length}</span>
                      <span className="text-film-muted ml-1">
                        {lists.length === 1 ? 'list' : 'lists'}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-film-subtle">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    Member since {joinedDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── LISTS ──────────────────────────────────────────────── */}
        {lists.length > 0 && (
          <section className="section-container max-w-3xl py-8 border-b border-cinema-border">
            <h2 className="text-base font-semibold text-film-cream flex items-center gap-2 mb-4">
              <List className="w-4 h-4 text-film-gold" aria-hidden="true" />
              Lists
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lists.map((list: any) => (
                <Link
                  key={list.id}
                  href={`/lists/${list.id}`}
                  className="group bg-cinema-dark border border-cinema-border rounded-xl p-4 hover:border-film-gold/30 transition-colors"
                >
                  <p className="text-sm font-semibold text-film-cream group-hover:text-film-gold transition-colors line-clamp-1">
                    {list.name}
                  </p>
                  {list.description && (
                    <p className="text-xs text-film-subtle mt-1 line-clamp-2 leading-relaxed">
                      {list.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── REVIEWS ────────────────────────────────────────────── */}
        <section className="section-container max-w-3xl py-10">
          {reviewList.length === 0 ? (
            <div className="text-center py-16 border border-cinema-border rounded-xl">
              <Film className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-film-muted text-sm">
                {displayName} {profile.display_name ? 'hasn\'t' : 'haven\'t'} published any reviews yet.
              </p>
              <Link href="/browse" className="btn-outline text-sm mt-4 inline-flex">
                Browse films
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewList.map((review: any) => (
                <article
                  key={review.id}
                  className="bg-cinema-dark border border-cinema-border rounded-xl p-5 flex gap-4"
                  itemScope
                  itemType="https://schema.org/Review"
                >
                  {/* Poster */}
                  <Link href={`/movie/${review.movie?.id}`} className="flex-shrink-0" tabIndex={-1} aria-hidden="true">
                    {review.movie?.poster_url ? (
                      <img
                        src={review.movie.poster_url}
                        alt={review.movie?.title}
                        className="w-10 h-14 rounded object-cover border border-cinema-border"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded bg-cinema-surface border border-cinema-border flex items-center justify-center">
                        <Film className="w-4 h-4 text-film-subtle" aria-hidden="true" />
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/movie/${review.movie?.id}`}
                      className="text-sm font-semibold text-film-cream hover:text-film-gold transition-colors"
                      itemProp="itemReviewed"
                      itemScope
                      itemType="https://schema.org/Movie"
                    >
                      <span itemProp="name">{review.movie?.title}</span>
                    </Link>
                    <span className="text-xs text-film-subtle ml-1.5">
                      ({review.movie?.release_year})
                    </span>

                    <div
                      className="flex items-center gap-0.5 mt-1.5"
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

                    {review.content && (
                      <p
                        className="text-xs text-film-muted mt-2 leading-relaxed line-clamp-3"
                        itemProp="reviewBody"
                      >
                        {review.content}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2.5">
                      <time
                        className="text-[10px] text-film-subtle"
                        dateTime={review.created_at}
                        itemProp="datePublished"
                      >
                        {new Date(review.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </time>
                      {review.helpful_count > 0 && (
                        <span className="text-[10px] text-film-subtle">
                          {review.helpful_count} {review.helpful_count === 1 ? 'person' : 'people'} found this helpful
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer />
    </>
  )
}
