import type { Metadata } from 'next'
import { NavLink } from '@/components/NavLink'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getSelectionBySlug, periodLabel, MIN_SELECTION_FILMS } from '@/lib/selections'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'
import { PosterImg } from '@/components/PosterImg'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const found = await getSelectionBySlug(slug)
  if (!found) return { title: 'Selection not found', robots: { index: false } }
  const { selection, films } = found
  const description = truncate(
    selection.intro || `${selection.label}${periodLabel(selection.period) ? `, ${periodLabel(selection.period)}` : ''}: ${films.slice(0, 3).map((f) => f.movie.title).join(', ')} and more.`,
    160,
  )
  return {
    title: `${selection.title}: ${selection.label}`,
    description,
    alternates: { canonical: `${SITE_URL}/selections/${selection.slug}` },
    robots: films.length >= MIN_SELECTION_FILMS ? undefined : { index: false, follow: true },
    openGraph: { title: `${selection.title} | MuvieStars`, description, url: `${SITE_URL}/selections/${selection.slug}` },
  }
}

export default async function SelectionPage({ params }: PageProps) {
  const { slug } = await params
  const found = await getSelectionBySlug(slug)
  if (!found) notFound()
  const { selection, films } = found
  const when = periodLabel(selection.period)

  const schema = [
    breadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'Selections', url: `${SITE_URL}/selections` },
      { name: selection.title, url: `${SITE_URL}/selections/${selection.slug}` },
    ]),
    ...(films.length > 0
      ? [{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: selection.title,
          itemListElement: films.map((f, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/movie/${f.movie.id}`, name: f.movie.title })),
        }]
      : []),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <NavLink href="/selections" style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
            ← All selections
          </NavLink>

          <header style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 0 56px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              {[selection.label, when].filter(Boolean).join(' · ')}
            </p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>{selection.title}</h1>
            {selection.intro && <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>{selection.intro}</p>}
          </header>

          <ol style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '960px' }}>
            {films.map((f, i) => (
              <li key={f.movie.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                <NavLink
                  href={`/movie/${f.movie.id}`}
                  className="grid grid-cols-[88px_1fr] sm:grid-cols-[48px_110px_1fr] gap-5 items-start"
                  style={{ padding: '28px 0', textDecoration: 'none', minHeight: '44px' }}
                >
                  <span className="hidden sm:block" style={{ ...SERIF, fontSize: '34px', color: '#6E675E' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ width: '100%', aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', background: '#15120E', display: 'block' }}>
                    {f.movie.poster_url && (
                      <PosterImg role="card" film={f.movie} alt="" width={110} height={165} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                    <span style={{ ...SERIF, fontSize: 'clamp(28px,3.4vw,40px)', lineHeight: 1.05, color: '#F6EFE2' }}>{f.movie.title}</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                      {[f.movie.release_year, f.movie.country, f.movie.director ? `Dir. ${f.movie.director}` : null].filter(Boolean).join(' · ')}
                    </span>
                    {(f.note || f.movie.why_listed) && (
                      <span style={{ fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2', maxWidth: '620px' }}>{f.note || f.movie.why_listed}</span>
                    )}
                  </span>
                </NavLink>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <Footer />
    </>
  )
}
