import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { getLaurelAccess, getLaurelModel } from '@/lib/awards-results'
import { LAUREL_VARIANTS, VARIANT_LABEL, PALETTE, laurelUrl } from '@/lib/laurel'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ code: string }>
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Laurel files',
  robots: { index: false },
}

const LINK: React.CSSProperties = {
  minHeight: '44px', padding: '0 16px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2',
  fontSize: '15px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
}

export default async function LaurelPackPage({ params }: PageProps) {
  const { code: raw } = await params
  const code = raw.toUpperCase()
  const model = await getLaurelModel(code)
  if (!model) notFound()

  const standing = model.status === 'valid' || model.status === 'under_review'
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  const access = standing ? await getLaurelAccess(code) : null

  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <Link href={`/recognition/${code}`} style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
            ← {code}
          </Link>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 0 36px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Laurel files</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(38px,5.6vw,72px)', lineHeight: 0.98, color: '#F6EFE2', margin: 0 }}>{model.honour}, {model.period}</h1>
            <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#A39B8F' }}>
              {model.subject}{model.filmTitle ? ` in ${model.filmTitle}` : ''}. Every laurel carries its verification ID, so anyone can check it is real.
            </p>
          </header>

          {!standing && (
            <p role="note" style={{ maxWidth: '640px', margin: '0 0 32px', padding: '16px 18px', borderRadius: '12px', border: '1px solid rgba(232,160,32,0.5)', fontSize: '16px', lineHeight: 1.55 }}>
              This honour no longer stands, so its laurel is not available. <Link href={`/recognition/${code}`} style={{ color: '#C8963E' }}>Read why on its record page.</Link>
            </p>
          )}

          {standing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ maxWidth: '980px' }}>
              {LAUREL_VARIANTS.map((v) => (
                <section key={v} aria-labelledby={`v-${v}`} style={{ display: 'grid', gap: '12px', alignContent: 'start' }}>
                  <h2 id={`v-${v}`} style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: 0 }}>{VARIANT_LABEL[v]}</h2>
                  <img
                    src={laurelUrl(code, v, 'preview')}
                    alt={`The ${model.honour} laurel for ${model.period}, ${v === 'dark' ? 'for dark backgrounds' : 'for light backgrounds'}`}
                    width={640}
                    height={640}
                    loading="lazy"
                    style={{ width: '100%', height: 'auto', borderRadius: '14px', background: PALETTE[v].paper ?? '#0B0A09' }}
                  />
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {access ? (
                      <>
                        <a href={laurelUrl(code, v, 'svg', true)} style={LINK} download>SVG file</a>
                        <a href={laurelUrl(code, v, 'png', true)} style={LINK} download>Transparent PNG</a>
                      </>
                    ) : null}
                    <a href={laurelUrl(code, v, 'card', true)} style={LINK} download>Social card</a>
                  </div>
                </section>
              ))}
            </div>
          )}

          {standing && !access && (
            <section aria-labelledby="who-heading" style={{ maxWidth: '640px', paddingTop: '40px' }}>
              <h2 id="who-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 10px' }}>The production files</h2>
              <p style={{ margin: '0 0 12px', fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                The SVG and transparent PNG go to the people behind the film. That is the account that got it listed on MuvieStars, and our awards team.
                The preview and the social card above are free to share.
              </p>
              {user ? (
                <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, color: '#A39B8F' }}>
                  This account did not get this film listed. If it is yours, write to <a href="mailto:hello@muviestars.com" style={{ color: '#C8963E' }}>hello@muviestars.com</a> from the address you listed it with and we will sort it out.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  <Link href={`/auth?next=/recognition/${code}/laurel`} style={{ ...LINK, background: '#C8963E', color: '#0B0A09', border: 'none', fontWeight: 600 }}>Sign in to get the files</Link>
                </p>
              )}
            </section>
          )}

          {standing && access && (
            <section aria-labelledby="use-heading" style={{ maxWidth: '640px', paddingTop: '40px' }}>
              <h2 id="use-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 10px' }}>Using it</h2>
              <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '8px', fontSize: '16px', lineHeight: 1.6, color: '#A39B8F' }}>
                <li>Use it for {model.subject}{model.filmTitle ? ` in ${model.filmTitle}` : ''} only. Do not change the wording or the verification ID.</li>
                <li>Pick the version that suits the background behind it. Both are transparent.</li>
                <li>If this honour is ever corrected or withdrawn, its record page will say so, and the laurel must come down.</li>
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
