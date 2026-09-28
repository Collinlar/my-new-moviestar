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
  title: 'African Film Actors and People',
  description:
    'Discover the actors, actresses, writers, and crew who bring African cinema to life. Browse biographies and filmographies of African screen talent.',
  keywords: [
    'African actors', 'Nollywood actors', 'Ghanaian actors', 'African actresses',
    'African cinema talent', 'African film stars', 'South African actors',
  ],
  alternates: { canonical: `${SITE_URL}/people` },
}

export const revalidate = 3600

export default async function PeoplePage() {
  const supabase = await createClient()
  const { data: people } = await (supabase as any)
    .from('people')
    .select('id, full_name, profile_image, country, verified')
    .order('full_name', { ascending: true })
    .limit(60)

  const personList = (people as any[]) || []

  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'People', url: `${SITE_URL}/people` },
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
            <div style={{ maxWidth: '540px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                African screen talent
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}>
                Actors &amp; crew
              </h1>
              <p style={{ fontSize: '17px', lineHeight: '1.55', color: '#8C857A', margin: 0 }}>
                Actors, actresses, and crew bringing African stories to the screen.
              </p>
            </div>
          </div>
        </section>

        {/* ── GRID ──────────────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '80px' }}>
          {personList.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {personList.map((person: any) => (
                <Link
                  key={person.id}
                  href={`/person/${person.id}`}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px 16px', borderRadius: '16px', background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)' }}
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  {/* Avatar */}
                  <div style={{ width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(237,228,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {person.profile_image ? (
                      <img
                        src={person.profile_image}
                        alt={person.full_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        itemProp="image"
                      />
                    ) : (
                      <span style={{ ...SERIF, fontSize: '26px', color: '#C8963E' }}>
                        {person.full_name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#F6EFE2', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      itemProp="name"
                    >
                      {person.full_name}
                    </p>
                    {person.country && (
                      <p style={{ margin: '3px 0 0', ...MONO, fontSize: '10px', color: '#6A6258' }}>
                        {person.country}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ padding: '80px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>Actor profiles are being added to the archive.</p>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </>
  )
}
