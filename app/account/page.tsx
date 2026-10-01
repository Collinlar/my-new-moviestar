import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { EditProfileForm } from '@/components/EditProfileForm'
import { SignOutButton } from '@/components/SignOutButton'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Your account — MuvieStars',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const REACTION_META: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  loved:      { emoji: '❤️', label: 'Loved',      color: '#C8963E', bg: 'rgba(200,150,62,0.15)'  },
  liked:      { emoji: '👍', label: 'Liked',       color: '#7FA88B', bg: 'rgba(127,168,139,0.15)' },
  okay:       { emoji: '😐', label: 'Okay',        color: '#8FA8C8', bg: 'rgba(143,168,200,0.15)' },
  not_for_me: { emoji: '👎', label: 'Not for me',  color: '#8C857A', bg: 'rgba(140,133,122,0.12)' },
}

export default async function AccountPage() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const [profileRes, reviewsRes, watchlistRes, reactionsRes] = await Promise.all([
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
      .select('id, added_at, movie:movies(id, title, release_year, poster_url, genre, average_rating)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false })
      .limit(48),

    supabase
      .from('movie_reactions')
      .select('id, reaction, created_at, movie:movies(id, title, release_year, poster_url, genre)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(48),
  ])

  const profile   = profileRes.data
  const reviews   = (reviewsRes.data   as any[]) || []
  const watchlist = (watchlistRes.data as any[]) || []
  const reactions = (reactionsRes.data as any[]) || []

  const displayName = profile?.display_name || profile?.username || user.email?.split('@')[0] || 'Member'
  const initial     = displayName.charAt(0).toUpperCase()

  // Reaction counts
  const reactionCounts = reactions.reduce((acc: Record<string, number>, r: any) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const totalReactions = reactions.length
  const approvedReviews = reviews.filter((r: any) => r.status === 'approved').length

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', minHeight: '100vh', paddingTop: '64px' }}>

        {/* ── PROFILE HEADER ─────────────────────────────────────────── */}
        <section style={{ background: '#12242B', paddingTop: '48px', paddingBottom: '56px' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

              {/* Avatar + name + sign out */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(237,228,210,0.15)', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '50%', flexShrink: 0,
                    background: '#1D2E37', border: '2px solid rgba(237,228,210,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ...SERIF, fontSize: '28px', color: '#C8963E',
                  }}>
                    {initial}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <h1 style={{ ...SERIF, fontSize: 'clamp(28px,4vw,48px)', fontWeight: 400, color: '#F6EFE2', margin: 0, lineHeight: 1 }}>
                      {displayName}
                    </h1>
                    {profile?.role === 'admin' && (
                      <span style={{
                        height: '22px', padding: '0 10px', borderRadius: '999px',
                        background: 'rgba(200,150,62,0.15)', color: '#C8963E',
                        ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                        display: 'inline-flex', alignItems: 'center',
                      }}>
                        Admin
                      </span>
                    )}
                  </div>
                  {profile?.username && (
                    <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: '6px 0 0' }}>@{profile.username}</p>
                  )}
                  {profile?.bio && (
                    <p style={{ fontSize: '16px', color: '#A39B8F', margin: '12px 0 0', maxWidth: '520px', lineHeight: 1.6 }}>
                      {profile.bio}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href="/dna"
                    style={{ minHeight: '44px', padding: '0 18px', borderRadius: '12px', border: '1px solid rgba(200,150,62,0.5)', color: '#C8963E', fontSize: '14px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                  >
                    See my Movie DNA
                  </Link>
                  <SignOutButton />
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                {[
                  { value: totalReactions, label: 'films reacted to' },
                  { value: watchlist.length, label: 'on watch later' },
                  { value: approvedReviews, label: 'reviews published' },
                ].map(({ value, label }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ ...SERIF, fontSize: '36px', lineHeight: 1, color: '#F6EFE2' }}>{value}</span>
                    <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.08em', color: '#6A6258' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Edit profile */}
              <div>
                <EditProfileForm
                  userId={user.id}
                  profile={profile ?? { display_name: null, username: null, bio: null, avatar_url: null }}
                />
              </div>

            </div>
          </div>
        </section>

        {/* ── MY REACTIONS ────────────────────────────────────────────── */}
        <section style={{ paddingTop: '64px', paddingBottom: '64px', borderTop: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                    Your reactions
                  </p>
                  <h2 style={{ ...SERIF, fontSize: 'clamp(28px,3vw,40px)', fontWeight: 400, color: '#F6EFE2', margin: 0, lineHeight: 1 }}>
                    Films you&apos;ve seen
                  </h2>
                </div>

                {/* Reaction breakdown pills */}
                {totalReactions > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {Object.entries(REACTION_META).map(([key, meta]) => {
                      const count = reactionCounts[key] || 0
                      if (count === 0) return null
                      return (
                        <span key={key} style={{
                          height: '30px', padding: '0 12px', borderRadius: '999px',
                          background: meta.bg, color: meta.color,
                          fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px',
                          ...MONO,
                        }}>
                          {meta.emoji} {count}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>

              {reactions.length === 0 ? (
                <div style={{
                  padding: '48px 24px', borderRadius: '20px',
                  border: '1px solid rgba(237,228,210,0.08)',
                  textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
                }}>
                  <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>
                    No reactions yet. Swipe through a few films.
                  </p>
                  <Link
                    href="/swipe"
                    style={{
                      height: '44px', padding: '0 20px', borderRadius: '12px',
                      background: '#C8963E', color: '#0B0A09',
                      fontSize: '15px', fontWeight: 600, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    Start swiping
                  </Link>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '14px',
                }}>
                  {reactions.map((r: any) => {
                    const meta = REACTION_META[r.reaction]
                    const m = r.movie
                    if (!m) return null
                    return (
                      <Link
                        key={r.id}
                        href={`/movie/${m.id}`}
                        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '2/3', background: '#15120E' }}>
                          {m.poster_url ? (
                            <img
                              src={m.poster_url}
                              alt={m.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.2 }}>
                              🎬
                            </div>
                          )}
                          {/* Reaction badge */}
                          {meta && (
                            <div style={{
                              position: 'absolute', bottom: '8px', right: '8px',
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: meta.bg,
                              backdropFilter: 'blur(4px)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '14px',
                            }}>
                              {meta.emoji}
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {m.title}
                          </p>
                          <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>{m.release_year}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── WATCH LATER ─────────────────────────────────────────────── */}
        <section style={{ paddingTop: '56px', paddingBottom: '64px', borderTop: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                  Watch later
                </p>
                <h2 style={{ ...SERIF, fontSize: 'clamp(28px,3vw,40px)', fontWeight: 400, color: '#F6EFE2', margin: 0, lineHeight: 1 }}>
                  Your list
                  {watchlist.length > 0 && (
                    <span style={{ ...MONO, fontSize: '16px', fontStyle: 'normal', color: '#6A6258', marginLeft: '12px' }}>
                      {watchlist.length}
                    </span>
                  )}
                </h2>
              </div>

              {watchlist.length === 0 ? (
                <div style={{
                  padding: '48px 24px', borderRadius: '20px',
                  border: '1px solid rgba(237,228,210,0.08)',
                  textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
                }}>
                  <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>
                    Nothing saved yet. Tap &ldquo;Watch Later&rdquo; while swiping or from any film page.
                  </p>
                  <Link
                    href="/swipe"
                    style={{
                      height: '44px', padding: '0 20px', borderRadius: '12px',
                      border: '1px solid rgba(237,228,210,0.15)', color: '#EDE4D2',
                      fontSize: '15px', fontWeight: 500, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    Start swiping
                  </Link>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '14px',
                }}>
                  {watchlist.map((item: any) => {
                    const m = item.movie
                    if (!m) return null
                    return (
                      <Link
                        key={item.id}
                        href={`/movie/${m.id}`}
                        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '2/3', background: '#15120E' }}>
                          {m.poster_url ? (
                            <img
                              src={m.poster_url}
                              alt={m.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                          ) : (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.2 }}>
                              🎬
                            </div>
                          )}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {m.title}
                          </p>
                          <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>{m.release_year}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── MY REVIEWS ──────────────────────────────────────────────── */}
        <section style={{ paddingTop: '56px', paddingBottom: '64px', borderTop: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                  Your writing
                </p>
                <h2 style={{ ...SERIF, fontSize: 'clamp(28px,3vw,40px)', fontWeight: 400, color: '#F6EFE2', margin: 0, lineHeight: 1 }}>
                  Reviews
                  {reviews.length > 0 && (
                    <span style={{ ...MONO, fontSize: '16px', fontStyle: 'normal', color: '#6A6258', marginLeft: '12px' }}>
                      {reviews.length}
                    </span>
                  )}
                </h2>
              </div>

              {reviews.length === 0 ? (
                <div style={{
                  padding: '48px 24px', borderRadius: '20px',
                  border: '1px solid rgba(237,228,210,0.08)',
                  textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
                }}>
                  <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>
                    No reviews yet. Write your first one from any film page.
                  </p>
                  <Link
                    href="/browse"
                    style={{
                      height: '44px', padding: '0 20px', borderRadius: '12px',
                      border: '1px solid rgba(237,228,210,0.15)', color: '#EDE4D2',
                      fontSize: '15px', fontWeight: 500, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    Browse films
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '760px' }}>
                  {reviews.map((review: any) => {
                    const m = review.movie
                    const isPending  = review.status === 'pending'
                    const isRejected = review.status === 'rejected'
                    return (
                      <div
                        key={review.id}
                        style={{
                          display: 'flex', gap: '16px', alignItems: 'flex-start',
                          padding: '16px 20px', borderRadius: '16px',
                          background: '#15120E', border: '1px solid rgba(237,228,210,0.08)',
                        }}
                      >
                        {m?.poster_url ? (
                          <Link href={`/movie/${m.id}`} style={{ flexShrink: 0 }}>
                            <img
                              src={m.poster_url}
                              alt={m.title}
                              style={{ width: '36px', height: '52px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(237,228,210,0.08)' }}
                              loading="lazy"
                            />
                          </Link>
                        ) : (
                          <div style={{ width: '36px', height: '52px', borderRadius: '6px', background: '#1D1A16', flexShrink: 0 }} />
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                            <Link href={`/movie/${m?.id}`} style={{ textDecoration: 'none' }}>
                              <span style={{ fontSize: '15px', fontWeight: 500, color: '#F6EFE2' }}>{m?.title}</span>
                              <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', marginLeft: '8px' }}>{m?.release_year}</span>
                            </Link>
                            <span style={{
                              ...MONO, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: isPending ? '#C8963E' : isRejected ? '#8C5A5A' : '#7FA88B',
                            }}>
                              {isPending ? 'Pending' : isRejected ? 'Not approved' : 'Published'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '2px', marginTop: '6px' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                background: i < review.rating ? '#C8963E' : 'rgba(237,228,210,0.1)',
                              }} />
                            ))}
                          </div>

                          {review.content && (
                            <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#8C857A', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {review.content}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── LINKS ───────────────────────────────────────────────────── */}
        <section style={{ paddingTop: '32px', paddingBottom: '80px', borderTop: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Link
                href="/account/lists"
                style={{
                  height: '44px', padding: '0 20px', borderRadius: '12px',
                  border: '1px solid rgba(237,228,210,0.12)', color: '#A39B8F',
                  fontSize: '14px', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  ...MONO,
                }}
              >
                My lists →
              </Link>
              {profile?.username && (
                <Link
                  href={`/u/${profile.username}`}
                  style={{
                    height: '44px', padding: '0 20px', borderRadius: '12px',
                    border: '1px solid rgba(237,228,210,0.12)', color: '#A39B8F',
                    fontSize: '14px', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    ...MONO,
                  }}
                >
                  Public profile →
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
