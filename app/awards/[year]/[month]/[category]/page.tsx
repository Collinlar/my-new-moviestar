import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { NomineeRows } from '@/components/NomineeRows'
import { Ballot } from '@/components/Ballot'
import { getCycleBySlug } from '@/lib/awards'
import { getJurors, getOutcomes } from '@/lib/awards-results'
import { NOT_AWARDED_COPY, cycleHref, describeMethod } from '@/lib/awards-shared'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ year: string; month: string; category: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year, month, category } = await params
  const found = await getCycleBySlug(`${year}-${month}`)
  const cat = found?.categories.find((k) => k.slug === category)
  if (!found || !cat) return { title: 'Honour not found', robots: { index: false } }
  const names = found.nominees.filter((n) => n.categoryId === cat.id).map((n) => n.subject.title)
  return {
    title: `${cat.name}, ${found.cycle.name}: Shortlist and Rules`,
    description: truncate(`${cat.description ?? cat.name}${names.length ? ` Shortlisted: ${names.join(', ')}.` : ''}`, 160),
    alternates: { canonical: `${SITE_URL}${cycleHref(found.cycle.slug, cat.slug)}` },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { year, month, category } = await params
  const found = await getCycleBySlug(`${year}-${month}`)
  const cat = found?.categories.find((k) => k.slug === category)
  if (!found || !cat) notFound()
  const { cycle } = found

  const noms = found.nominees.filter((n) => n.categoryId === cat.id)
  const enough = noms.length >= cat.min_nominees
  const ballot = cat.method_type === 'community' && enough
  const decided = ['published', 'archived'].includes(cycle.status)
  const [outcomes, jurors] = await Promise.all([decided ? getOutcomes(cycle.id) : Promise.resolve([]), getJurors(cycle.id)])
  const outcome = outcomes.find((o) => o.categoryId === cat.id)
  const judges = jurors.filter((j) => j.categoryId === cat.id)

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Awards', url: `${SITE_URL}/awards` },
    { name: cycle.name, url: `${SITE_URL}${cycleHref(cycle.slug)}` },
    { name: cat.name, url: `${SITE_URL}${cycleHref(cycle.slug, cat.slug)}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <Link href={cycleHref(cycle.slug)} style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>← {cycle.name}</Link>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0 40px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>{cycle.name}</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>{cat.name}</h1>
            {cat.description && <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>{cat.description}</p>}
          </header>

          {outcome && (
            <section aria-labelledby="result-heading" style={{ maxWidth: '860px', paddingBottom: '48px' }}>
              <h2 id="result-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 12px' }}>
                {outcome.outcome === 'awarded' ? (outcome.winners.length > 1 ? 'Joint winners' : 'The winner') : 'The result'}
              </h2>
              {outcome.outcome === 'awarded' ? (
                <>
                  {outcome.winners.map((w) => (
                    <div key={w.recognitionId} style={{ margin: '0 0 8px' }}>
                      <p style={{ margin: 0 }}>
                        <Link href={`/recognition/${w.code}`} style={{ ...SERIF, fontSize: 'clamp(36px,5vw,60px)', lineHeight: 1.02, color: w.status === 'revoked' ? '#6E675E' : '#F6EFE2', textDecoration: w.status === 'revoked' ? 'line-through' : 'none' }}>
                          {w.subject.title}{w.subject.filmTitle ? <span style={{ fontSize: '0.5em', color: '#8C857A' }}> in {w.subject.filmTitle}</span> : null}
                        </Link>
                      </p>
                      {w.status === 'under_review' && <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#E8A020' }}>Under review. {w.note}</p>}
                      {w.status === 'revoked' && <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#E58A7B' }}>Withdrawn after review. {w.note}</p>}
                      {w.status === 'valid' && w.note && <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#A39B8F' }}>{w.note}</p>}
                    </div>
                  ))}
                  {outcome.story && outcome.winners.some((w) => w.status !== 'revoked') && <p style={{ margin: '14px 0 12px', fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2', maxWidth: '680px' }}>{outcome.story}</p>}
                  {outcome.winners[0] && (
                    <p style={{ margin: 0 }}>
                      <Link href={`/recognition/${outcome.winners[0].code}`} style={{ ...MONO, fontSize: '13px', color: '#C8963E', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Verification ID {outcome.winners[0].code}</Link>
                    </p>
                  )}
                </>
              ) : (
                <p style={{ ...SERIF, margin: 0, fontSize: 'clamp(26px,3.4vw,38px)', lineHeight: 1.2, color: '#F6EFE2', maxWidth: '680px' }}>
                  {NOT_AWARDED_COPY}
                  {outcome.reason && <span style={{ display: 'block', marginTop: '10px', fontSize: '17px', color: '#8C857A' }}>{outcome.reason}.</span>}
                </p>
              )}
            </section>
          )}

          <section aria-labelledby="shortlist-heading" style={{ maxWidth: '860px', paddingBottom: '48px' }}>
            <h2 id="shortlist-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 8px' }}>The shortlist</h2>
            {enough ? (
              <NomineeRows nominees={noms} />
            ) : (
              <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                Only {noms.length} {noms.length === 1 ? 'candidate' : 'candidates'} qualified, and a shortlist needs at least {cat.min_nominees}. {NOT_AWARDED_COPY}
              </p>
            )}
          </section>

          {ballot && (
            <div style={{ maxWidth: '860px', paddingBottom: '48px' }}>
              <Ballot
                cycleId={cycle.id}
                categoryId={cat.id}
                categoryName={cat.name}
                signInHref={`/auth?next=${cycleHref(cycle.slug, cat.slug)}`}
                nominees={noms
                  .filter((n) => n.subject.movieId)
                  .sort((a, b) => a.subject.title.localeCompare(b.subject.title))
                  .map((n) => ({ id: n.id, movieId: n.subject.movieId as string, title: n.subject.title, year: n.subject.year, posterUrl: n.subject.posterUrl }))}
              />
            </div>
          )}

          <section aria-labelledby="rules-heading" style={{ maxWidth: '760px', borderTop: '1px solid rgba(237,228,210,0.1)', paddingTop: '36px' }}>
            <h2 id="rules-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,3.4vw,38px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 14px' }}>How this honour is decided</h2>
            <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '10px', fontSize: '16px', lineHeight: 1.6, color: '#A39B8F' }}>
              {describeMethod(cat).map((line) => <li key={line}>{line}</li>)}
            </ul>
            {judges.length > 0 && (
              <div style={{ margin: '24px 0 0' }}>
                <h3 style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 10px' }}>The judges</h3>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '10px' }}>
                  {judges.map((j) => (
                    <li key={j.name} style={{ fontSize: '16px', color: '#EDE4D2' }}>
                      {j.name}{j.organisation ? <span style={{ color: '#8C857A' }}>, {j.organisation}</span> : null}
                      {j.bio && <span style={{ display: 'block', fontSize: '14px', color: '#A39B8F', lineHeight: 1.5 }}>{j.bio}</span>}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#6E675E' }}>A judge connected to a nominee steps out of judging it.</p>
              </div>
            )}
            <p style={{ margin: '18px 0 0', fontSize: '15px' }}>
              <Link href="/awards" style={{ color: '#C8963E' }}>All the principles behind MuvieStars honours</Link>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
