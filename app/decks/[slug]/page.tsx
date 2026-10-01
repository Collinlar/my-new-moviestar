import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getDeckBySlug, sponsorLabel, MIN_DECK_FILMS } from '@/lib/decks'
import { MOOD_MAP } from '@/lib/mood'
import { getOpenChallengesForDeck } from '@/lib/challenges'
import { stateLine } from '@/lib/challenges-shared'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const found = await getDeckBySlug(slug)
  if (!found) return { title: 'Deck not found', robots: { index: false } }
  const { deck, films } = found
  const enough = deck.kind === 'mood' || films.length >= MIN_DECK_FILMS
  const description = truncate(
    deck.description || `A hand-picked deck of African films${films.length ? `: ${films.slice(0, 3).map((f) => f.movie.title).join(', ')} and more` : ''}.`,
    160,
  )
  return {
    title: `${deck.title}: A MuvieStars Deck`,
    description,
    alternates: { canonical: `${SITE_URL}/decks/${deck.slug}` },
    robots: enough ? undefined : { index: false, follow: true },
    openGraph: { title: `${deck.title} | MuvieStars Decks`, description, url: `${SITE_URL}/decks/${deck.slug}` },
  }
}

export default async function DeckPage({ params }: PageProps) {
  const { slug } = await params
  const found = await getDeckBySlug(slug)
  if (!found) notFound()
  const { deck, films } = found

  const challenges = await getOpenChallengesForDeck(deck.id)
  const sponsor = sponsorLabel(deck)
  const mood = deck.mood_slug ? MOOD_MAP[deck.mood_slug] : null

  const schema = [
    breadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Decks', url: `${SITE_URL}/decks` },
      { name: deck.title, url: `${SITE_URL}/decks/${deck.slug}` },
    ]),
    ...(films.length > 0
      ? [{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: deck.title,
          itemListElement: films.map((f, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${SITE_URL}/movie/${f.movie.id}`,
            name: f.movie.title,
          })),
        }]
      : []),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <Link href="/decks" style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
            ← All decks
          </Link>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 0 48px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>Deck</span>
              {sponsor && (
                deck.sponsor_url ? (
                  <a href={deck.sponsor_url} target="_blank" rel="sponsored noopener noreferrer" style={{ color: '#C8963E' }}>{sponsor}</a>
                ) : (
                  <span>{sponsor}</span>
                )
              )}
            </p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>{deck.title}</h1>
            {deck.description && <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>{deck.description}</p>}
            <div>
              <Link
                href={`/swipe?deck=${deck.slug}`}
                style={{ height: '58px', padding: '0 28px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
              >
                Swipe this deck
                <ArrowRight size={18} />
              </Link>
            </div>
          </header>

          {challenges.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '0 0 40px', padding: 0, maxWidth: '720px' }}>
              {challenges.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/challenges/${c.slug}`}
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 18px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.35)', background: 'rgba(200,150,62,0.07)', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C8963E' }}>
                      Challenge on this deck · {stateLine(c)}
                    </span>
                    <span style={{ fontSize: '18px', color: '#F6EFE2' }}>{c.title}: take {c.goal} and earn the laurel</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {deck.kind === 'mood' ? (
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, color: '#8C857A', maxWidth: '560px' }}>
              {mood?.tagline ?? 'Films are chosen automatically.'} The films in this deck are picked for you each time, from everything that is listed.
            </p>
          ) : (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '900px' }}>
              {films.map((f, i) => (
                <li key={f.movie.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                  <Link
                    href={`/movie/${f.movie.id}`}
                    className="grid grid-cols-[56px_1fr] sm:grid-cols-[40px_72px_1fr] gap-4 items-center"
                    style={{ padding: '18px 0', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span className="hidden sm:block" style={{ ...SERIF, fontSize: '28px', color: '#6E675E' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ width: '56px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#15120E', display: 'block' }}>
                      {f.movie.poster_url && (
                        <img src={f.movie.poster_url} alt="" width={56} height={84} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span style={{ ...SERIF, fontSize: '28px', lineHeight: 1.1, color: '#F6EFE2' }}>{f.movie.title}</span>
                      <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                        {[f.movie.release_year, f.movie.country].filter(Boolean).join(' · ')}
                      </span>
                      {f.note && <span style={{ fontSize: '15px', lineHeight: 1.5, color: '#A39B8F' }}>{f.note}</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
