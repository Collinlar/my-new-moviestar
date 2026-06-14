import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Star, Bookmark, Clock, CheckCircle, XCircle, Film, List } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { EditProfileForm } from '@/components/EditProfileForm'
import { createClient } from '@/lib/supabase/server'
import { formatRating } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'My Account — MuvieStars',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

const STATUS_META = {
  approved: { label: 'Published',  icon: CheckCircle, cls: 'text-green-400' },
  pending:  { label: 'Pending',    icon: Clock,       cls: 'text-film-gold'  },
  rejected: { label: 'Not approved', icon: XCircle,  cls: 'text-red-400'    },
} as const

export default async function AccountPage() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, reviewsRes, watchlistRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, username, bio, avatar_url, role, created_at')
      .eq('user_id', user.id)
      .single(),

    supabase
      .from('reviews')
      .select('id, rating, content, status, created_at, movie:movies(id, title, release_year, poster_url, genre)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),

    supabase
      .from('watchlists')
      .select('id, added_at, movie:movies(id, title, release_year, poster_url, genre, average_rating, review_count)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(50),
  ])

  const profile    = profileRes.data
  const reviews    = (reviewsRes.data as any[])   || []
  const watchlist  = (watchlistRes.data as any[]) || []

  const approvedCount = reviews.filter(r => r.status === 'approved').length
  const pendingCount  = reviews.filter(r => r.status === 'pending').length
  const displayName   = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Member'

  return (
    <>
      <Navigation />
      <main className="pt-16 min-h-screen">

        {/* ─── PROFILE HEADER ─────────────────────────────────────── */}
        <section className="py-12 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {profile?.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={displayName}
                    width={80}
                    height={80}
                    className="w-20 h-20 rounded-full object-cover border-2 border-cinema-border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-cinema-surface border-2 border-cinema-border flex items-center justify-center text-2xl font-bold text-film-gold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-film-cream">{displayName}</h1>
                {profile?.username && (
                  <p className="text-film-muted text-sm mt-0.5">@{profile.username}</p>
                )}
                {profile?.bio && (
                  <p className="text-film-muted text-sm mt-3 max-w-lg leading-relaxed">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-film-cream">{approvedCount}</div>
                    <div className="text-xs text-film-muted">Reviews published</div>
                  </div>
                  {pendingCount > 0 && (
                    <div className="text-center">
                      <div className="text-xl font-bold text-film-gold">{pendingCount}</div>
                      <div className="text-xs text-film-muted">Pending approval</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-xl font-bold text-film-cream">{watchlist.length}</div>
                    <div className="text-xs text-film-muted">On watchlist</div>
                  </div>
                  <Link href="/account/lists" className="text-center group">
                    <div className="text-xl font-bold text-film-cream group-hover:text-film-gold transition-colors flex items-center justify-center gap-1">
                      <List className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="text-xs text-film-muted group-hover:text-film-cream transition-colors">My lists</div>
                  </Link>
                </div>

                <div className="mt-4">
                  <EditProfileForm userId={user.id} profile={profile ?? { display_name: null, username: null, bio: null, avatar_url: null }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── MY REVIEWS ─────────────────────────────────────────── */}
        <section className="section-container py-12">
          <h2 className="text-xl font-bold text-film-cream mb-6 flex items-center gap-2">
            <Star className="w-5 h-5 text-film-gold" aria-hidden="true" />
            My reviews
            <span className="text-base font-normal text-film-muted">({reviews.length})</span>
          </h2>

          {reviews.length === 0 ? (
            <div className="text-center py-16 border border-cinema-border rounded-xl">
              <Film className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-film-muted text-sm mb-4">You have not reviewed any films yet.</p>
              <Link href="/browse" className="btn-gold text-sm">Browse films</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review: any) => {
                const status = review.status as keyof typeof STATUS_META
                const meta   = STATUS_META[status] ?? STATUS_META.pending
                const Icon   = meta.icon
                return (
                  <article key={review.id}
                    className="bg-cinema-dark border border-cinema-border rounded-xl p-4 flex items-start gap-4">
                    {/* Poster */}
                    {review.movie?.poster_url ? (
                      <Link href={`/movie/${review.movie.id}`} className="flex-shrink-0">
                        <img
                          src={review.movie.poster_url}
                          alt={review.movie.title}
                          className="w-10 h-14 rounded object-cover border border-cinema-border"
                          loading="lazy"
                        />
                      </Link>
                    ) : (
                      <div className="w-10 h-14 rounded bg-cinema-surface border border-cinema-border flex-shrink-0 flex items-center justify-center">
                        <Film className="w-4 h-4 text-film-subtle" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <Link href={`/movie/${review.movie?.id}`}
                            className="font-semibold text-film-cream hover:text-film-gold transition-colors text-sm">
                            {review.movie?.title}
                          </Link>
                          <span className="text-film-muted text-xs ml-2">({review.movie?.release_year})</span>
                        </div>
                        <span className={`flex items-center gap-1 text-xs font-medium ${meta.cls}`}>
                          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                          {meta.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i}
                            className={`w-3 h-3 ${i < review.rating ? 'text-film-amber fill-current' : 'text-cinema-border'}`}
                            aria-hidden="true" />
                        ))}
                        <span className="text-xs text-film-muted ml-1">{review.rating}/5</span>
                      </div>

                      {review.content && (
                        <p className="text-xs text-film-muted mt-2 leading-relaxed line-clamp-2">{review.content}</p>
                      )}

                      <time className="block text-[10px] text-film-subtle mt-1.5"
                        dateTime={review.created_at}>
                        {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </time>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {/* ─── MY WATCHLIST ───────────────────────────────────────── */}
        <section className="section-container py-12 border-t border-cinema-border">
          <h2 className="text-xl font-bold text-film-cream mb-6 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-film-gold" aria-hidden="true" />
            My watchlist
            <span className="text-base font-normal text-film-muted">({watchlist.length})</span>
          </h2>

          {watchlist.length === 0 ? (
            <div className="text-center py-16 border border-cinema-border rounded-xl">
              <Bookmark className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-film-muted text-sm mb-4">Your watchlist is empty. Save films to watch later.</p>
              <Link href="/browse" className="btn-gold text-sm">Browse films</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {watchlist.map((item: any) => (
                <Link key={item.id} href={`/movie/${item.movie?.id}`}
                  className="group relative rounded-lg overflow-hidden border border-cinema-border bg-cinema-dark hover:border-film-gold/40 transition-colors">
                  <div className="aspect-[2/3] relative bg-cinema-surface">
                    {item.movie?.poster_url ? (
                      <img
                        src={item.movie.poster_url}
                        alt={item.movie.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Film className="w-8 h-8 text-film-subtle" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-cinema-black/80 to-transparent" />
                    <div className="absolute bottom-2 inset-x-2">
                      <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">{item.movie?.title}</p>
                      <p className="text-[10px] text-white/60 mt-0.5">{item.movie?.release_year}</p>
                    </div>
                  </div>
                  {item.movie?.average_rating > 0 && (
                    <div className="p-2 flex items-center gap-1">
                      <Star className="w-3 h-3 text-film-amber fill-current" aria-hidden="true" />
                      <span className="text-xs font-medium text-film-cream">{formatRating(item.movie.average_rating)}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>
      <Footer />
    </>
  )
}
