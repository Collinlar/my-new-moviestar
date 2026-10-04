import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getRecordByCode } from '@/lib/awards-results'
import { cycleHref, describeMethod, formatDate } from '@/lib/awards-shared'
import { ShareHonour } from '@/components/ShareHonour'
import { laurelUrl } from '@/lib/laurel'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ code: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const rec = await getRecordByCode(code.toUpperCase())
  if (!rec) return { title: 'Record not found', robots: { index: false } }
  const title = `${rec.subject.title}: ${rec.title}`
  const stands = rec.status === 'valid' || rec.status === 'under_review'
  return {
    title,
    description: truncate(rec.story ?? `${rec.title}. Verified on MuvieStars with code ${rec.code}.`, 160),
    alternates: { canonical: `${SITE_URL}/recognition/${rec.code}` },
    robots: rec.status === 'revoked' ? { index: false } : undefined,
    openGraph: {
      title: `${title} | MuvieStars`, description: truncate(rec.story ?? rec.title, 160), url: `${SITE_URL}/recognition/${rec.code}`,
      images: stands ? [{ url: `${SITE_URL}${laurelUrl(rec.code, 'dark', 'card')}`, width: 1200, height: 630 }] : undefined,
    },
    twitter: stands ? { card: 'summary_large_image', images: [`${SITE_URL}${laurelUrl(rec.code, 'dark', 'card')}`] } : undefined,
  }
}

const STATUS_LINE: Record<string, { label: string; colour: string; text: string }> = {
  valid:        { label: 'Valid', colour: '#7FA88B', text: 'This honour is current and was issued by MuvieStars.' },
  corrected:    { label: 'Corrected', colour: '#E8A020', text: 'This record was corrected after publication. The correction is explained below.' },
  under_review: { label: 'Under review', colour: '#E8A020', text: 'This record is being reviewed. It stays here, and any outcome will be explained on this page.' },
  revoked:      { label: 'Revoked', colour: '#E58A7B', text: 'This honour was withdrawn. It is kept here so the history is complete.' },
}

export default async function RecognitionPage({ params }: PageProps) {
  const { code } = await params
  const rec = await getRecordByCode(code.toUpperCase())
  if (!rec) notFound()
  const base = STATUS_LINE[rec.status] ?? STATUS_LINE.valid
  const status = { ...base, text: rec.statusNote && rec.status !== 'valid' ? rec.statusNote : base.text }
  const stands = rec.status === 'valid' || rec.status === 'under_review'
  const pageUrl = `${SITE_URL}/recognition/${rec.code}`

  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <Link href={cycleHref(rec.cycle.slug, rec.category.slug)} style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
            ← {rec.category.name}, {rec.cycle.name}
          </Link>

          {(rec.status !== 'valid' || rec.replaces) && (
            <div role="note" style={{ maxWidth: '760px', margin: '8px 0 0', padding: '16px 18px', borderRadius: '12px', border: `1px solid ${rec.status === 'revoked' ? 'rgba(229,138,123,0.5)' : 'rgba(232,160,32,0.5)'}`, background: '#14110C' }}>
              <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.55, color: '#EDE4D2' }}>
                {rec.status === 'corrected' && rec.supersededBy ? <>This record was corrected. {rec.statusNote} The honour now stands with <Link href={`/recognition/${rec.supersededBy}`} style={{ color: '#C8963E' }}>{rec.supersededBy}</Link>.</> : null}
                {rec.status === 'under_review' ? <>{rec.statusNote ?? status.text}</> : null}
                {rec.status === 'revoked' ? <>{rec.statusNote ?? status.text}</> : null}
                {rec.status === 'valid' && rec.replaces ? <>This record was issued as a correction of <Link href={`/recognition/${rec.replaces}`} style={{ color: '#C8963E' }}>{rec.replaces}</Link>. {rec.statusNote?.replace(/^Issued as a correction\. /, '')}</> : null}
              </p>
            </div>
          )}

          <header style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0 40px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>MuvieStars official record</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6.5vw,84px)', lineHeight: 0.97, color: '#F6EFE2', margin: 0 }}>{rec.subject.title}</h1>
            <p style={{ ...SERIF, margin: 0, fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.15, color: '#C8963E' }}>{rec.title}</p>
            {rec.subject.filmTitle && <p style={{ margin: 0, fontSize: '17px', color: '#A39B8F' }}>for {rec.subject.filmTitle}{rec.subject.year ? `, ${rec.subject.year}` : ''}</p>}
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-12 lg:gap-16" style={{ maxWidth: '1100px' }}>
            <div style={{ display: 'grid', gap: '40px' }}>
              {rec.story && (
                <section aria-labelledby="why-heading">
                  <h2 id="why-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 12px' }}>{rec.status === 'corrected' || rec.status === 'revoked' ? 'What was said at the time' : 'Why it won'}</h2>
                  <p style={{ ...SERIF, margin: 0, fontSize: 'clamp(22px,2.6vw,30px)', lineHeight: 1.35, color: '#F6EFE2' }}>{rec.story}</p>
                  <p style={{ margin: '14px 0 0' }}>
                    <Link href={rec.subject.href} style={{ color: '#C8963E', fontSize: '16px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>See {rec.subject.title} on MuvieStars</Link>
                  </p>
                </section>
              )}

              {(rec.signals || rec.credits.director.length > 0 || rec.credits.cast.length > 0) && stands && (
                <section aria-labelledby="signals-heading">
                  <h2 id="signals-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 12px' }}>Behind the result</h2>
                  <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '8px', fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                    {rec.signals && <li>{rec.signals.reviewers} different {rec.signals.reviewers === 1 ? 'person' : 'people'} took this film during the month, with {rec.signals.takes} {rec.signals.takes === 1 ? 'qualified take' : 'qualified takes'} counted.</li>}
                    {rec.credits.director.length > 0 && <li>Directed by {rec.credits.director.join(', ')}.</li>}
                    {rec.credits.cast.length > 0 && <li>With {rec.credits.cast.join(', ')}.</li>}
                  </ul>
                  <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#6E675E' }}>Scores and rankings stay private. Festival and industry awards are on the film&rsquo;s own page.</p>
                </section>
              )}

              <section aria-labelledby="nominees-heading">
                <h2 id="nominees-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 10px' }}>The shortlist</h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {[...rec.nominees].sort((a, b) => a.subject.title.localeCompare(b.subject.title)).map((n) => (
                    <li key={n.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)', padding: '12px 0', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <Link href={n.subject.href} style={{ fontSize: '19px', color: '#EDE4D2', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                        {n.subject.title}{n.subject.filmTitle ? <span style={{ color: '#6E675E' }}> in {n.subject.filmTitle}</span> : null}
                      </Link>
                      {n.status === 'winner' && <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8963E', alignSelf: 'center' }}>Winner</span>}
                      {n.status === 'runner_up' && <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C857A', alignSelf: 'center' }}>Runner-up</span>}
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="method-heading">
                <h2 id="method-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 12px' }}>How it was decided</h2>
                <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '8px', fontSize: '16px', lineHeight: 1.6, color: '#A39B8F' }}>
                  {describeMethod(rec.category).map((l) => <li key={l}>{l}</li>)}
                </ul>
              </section>

              {rec.jurors.length > 0 && (
                <section aria-labelledby="jury-heading">
                  <h2 id="jury-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 12px' }}>The judges</h2>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '12px' }}>
                    {rec.jurors.map((j) => (
                      <li key={j.name}>
                        <span style={{ fontSize: '18px', color: '#F6EFE2' }}>{j.name}</span>
                        {j.organisation && <span style={{ color: '#8C857A' }}>, {j.organisation}</span>}
                        {j.bio && <span style={{ display: 'block', fontSize: '15px', color: '#A39B8F', lineHeight: 1.5 }}>{j.bio}</span>}
                      </li>
                    ))}
                  </ul>
                  <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#6E675E' }}>A judge connected to a nominee steps out of judging it.</p>
                </section>
              )}

              {rec.events.length > 0 && (
                <section aria-labelledby="history-heading">
                  <h2 id="history-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 12px' }}>History of this record</h2>
                  <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '14px' }}>
                    {rec.events.map((e, i) => (
                      <li key={i} style={{ borderLeft: '2px solid rgba(200,150,62,0.5)', paddingLeft: '14px' }}>
                        <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>{formatDate(e.at)}</span>
                        <span style={{ display: 'block', fontSize: '16px', lineHeight: 1.55, color: '#EDE4D2', marginTop: '2px' }}>{e.note}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>

            <aside aria-label="Verification" style={{ alignSelf: 'start', padding: '22px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.12)', background: '#0F0D0B', display: 'grid', gap: '14px' }}>
              <div>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6E675E', margin: '0 0 4px' }}>Verification ID</p>
                <p style={{ ...MONO, margin: 0, fontSize: '18px', color: '#F6EFE2', wordBreak: 'break-all' }}>{rec.code}</p>
              </div>
              <div>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6E675E', margin: '0 0 4px' }}>Status</p>
                <p style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: status.colour }}>{status.label}</p>
                <p style={{ margin: '4px 0 0', fontSize: '14px', lineHeight: 1.5, color: '#A39B8F' }}>{status.text}</p>
              </div>
              <div>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6E675E', margin: '0 0 4px' }}>Issued</p>
                <p style={{ margin: 0, fontSize: '16px', color: '#EDE4D2' }}>{formatDate(rec.awardedAt)}</p>
              </div>
              <div>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6E675E', margin: '0 0 4px' }}>Honour</p>
                <p style={{ margin: 0, fontSize: '16px', color: '#EDE4D2' }}>{rec.category.name}, {rec.cycle.name}</p>
              </div>
              {stands && (
                <div style={{ display: 'grid', gap: '12px', borderTop: '1px solid rgba(237,228,210,0.1)', paddingTop: '16px' }}>
                  <img src={laurelUrl(rec.code, 'dark', 'preview')} alt={`The ${rec.category.name} laurel for ${rec.cycle.name}`} width={640} height={640} loading="lazy" style={{ width: '100%', height: 'auto', borderRadius: '12px' }} />
                  <ShareHonour url={pageUrl} text={`${rec.subject.title} won ${rec.category.name}, ${rec.cycle.name} on MuvieStars.`} />
                  <Link href={`/recognition/${rec.code}/laurel`} style={{ color: '#C8963E', fontSize: '15px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Laurel files for this honour</Link>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
