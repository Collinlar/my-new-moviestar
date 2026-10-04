import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export interface LegalSection { id: string; title: string; body: React.ReactNode }

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.7, color: '#C7BFB2' }}>{children}</p>
}

export function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '8px', fontSize: '17px', lineHeight: 1.7, color: '#C7BFB2' }}>{children}</ul>
}

interface Props {
  eyebrow: string
  title: string
  intro: string
  updated: string
  /** The short version: the few things most people want to know before the detail. */
  summary: string[]
  sections: LegalSection[]
  otherPage: { href: string; label: string }
}

/** Shared layout for the privacy and terms pages: the short version first, then numbered sections with a contents list. */
export function LegalPage({ eyebrow, title, intro, updated, summary, sections, otherPage }: Props) {
  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <header style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '40px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>{eyebrow}</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,76px)', lineHeight: 0.98, color: '#F6EFE2', margin: 0 }}>{title}</h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>{intro}</p>
            <p style={{ ...MONO, margin: 0, fontSize: '12px', color: '#8C857A' }}>Last updated {updated}</p>
          </header>

          <section aria-labelledby="short-heading" style={{ maxWidth: '760px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.35)', background: '#0F0D0B', marginBottom: '56px' }}>
            <h2 id="short-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 14px' }}>The short version</h2>
            <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '10px', fontSize: '18px', lineHeight: 1.6, color: '#EDE4D2' }}>
              {summary.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,760px)_240px] gap-12 lg:gap-20">
            <div style={{ display: 'grid', gap: '48px' }}>
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} style={{ display: 'grid', gap: '14px', scrollMarginTop: '96px' }}>
                  <h2 id={`${s.id}-h`} style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,3.4vw,38px)', lineHeight: 1.08, color: '#F6EFE2', margin: 0 }}>
                    <span style={{ ...MONO, fontSize: '13px', color: '#6E675E', marginRight: '12px' }}>{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </h2>
                  {s.body}
                </section>
              ))}
              <p style={{ margin: 0, fontSize: '16px', color: '#A39B8F' }}>
                Questions about any of this? Write to <a href="mailto:hello@muviestars.com" style={{ color: '#C8963E' }}>hello@muviestars.com</a>.
                You may also want to read our <Link href={otherPage.href} style={{ color: '#C8963E' }}>{otherPage.label}</Link>.
              </p>
            </div>

            <nav aria-label="Sections on this page" className="lg:sticky lg:self-start" style={{ top: '96px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6E675E', margin: '0 0 8px' }}>On this page</p>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid' }}>
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} style={{ display: 'flex', gap: '10px', alignItems: 'center', minHeight: '44px', fontSize: '15px', color: '#A39B8F', textDecoration: 'none' }}>
                      <span style={{ ...MONO, fontSize: '12px', color: '#6E675E' }}>{String(i + 1).padStart(2, '0')}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
