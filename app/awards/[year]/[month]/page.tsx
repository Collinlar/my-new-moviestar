import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { NomineeRows } from '@/components/NomineeRows'
import { getCycleBySlug } from '@/lib/awards'
import { getOutcomes } from '@/lib/awards-results'
import { NOT_AWARDED_COPY, cycleHref, formatDate } from '@/lib/awards-shared'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ year: string; month: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month } = await params
  const found = await getCycleBySlug(`${year}-${month}`)
  if (!found) return { title: 'Honours not found', robots: { index: false } }
  return {
    title: `${found.cycle.name} Honours: Shortlists and Results`,
    description: `The ${found.cycle.name} MuvieStars honours: Movie of the Month, Performance of the Month, Director of the Month and Audience Choice. Shortlists, rules and results.`,
    alternates: { canonical: `${SITE_URL}${cycleHref(found.cycle.slug)}` },
  }
}

export default async function CyclePage({ params }: PageProps) {
  const { year, month } = await params
  const found = await getCycleBySlug(`${year}-${month}`)
  if (!found) notFound()
  const { cycle, categories, nominees } = found
  const outcomes = ['published', 'archived'].includes(cycle.status) ? await getOutcomes(cycle.id) : []

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Awards', url: `${SITE_URL}/awards` },
    { name: cycle.name, url: `${SITE_URL}${cycleHref(cycle.slug)}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <Link href="/awards" style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>← Awards and Honours</Link>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0 48px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>MuvieStars Honours</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>{cycle.name}</h1>
            <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#A39B8F' }}>
              Voting, where a category has it, runs {formatDate(cycle.voting_start)} to {formatDate(cycle.voting_end)}.
            </p>
          </header>

          {categories.map((k) => {
            const noms = nominees.filter((n) => n.categoryId === k.id)
            const enough = noms.length >= k.min_nominees
            const o = outcomes.find((x) => x.categoryId === k.id)
            return (
              <section key={k.id} aria-labelledby={`c-${k.slug}`} style={{ paddingBottom: '48px', maxWidth: '860px' }}>
                <h2 id={`c-${k.slug}`} style={{ margin: '0 0 6px' }}>
                  <Link href={cycleHref(cycle.slug, k.slug)} style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,4vw,42px)', lineHeight: 1.05, color: '#F6EFE2', textDecoration: 'none' }}>{k.name}</Link>
                </h2>
                {k.description && <p style={{ margin: '0 0 12px', fontSize: '16px', lineHeight: 1.6, color: '#A39B8F' }}>{k.description}</p>}
                {o && (
                  <p style={{ margin: '0 0 14px', fontSize: '19px', color: o.outcome === 'awarded' ? '#C8963E' : '#8C857A' }}>
                    {o.outcome === 'awarded' ? `Winner: ${o.winners.map((w) => w.subject.title).join(' and ')}` : NOT_AWARDED_COPY}
                  </p>
                )}
                {enough ? <NomineeRows nominees={noms} /> : <p style={{ margin: 0, fontSize: '16px', color: '#8C857A', lineHeight: 1.6 }}>Not enough films qualified for a shortlist this month. {NOT_AWARDED_COPY}</p>}
              </section>
            )
          })}
        </div>
      </main>
      <Footer />
    </>
  )
}
