import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getCreatorById, getCreatorMovies, getAllCreatorIds } from '@/lib/queries'
import { hasSupabaseConfig } from '@/lib/supabase/env'
import { personSchema, breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  if (!hasSupabaseConfig()) return []
  try {
    const ids = await getAllCreatorIds()
    return ids.map((id) => ({ id }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const creator = await getCreatorById(id)
  if (!creator) return { title: 'Filmmaker Not Found' }
  return {
    title: `${creator.name} — African Filmmaker`,
    description: truncate(
      creator.bio || `${creator.name} is an African filmmaker with films documented on MuvieStars.`,
      160
    ),
    alternates: { canonical: `${SITE_URL}/creator/${id}` },
    openGraph: {
      title: `${creator.name} | MuvieStars`,
      images: creator.image_url ? [{ url: creator.image_url, alt: creator.name }] : undefined,
    },
  }
}

export const revalidate = 86400

export default async function CreatorPage({ params }: PageProps) {
  const { id } = await params
  const [creator, movies] = await Promise.all([
    getCreatorById(id),
    getCreatorMovies(id),
  ])

  if (!creator) notFound()

  const schema = personSchema({ ...creator, id })
  const crumbs = breadcrumbSchema([
    { name: 'Home',       url: SITE_URL },
    { name: 'Filmmakers', url: `${SITE_URL}/creators` },
    { name: creator.name, url: `${SITE_URL}/creator/${id}` },
  ])

  const initial = creator.name.charAt(0).toUpperCase()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [schema, crumbs] }) }}
      />

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '56px', paddingBottom: '56px' }}>

            <Link
              href="/creators"
              style={{ ...MONO, fontSize: '12px', color: '#6A6258', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}
            >
              ← All filmmakers
            </Link>

            <div
              style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}
              itemScope
              itemType="https://schema.org/Person"
            >
              {/* Avatar */}
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(237,228,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {creator.image_url ? (
                  <img
                    src={creator.image_url}
                    alt={`${creator.name} — African filmmaker`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    itemProp="image"
                  />
                ) : (
                  <span style={{ ...SERIF, fontSize: '40px', color: '#C8963E' }}>{initial}</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h1
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,56px)', lineHeight: '0.96', color: '#F6EFE2', margin: 0 }}
                  itemProp="name"
                >
                  {creator.name}
                </h1>
                <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: 0 }}>
                  {movies.length} {movies.length === 1 ? 'film' : 'films'} in the archive
                </p>
                {creator.bio && (
                  <p
                    style={{ margin: '4px 0 0', fontSize: '16px', lineHeight: '1.65', color: '#8C857A', maxWidth: '560px' }}
                    itemProp="description"
                  >
                    {creator.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FILMOGRAPHY ───────────────────────────────────────────── */}
        <section style={{ paddingTop: '56px', paddingBottom: '80px' }} aria-labelledby="filmography-heading">
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <p
              id="filmography-heading"
              style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}
            >
              Filmography
            </p>

            {movies.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                {movies.map((movie) => (
                  <Link
                    key={movie.id}
                    href={`/movie/${movie.id}`}
                    style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', background: '#15120E', position: 'relative' }}>
                      {movie.poster_url ? (
                        <img
                          src={movie.poster_url}
                          alt={movie.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', opacity: 0.15 }}>
                          🎬
                        </div>
                      )}

                      {movie.average_rating > 0 && (
                        <div style={{
                          position: 'absolute', top: '7px', right: '7px',
                          height: '22px', padding: '0 7px', borderRadius: '999px',
                          background: 'rgba(11,10,9,0.8)',
                          ...MONO, fontSize: '10px', fontWeight: 700, color: '#C8963E',
                          display: 'flex', alignItems: 'center',
                        }}>
                          {movie.average_rating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {movie.title}
                      </p>
                      <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                        {movie.release_year}
                        {movie.genre ? ` · ${movie.genre}` : ''}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ padding: '56px 24px', borderRadius: '20px', border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center' }}>
                <p style={{ fontSize: '16px', color: '#6A6258', margin: 0 }}>No films found for this filmmaker.</p>
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
