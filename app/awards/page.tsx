import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getCycleBySlug, getPublicCycles } from '@/lib/awards'
import { cycleHref, describeMethod, formatDate, type CycleStage } from '@/lib/awards-shared'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'MuvieStars Awards and Honours: Recognition That Has to Be Earned',
  description: 'Monthly honours for African cinema: Movie of the Month, Performance of the Month, Director of the Month and Audience Choice. Public rules, published shortlists, no paid wins.',
  alternates: { canonical: `${SITE_URL}/awards` },
}

export const dynamic = 'force-dynamic'

const PUBLIC_STAGE_LABEL: Partial<Record<CycleStage, string>> = {
  shortlist_published: 'Shortlist announced',
  voting_open: 'Voting open',
  voting_closed: 'Voting closed',
  jury_review: 'With the judges',
  results_locked: 'Confirming results',
  published: 'Results published',
  archived: 'Archive',
}

const METHOD_LABEL: Record<string, string> = { community: 'Audience vote', hybrid: 'Audience and judges', jury: 'Judges', editorial: 'Editors' }

const PRINCIPLES = [
  'An award can never be bought. Sponsorship has no say over who is eligible, who is shortlisted or who wins.',
  'The rules for every category are public, on this page and on each category page.',
  'A category stays unawarded when too few films or people qualify. We would rather skip an award than cheapen it.',
  'Popularity alone does not win. Scores are adjusted so a handful of perfect ratings cannot beat many strong ones.',
  'Judges are named, and anyone connected to a nominee steps out of judging it.',
  'Every change to a shortlist or a result is written to a record that cannot be edited, and corrections are announced, never hidden.',
]

export default async function AwardsPage() {
  const cycles = await getPublicCycles(6)
  const details = await Promise.all(cycles.map((c) => getCycleBySlug(c.slug)))
  const open = cycles.filter((c) => c.status === 'voting_open')

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Awards', url: `${SITE_URL}/awards` },
  ])

  // Methodology comes from the real category settings, so the page can never drift from the rules in force.
  const categories = details.find(Boolean)?.categories ?? []

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <header style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '56px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Awards and Honours</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              Recognition has to be earned.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>
              Each month MuvieStars honours a film, a performance and a director, and the audience picks its own favourite. Few films qualify, so few awards are given. That is the point.
            </p>
          </header>

          {open.length > 0 && (
            <section aria-labelledby="open-heading" style={{ paddingBottom: '56px' }}>
              <h2 id="open-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 10px' }}>Voting open now</h2>
              {open.map((c) => (
                <Link key={c.id} href={cycleHref(c.slug, 'audience-choice')} style={{ display: 'block', padding: '20px 22px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.45)', background: 'rgba(200,150,62,0.08)', textDecoration: 'none', maxWidth: '640px', minHeight: '44px' }}>
                  <span style={{ ...SERIF, fontSize: '30px', lineHeight: 1.1, color: '#F6EFE2', display: 'block' }}>{c.name} Audience Choice</span>
                  <span style={{ fontSize: '15px', color: '#C7BFB2' }}>Voting closes {formatDate(c.voting_end)}. Tap to see the shortlist and vote.</span>
                </Link>
              ))}
            </section>
          )}

          {cycles.length === 0 ? (
            <section aria-labelledby="none-heading" style={{ paddingBottom: '56px', maxWidth: '640px' }}>
              <h2 id="none-heading" style={{ ...SERIF, fontWeight: 400, fontSize: '36px', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 12px' }}>No shortlist is published yet.</h2>
              <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                Honours run monthly. Films qualify from reviews saved on days 1 to 20, the shortlist is announced on day 21, voting runs on days 21 to 27, and results follow at the end of the month. Every review you save with a star rating counts toward the month it falls in.
              </p>
            </section>
          ) : (
            <section aria-labelledby="cycles-heading" style={{ paddingBottom: '56px' }}>
              <h2 id="cycles-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 8px' }}>Current honours</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {cycles.map((c, i) => {
                  const d = details[i]
                  return (
                    <li key={c.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)', padding: '28px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                        <Link href={cycleHref(c.slug)} style={{ ...SERIF, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1.05, color: '#F6EFE2', textDecoration: 'none' }}>{c.name}</Link>
                        <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8963E' }}>{PUBLIC_STAGE_LABEL[c.status as CycleStage] ?? c.status}</span>
                      </div>
                      {d && (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '2px' }}>
                          {d.categories.map((k) => {
                            const count = d.nominees.filter((n) => n.categoryId === k.id).length
                            const enough = count >= k.min_nominees
                            return (
                              <li key={k.id}>
                                <Link href={cycleHref(c.slug, k.slug)} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', padding: '10px 0', textDecoration: 'none', minHeight: '44px', flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '18px', color: '#EDE4D2' }}>{k.name}</span>
                                  <span style={{ ...MONO, fontSize: '12px', color: enough ? '#8C857A' : '#6A6258' }}>
                                    {METHOD_LABEL[k.method_type] ?? k.method_type} · {enough ? `${count} shortlisted` : 'not enough qualified yet'}
                                  </span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="how-heading" style={{ borderTop: '1px solid rgba(237,228,210,0.1)', paddingTop: '48px', maxWidth: '820px' }}>
            <h2 id="how-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,46px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 20px' }}>How MuvieStars Awards work</h2>
            <ol style={{ margin: '0 0 36px', padding: '0 0 0 22px', display: 'grid', gap: '12px', fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
              {PRINCIPLES.map((p) => <li key={p}>{p}</li>)}
            </ol>

            {categories.map((k) => (
              <details key={k.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)', padding: '4px 0' }}>
                <summary style={{ cursor: 'pointer', minHeight: '48px', display: 'flex', alignItems: 'center', fontSize: '19px', color: '#EDE4D2' }}>{k.name}: the rules</summary>
                <ul style={{ margin: '0 0 16px', padding: '0 0 0 20px', display: 'grid', gap: '8px', fontSize: '16px', lineHeight: 1.6, color: '#A39B8F' }}>
                  {describeMethod(k).map((line) => <li key={line}>{line}</li>)}
                </ul>
              </details>
            ))}
            <p style={{ margin: '20px 0 0', fontSize: '15px', color: '#8C857A', lineHeight: 1.6 }}>
              Festival and industry awards that a film has won elsewhere are shown separately on its page and never count toward a MuvieStars honour.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
