import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getFeaturedMovies, getTrendingMovies } from '@/lib/queries'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'MuvieStars Club — One Film, Every Week',
  description: "Every Monday, MuvieStars picks one film from the African cinema archive. The community watches it together and reacts over the week.",
  alternates: { canonical: 'https://muviestars.com/club' },
}

export const revalidate = 3600

function daysLeftThisWeek(): number {
  const day = new Date().getDay()
  const daysSinceMonday = (day - 1 + 7) % 7
  return 7 - daysSinceMonday
}

export default async function ClubPage() {
  const featured  = await getFeaturedMovies(1)
  const clubPick  = featured[0] || (await getTrendingMovies(1))[0] || null
  const daysLeft  = daysLeftThisWeek()

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

      </main>

      <Footer />
    </>
  )
}
