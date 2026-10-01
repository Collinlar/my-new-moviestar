import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getPublishedSelections, periodLabel } from '@/lib/selections'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'MuvieStars Selections: Films Our Editors Recommend',
  description: 'Listed films our editors single out as worth your time right now, each with a note on why. A Selection is a recommendation, not an award.',
  alternates: { canonical: `${SITE_URL}/selections` },
}

export const dynamic = 'force-dynamic'

export default async function SelectionsPage() {
  const selections = await getPublishedSelections({ limit: 60 })
  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Discover', url: `${SITE_URL}/discover` },
    { name: 'Selections', url: `${SITE_URL}/selections` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <header style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '56px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Selections</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              Start with these.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>
              Our editors pick a few listed films that deserve your next evening, and say why. A Selection is a recommendation. It is not an award, and a film cannot buy its way in.
            </p>
          </header>

          {selections.length === 0 ? (
            <p style={{ fontSize: '17px', color: '#8C857A', lineHeight: 1.6, maxWidth: '520px' }}>
              No Selection is published yet. Have a look at the <Link href="/decks" style={{ color: '#C8963E', textDecoration: 'none' }}>decks</Link> in the meantime.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {selections.map((s) => (
                <li key={s.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                  <Link
                    href={`/selections/${s.slug}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-center"
                    style={{ padding: '32px 0', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                      <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8963E' }}>
                        {[s.label, periodLabel(s.period), `${s.film_count} films`].filter(Boolean).join(' · ')}
                      </span>
                      <span style={{ ...SERIF, fontSize: 'clamp(32px,4vw,52px)', lineHeight: 1.02, color: '#F6EFE2' }}>{s.title}</span>
                      {s.intro && <span style={{ fontSize: '17px', lineHeight: 1.55, color: '#A39B8F', maxWidth: '620px' }}>{s.intro}</span>}
                    </span>
                    {s.posters.length > 0 && (
                      <span aria-hidden="true" style={{ display: 'flex', gap: '8px' }}>
                        {s.posters.map((p) => (
                          <img key={p} src={p} alt="" width={64} height={96} loading="lazy" style={{ width: '64px', height: '96px', objectFit: 'cover', borderRadius: '8px', background: '#15120E' }} />
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
