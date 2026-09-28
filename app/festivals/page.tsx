import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'African Film Festivals — AMAA, FESPACO, AFRIFF and More',
  description:
    'Explore the major African film festivals: AMAA, FESPACO, AFRIFF, DIFF, ZIFF, and more. Discover award-winning African films and the festivals that celebrate them.',
  alternates: { canonical: `${SITE_URL}/festivals` },
}

export const revalidate = 86400

export default async function FestivalsPage() {
  const supabase = await createClient() as any

  const { data: festivals } = await supabase
    .from('festivals')
    .select('id, name, short_name, slug, country, city, description, founded, frequency')
    .order('founded', { ascending: true })

  const list = (festivals as any[]) || []

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: SITE_URL },
    { name: 'Festivals', url: `${SITE_URL}/festivals` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
            <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                Where African cinema is celebrated
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}>
                African film festivals
              </h1>
              <p style={{ fontSize: '17px', lineHeight: '1.55', color: '#8C857A', margin: 0, maxWidth: '480px' }}>
                From Ouagadougou to Lagos to Cairo — where the continent's films are seen and remembered.
              </p>
            </div>
          </div>
        </section>

        {/* ── LIST ──────────────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {list.length === 0 ? (
              <div style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <span style={{ fontSize: '40px', opacity: 0.2 }} aria-hidden="true">🎬</span>
                <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>Festival data is being added.</p>
              </div>
            ) : (
              list.map((fest: any) => (
                <Link
                  key={fest.id}
                  href={`/festival/${fest.slug}`}
                  style={{
                    textDecoration: 'none', display: 'block',
                    padding: '24px', borderRadius: '16px',
                    background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ ...MONO, fontSize: '11px', fontWeight: 700, color: '#C8963E', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          {fest.short_name}
                        </span>
                        {fest.frequency && (
                          <span style={{ ...MONO, fontSize: '11px', color: '#6A6258' }}>{fest.frequency}</span>
                        )}
                      </div>
                      <h2 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(18px,2vw,24px)', color: '#F6EFE2', margin: 0, lineHeight: 1.1 }}>
                        {fest.name}
                      </h2>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {(fest.city || fest.country) && (
                          <span style={{ ...MONO, fontSize: '12px', color: '#6A6258' }}>
                            📍 {fest.city ? `${fest.city}, ` : ''}{fest.country}
                          </span>
                        )}
                        {fest.founded && (
                          <span style={{ ...MONO, fontSize: '12px', color: '#6A6258' }}>
                            Est. {fest.founded}
                          </span>
                        )}
                      </div>
                      {fest.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#8C857A', lineHeight: '1.55', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {fest.description}
                        </p>
                      )}
                    </div>
                    <span style={{ color: '#6A6258', fontSize: '18px', flexShrink: 0, marginTop: '2px' }}>→</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

      </main>

      <Footer />
    </>
  )
}
