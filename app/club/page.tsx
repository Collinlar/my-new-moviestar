import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getFeaturedMovies, getTrendingMovies, getMovieVerdict, getPreviousClubCycles, getMovieById } from '@/lib/queries'
import { ClubParticipationBar } from '@/components/ClubParticipationBar'
import { CommunityVerdict } from '@/components/CommunityVerdict'
import { createClient } from '@/lib/supabase/server'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'MuvieStars Club — One Film, Every Week',
  description: "Every Monday, MuvieStars picks one film from the African cinema archive. The community watches it together and reacts over the week.",
  alternates: { canonical: 'https://muviestars.com/club' },
}

export const dynamic = 'force-dynamic'

function daysLeftThisWeek(): number {
  const day = new Date().getDay()
  const daysSinceMonday = (day - 1 + 7) % 7
  return 7 - daysSinceMonday
}

export default async function ClubPage() {
  const supabase  = await createClient() as any
  const featured  = await getFeaturedMovies(1)
  const clubPick  = featured[0] || (await getTrendingMovies(1))[0] || null
  const daysLeft  = daysLeftThisWeek()

  const { data: { user } } = await supabase.auth.getUser()

  let participantCount = 0
  let userStatus: 'watching' | 'completed' | null = null

  if (clubPick?.id) {
    try {
      const [{ count }, { data: myRow }] = await Promise.all([
        supabase
          .from('club_participation')
          .select('*', { count: 'exact', head: true })
          .eq('movie_id', clubPick.id),
        user
          ? supabase
              .from('club_participation')
              .select('status')
              .eq('movie_id', clubPick.id)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      participantCount = (count as number) || 0
      userStatus = (myRow?.status as 'watching' | 'completed' | null) ?? null
    } catch {
      // club_participation table may not exist yet — fail gracefully
    }
  }

  // Verdict for the current club pick
  const clubVerdict = clubPick?.id ? await getMovieVerdict(clubPick.id) : null

  // Previous club cycles with their movies
  const prevCycles = await getPreviousClubCycles(6)
  const prevMovies: Record<string, NonNullable<Awaited<ReturnType<typeof getMovieById>>>> = {}
  await Promise.all(
    prevCycles.map(async (cycle) => {
      const m = await getMovieById(cycle.movie_id)
      if (m) prevMovies[cycle.movie_id] = m
    })
  )

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section
          style={{
            background: '#12242B', position: 'relative', overflow: 'hidden',
            paddingTop: '76px', minHeight: '680px', display: 'grid', alignItems: 'center',
          }}
        >
          {/* Decorative arch */}
          <div style={{ position: 'absolute', right: '8%', top: '40px', width: '440px', height: '580px', borderRadius: '220px 220px 0 0', background: '#C8963E', opacity: 0.85 }} />
          <div style={{ position: 'absolute', right: 'calc(8% + 110px)', top: '120px', width: '220px', height: '220px', borderRadius: '50%', background: '#12242B' }} />
          <div className="ms-grain" />

          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20 w-full" style={{ position: 'relative' }}>
            <div
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))',
                columnGap: '24px', alignItems: 'center',
                paddingTop: '48px', paddingBottom: '64px',
              }}
            >
              <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{
                    height: '30px', padding: '0 14px', borderRadius: '999px',
                    background: '#C8963E', color: '#0B0A09',
                    ...MONO, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
                    display: 'inline-flex', alignItems: 'center',
                  }}>
                    MuvieStars Club
                  </span>
                  <span style={{ fontSize: '14px', color: '#B9C7CC' }}>
                    {daysLeft === 1 ? 'Last day this week' : `${daysLeft} days left`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                    This week&apos;s pick
                  </p>
                  <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(52px,7vw,104px)', lineHeight: '0.92', color: '#F6EFE2', margin: 0 }}>
                    {clubPick?.title || 'African Cinema'}
                  </h1>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {([
                    clubPick?.release_year?.toString(),
                    clubPick?.country,
                    clubPick?.genre,
                    clubPick?.director ? `Dir. ${clubPick.director}` : null,
                  ] as (string | null | undefined)[]).filter(Boolean).map((item, i) => (
                    <span
                      key={i}
                      style={{
                        height: '28px', padding: '0 12px', borderRadius: '999px',
                        background: 'rgba(237,228,210,0.08)', border: '1px solid rgba(237,228,210,0.12)',
                        fontSize: '14px', color: '#C9D4D7', display: 'inline-flex', alignItems: 'center',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {clubPick?.description && (
                  <p style={{ margin: 0, maxWidth: '560px', fontSize: '18px', lineHeight: '1.6', color: '#C9D4D7' }}>
                    {clubPick.description.length > 280
                      ? clubPick.description.slice(0, 280).trimEnd() + '...'
                      : clubPick.description}
                  </p>
                )}

                {clubPick && (
                  <ClubParticipationBar
                    movie={clubPick}
                    participantCount={participantCount}
                    initialStatus={userStatus}
                    userId={user?.id ?? null}
                  />
                )}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {clubPick?.youtube_url && (
                    <a
                      href={clubPick.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        height: '56px', padding: '0 28px', borderRadius: '16px',
                        background: '#EDE4D2', color: '#0B0A09',
                        fontSize: '16px', fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none',
                      }}
                    >
                      Watch the film
                      <ArrowRight size={18} />
                    </a>
                  )}
                  {clubPick?.id && (
                    <Link
                      href={`/movie/${clubPick.id}`}
                      style={{
                        height: '56px', padding: '0 28px', borderRadius: '16px',
                        border: '1px solid rgba(237,228,210,0.18)',
                        color: '#EDE4D2', fontSize: '16px', fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none',
                      }}
                    >
                      Read more and rate
                    </Link>
                  )}
                  {!clubPick && (
                    <Link
                      href="/browse"
                      style={{
                        height: '56px', padding: '0 28px', borderRadius: '16px',
                        background: '#EDE4D2', color: '#0B0A09',
                        fontSize: '16px', fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        textDecoration: 'none',
                      }}
                    >
                      Browse the archive
                      <ArrowRight size={18} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CLUB VERDICT ─────────────────────────────────────────────── */}
        {clubVerdict && clubPick && (
          <CommunityVerdict verdict={clubVerdict} movieTitle={clubPick.title} />
        )}

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '100px', paddingBottom: '120px', display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))', columnGap: '24px' }}
        >
          <div style={{ gridColumn: 'span 6', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              How it works
            </p>
            <h2 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: '1', color: '#F6EFE2', margin: 0 }}>
              One film. Every week. Watched together.
            </h2>
            <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.65', color: '#C7BFB2' }}>
              Every Monday, MuvieStars selects one film from the African cinema archive. The community watches it together and reacts over the week.
            </p>
            <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.65', color: '#C7BFB2' }}>
              The picks go deeper than what&apos;s trending. Directors you haven&apos;t discovered. Countries you haven&apos;t explored. Decades the algorithms forgot.
            </p>
          </div>

          <div style={{ gridColumn: '8 / span 5', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { n: '01', title: 'A new film every Monday', body: 'Selected from across the full archive — Nollywood, Ghallywood, Francophone Africa, East Africa, and beyond.' },
              { n: '02', title: 'Watch on your own time', body: 'No scheduled watch party. Just catch the film before the week is up and come back to react.' },
              { n: '03', title: 'Rate and discuss', body: 'Your verdict adds to the community picture of what the film is actually like.' },
            ].map(({ n, title, body }) => (
              <div
                key={n}
                style={{ display: 'flex', gap: '20px', paddingTop: '24px', paddingBottom: '24px', borderTop: '1px solid rgba(237,228,210,0.1)' }}
              >
                <span style={{ ...SERIF, fontSize: '28px', color: '#6E675E', flexShrink: 0, lineHeight: 1, paddingTop: '4px' }}>{n}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '17px', fontWeight: 500, color: '#F6EFE2' }}>{title}</div>
                  <div style={{ fontSize: '15px', color: '#A39B8F', lineHeight: '1.55' }}>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── PREVIOUS PICKS ───────────────────────────────────────────── */}
        {prevCycles.length > 0 && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '80px', paddingBottom: '100px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                  Previous picks
                </p>
                <p style={{ margin: 0, fontSize: '18px', color: '#A39B8F' }}>
                  Films the club has already watched together.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '20px',
                }}
              >
                {prevCycles.map((cycle) => {
                  const m = prevMovies[cycle.movie_id]
                  if (!m) return null
                  const ended = new Date(cycle.ends_at)
                  const label = ended.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                  return (
                    <Link
                      key={cycle.id}
                      href={`/movie/${m.id}`}
                      style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '2/3', background: '#15120E' }}>
                        {m.poster_url ? (
                          <img
                            src={m.poster_url}
                            alt={`${m.title} poster`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
                            loading="lazy"
                          />
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', opacity: 0.2 }}>
                            🎬
                          </div>
                        )}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          padding: '8px 10px',
                          background: 'linear-gradient(to top, rgba(11,10,9,0.9) 0%, transparent 100%)',
                        }}>
                          <span style={{ ...MONO, fontSize: '10px', color: '#A39B8F', letterSpacing: '0.06em' }}>
                            Week {cycle.cycle_number} · {label}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#F6EFE2', lineHeight: 1.3 }}>{m.title}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#8C857A' }}>{m.release_year}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </>
  )
}
