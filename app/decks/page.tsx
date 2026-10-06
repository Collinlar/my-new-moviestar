import type { Metadata } from 'next'
import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getPublishedDecks, sponsorLabel } from '@/lib/decks'
import { MOOD_MAP } from '@/lib/mood'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Decks: Hand-Picked Sets of African Films to Swipe',
  description: 'Short, hand-built sets of African films. Pick a deck, swipe through it, and tell us what you thought of each one.',
  alternates: { canonical: `${SITE_URL}/decks` },
}

export const dynamic = 'force-dynamic'

export default async function DecksPage() {
  const decks = await getPublishedDecks({ limit: 60 })
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Discover', url: `${SITE_URL}/discover` },
    { name: 'Decks', url: `${SITE_URL}/decks` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <header style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '56px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Decks</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              Pick a deck. Swipe it.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.55, color: '#C7BFB2' }}>
              Each deck is a short set of listed films, put together by a person around one idea.
            </p>
          </header>

          {decks.length === 0 ? (
            <p style={{ fontSize: '17px', color: '#8C857A', lineHeight: 1.6, maxWidth: '520px' }}>
              No decks are published yet. In the meantime, <Link href="/swipe" style={{ color: '#C8963E', textDecoration: 'none' }}>start swiping</Link> or{' '}
              <Link href="/discover" style={{ color: '#C8963E', textDecoration: 'none' }}>pick a way in</Link>.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {decks.map((d) => {
                const sponsor = sponsorLabel(d)
                const mood = d.mood_slug ? MOOD_MAP[d.mood_slug] : null
                return (
                  <li key={d.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                    <NavLink
                      href={`/decks/${d.slug}`}
                      className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center"
                      style={{ padding: '32px 0', textDecoration: 'none', minHeight: '44px' }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                        <span style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C857A' }}>
                          {d.featured && <span style={{ color: '#C8963E' }}>Featured</span>}
                          <span>{d.film_count !== null ? `${d.film_count} films` : mood?.tagline ?? 'Picked by rule'}</span>
                          {sponsor && <span style={{ color: '#C8963E' }}>{sponsor}</span>}
                        </span>
                        <span style={{ ...SERIF, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.02, color: '#F6EFE2' }}>{d.title}</span>
                        {d.description && <span style={{ fontSize: '17px', lineHeight: 1.55, color: '#A39B8F', maxWidth: '620px' }}>{d.description}</span>}
                      </span>
                      {d.posters.length > 0 && (
                        <span aria-hidden="true" style={{ display: 'flex', gap: '8px' }}>
                          {d.posters.map((p) => (
                            <img key={p} src={p} alt="" width={64} height={96} loading="lazy" style={{ width: '64px', height: '96px', objectFit: 'cover', borderRadius: '8px', background: '#15120E' }} />
                          ))}
                        </span>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
