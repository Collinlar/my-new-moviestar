import type { Metadata } from 'next'
import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MOOD_MAP } from '@/lib/mood'
import { COUNTRIES, GENRES, INDUSTRIES, SITE_URL, capitalise } from '@/lib/utils'
import { breadcrumbSchema } from '@/lib/schema'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Discover African Films by Mood, Genre, Country and Industry',
  description:
    'Find your next African film. Start from a mood, a genre, a country or an industry, or go straight to the Canon, festival films and the people behind the screen.',
  alternates: { canonical: `${SITE_URL}/discover` },
}

const STARTS = [
  { href: '/canon',                 title: 'The Canon',        body: 'The films that defined African cinema, with essays on why.' },
  { href: '/swipe?mood=obg',        title: 'Old but Gold',     body: 'Films from before 2010 worth going back for.' },
  { href: '/awards',                title: 'Awards and Honours', body: 'Monthly honours with public rules, shortlists and an audience vote.' },
  { href: '/selections',            title: 'Selections',       body: 'Films our editors single out, each with a note on why.' },
  { href: '/decks',                 title: 'Decks',            body: 'Short, hand-picked sets of films to swipe through.' },
  { href: '/dna',                   title: 'Movie DNA',        body: 'A portrait of your taste, built from the takes you save.' },
  { href: '/challenges',            title: 'Challenges',       body: 'Take a handful of films before the window closes and earn a laurel.' },
  { href: '/trending',              title: 'Trending',         body: 'What people are watching and reacting to right now.' },
  { href: '/festivals',             title: 'Festivals',        body: 'Winners and nominees from the festivals that matter.' },
  { href: '/people',                title: 'People',           body: 'Actors, directors and crew, with their full filmographies.' },
  { href: '/all-reviews',           title: 'Community takes',  body: 'What viewers are saying about the films they have seen.' },
]

const pill: React.CSSProperties = {
  height: '44px', padding: '0 18px', borderRadius: '999px',
  border: '1px solid rgba(237,228,210,0.14)', color: '#D8CFC0',
  fontSize: '15px', textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center',
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section
      className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4 lg:gap-10"
      style={{ borderTop: '1px solid rgba(237,228,210,0.1)', padding: '36px 0' }}
      aria-label={label}
    >
      <h2 style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0, fontWeight: 400 }}>
        {label}
      </h2>
      <div>{children}</div>
    </section>
  )
}

export default function DiscoverPage() {
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Discover', url: `${SITE_URL}/discover` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '48px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              Discover
            </p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              Pick a way in.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.55, color: '#C7BFB2' }}>
              Start from how you feel, from where a film is from, or from the people who made it.
            </p>
          </header>

          <Row label="By mood">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {Object.values(MOOD_MAP).map((m) => (
                <li key={m.slug}>
                  <Link
                    href={`/swipe?mood=${m.slug}`}
                    style={{ ...pill, background: m.chipBg, color: m.chipText, border: '1px solid rgba(237,228,210,0.08)', fontWeight: 500 }}
                  >
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Row>

          <Row label="Start somewhere">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
              {STARTS.map((s) => (
                <li key={s.href} style={{ borderTop: '1px solid rgba(237,228,210,0.06)' }}>
                  <NavLink
                    href={s.href}
                    className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-1 sm:gap-6"
                    style={{ padding: '16px 0', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span style={{ ...SERIF, fontSize: '28px', lineHeight: 1.1, color: '#F6EFE2' }}>{s.title}</span>
                    <span style={{ fontSize: '15px', color: '#A39B8F', alignSelf: 'center' }}>{s.body}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </Row>

          <Row label="By genre">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {GENRES.map((g) => (
                <li key={g}><NavLink href={`/browse?genre=${g}`} style={pill}>{capitalise(g)}</NavLink></li>
              ))}
            </ul>
          </Row>

          <Row label="By industry">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {INDUSTRIES.filter((i) => i !== 'Other').map((i) => (
                <li key={i}><NavLink href={`/browse?industry=${encodeURIComponent(i)}`} style={pill}>{i}</NavLink></li>
              ))}
            </ul>
          </Row>

          <Row label="By country">
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {COUNTRIES.filter((c) => c !== 'Other').map((c) => (
                <li key={c}><NavLink href={`/browse?country=${encodeURIComponent(c)}`} style={pill}>{c}</NavLink></li>
              ))}
            </ul>
          </Row>

          <Row label="Search">
            <form action="/search" method="get" role="search" style={{ display: 'flex', gap: '10px', maxWidth: '560px' }}>
              <label htmlFor="discover-q" className="sr-only">Search films, people and places</label>
              <input
                id="discover-q"
                name="q"
                type="search"
                autoComplete="off"
                placeholder="A film, an actor, a city"
                style={{ flex: 1, minWidth: 0, height: '52px', padding: '0 18px', borderRadius: '14px', background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.16)', color: '#F6EFE2', fontSize: '16px' }}
              />
              <button
                type="submit"
                style={{ height: '52px', padding: '0 22px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Find it
              </button>
            </form>
            <p style={{ margin: '16px 0 0', fontSize: '15px', color: '#8C857A' }}>
              Want everything in one list? <Link href="/browse" style={{ color: '#C8963E', textDecoration: 'none' }}>Browse the full catalogue</Link>.
            </p>
          </Row>

        </div>
      </main>

      <Footer />
    </>
  )
}
