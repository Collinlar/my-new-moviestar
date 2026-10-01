import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getPublishedChallenges } from '@/lib/challenges'
import { challengeState, goalPhrase, sponsorLabel, stateLine } from '@/lib/challenges-shared'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Challenges: Watch a Set of African Films, Earn a Laurel',
  description: 'Short challenges built on hand-picked decks. Take a handful of films before the window closes and earn a laurel you can share.',
  alternates: { canonical: `${SITE_URL}/challenges` },
}

export const dynamic = 'force-dynamic'

export default async function ChallengesPage() {
  const challenges = await getPublishedChallenges({ limit: 60 })
  const now = new Date()
  const current = challenges.filter((c) => challengeState(c, now) !== 'ended')
  const past = challenges.filter((c) => challengeState(c, now) === 'ended')

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Discover', url: `${SITE_URL}/discover` },
    { name: 'Challenges', url: `${SITE_URL}/challenges` },
  ])

  const row = (c: (typeof challenges)[number], muted = false) => {
    const sponsor = sponsorLabel(c)
    return (
      <li key={c.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
        <Link
          href={`/challenges/${c.slug}`}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center"
          style={{ padding: '32px 0', textDecoration: 'none', minHeight: '44px', opacity: muted ? 0.65 : 1 }}
        >
          <span style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
            <span style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C857A' }}>
              <span style={{ color: challengeState(c, now) === 'open' ? '#C8963E' : '#8C857A' }}>{stateLine(c, now)}</span>
              <span>{goalPhrase(c.goal, c.film_count)}</span>
              {c.kind === 'club_paired' && <span>Plus the Club film</span>}
              {sponsor && <span style={{ color: '#C8963E' }}>{sponsor}</span>}
            </span>
            <span style={{ ...SERIF, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.02, color: '#F6EFE2' }}>{c.title}</span>
            {c.description && <span style={{ fontSize: '17px', lineHeight: 1.55, color: '#A39B8F', maxWidth: '620px' }}>{c.description}</span>}
          </span>
          {c.posters.length > 0 && (
            <span aria-hidden="true" style={{ display: 'flex', gap: '8px' }}>
              {c.posters.map((p) => (
                <img key={p} src={p} alt="" width={64} height={96} loading="lazy" style={{ width: '64px', height: '96px', objectFit: 'cover', borderRadius: '8px', background: '#15120E' }} />
              ))}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <header style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '56px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Challenges</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              A few films. One window.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.55, color: '#C7BFB2' }}>
              Join a challenge, say what you thought of each film in it, and finish before the clock runs out. Finish and you earn a laurel to share.
            </p>
          </header>

          {current.length === 0 && past.length === 0 ? (
            <p style={{ fontSize: '17px', color: '#8C857A', lineHeight: 1.6, maxWidth: '520px' }}>
              No challenges are running right now. Have a look at the <Link href="/decks" style={{ color: '#C8963E', textDecoration: 'none' }}>decks</Link> in the meantime.
            </p>
          ) : (
            <>
              {current.length > 0 && <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{current.map((c) => row(c))}</ul>}
              {past.length > 0 && (
                <section aria-labelledby="past-heading" style={{ paddingTop: '64px' }}>
                  <h2 id="past-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 8px' }}>Recently ended</h2>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{past.map((c) => row(c, true))}</ul>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
