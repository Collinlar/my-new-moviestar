import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getTopCreators } from '@/lib/queries'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'African Filmmakers — Directors, Producers, and Creators',
  description:
    "Discover the directors, producers, writers, and creators behind African cinema. Explore filmographies, biographies, and films from Africa's most influential filmmakers.",
  keywords: [
    'African filmmakers', 'African directors', 'Nollywood directors',
    'Ghanaian filmmakers', 'African cinema creators', 'African film directors',
    'African producers', 'Black African filmmakers',
  ],
  alternates: { canonical: `${SITE_URL}/creators` },
}

export const revalidate = 3600

export default async function CreatorsPage() {
  const creators = await getTopCreators(50)

  const crumbs = breadcrumbSchema([
    { name: 'Home',       url: SITE_URL },
    { name: 'Filmmakers', url: `${SITE_URL}/creators` },
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
            <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                The people behind the films
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}>
                African filmmakers
              </h1>
              <p style={{ fontSize: '17px', lineHeight: '1.55', color: '#8C857A', margin: 0 }}>
                Directors, producers, and storytellers shaping African cinema.
              </p>
            </div>
          </div>
        </section>

        {/* ── GRID ──────────────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '80px' }}>
          {creators.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
              {creators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creator/${creator.id}`}
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '28px 20px', borderRadius: '16px', background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)' }}
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  {/* Avatar */}
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(237,228,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {creator.image_url ? (
                      <img
                        src={creator.image_url}
                        alt={`${creator.name} — African filmmaker`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                        itemProp="image"
                      />
                    ) : (
                      <span style={{ ...SERIF, fontSize: '28px', color: '#C8963E' }}>
                        {creator.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#F6EFE2', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      itemProp="name"
                    >
                      {creator.name}
                    </p>
                    {creator.movie_count != null && (
                      <p style={{ margin: '4px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                        {creator.movie_count} {creator.movie_count === 1 ? 'film' : 'films'}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{
              padding: '80px 24px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
            }}>
              <span style={{ fontSize: '40px', opacity: 0.2 }} aria-hidden="true">🎬</span>
              <p style={{ ...SERIF, fontSize: '22px', color: '#F6EFE2', margin: 0 }}>No filmmakers yet</p>
              <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>Filmmaker profiles are being added to the archive.</p>
            </div>
          )}
        </div>

      </main>

      <Footer />
    </>
  )
}
