import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { personSchema, breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: person } = await (supabase as any).from('people').select('*').eq('id', id).single()
  if (!person) return { title: 'Person Not Found' }
  return {
    title: `${person.full_name} — African Actor`,
    description: truncate(person.bio || `${person.full_name} is an African actor documented on MuvieStars.`, 160),
    alternates: { canonical: `${SITE_URL}/person/${id}` },
    openGraph: {
      title: `${person.full_name} | MuvieStars`,
      images: person.profile_image ? [{ url: person.profile_image, alt: person.full_name }] : undefined,
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: person } = await (supabase as any).from('people').select('*').eq('id', id).single()
  if (!person) notFound()

  const { data: movieLinks } = await supabase
    .from('movie_people')
    .select('role, character_name, movie:movies(id, title, release_year, genre, poster_url, average_rating, review_count)')
    .eq('person_id', id)
    .order('created_at', { ascending: false })

  const schema = personSchema({
    id,
    name: person.full_name,
    bio: person.bio,
    image_url: person.profile_image,
    nationality: person.country,
    birth_year: person.birth_year,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'People', url: `${SITE_URL}/people` },
    { name: person.full_name, url: `${SITE_URL}/person/${id}` },
  ])

  const initial = person.full_name.charAt(0).toUpperCase()
  const films = (movieLinks || []).filter((l: any) => l.movie)

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
              href="/people"
              style={{ ...MONO, fontSize: '12px', color: '#6A6258', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '32px' }}
            >
              ← All people
            </Link>

            <div
              style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}
              itemScope
              itemType="https://schema.org/Person"
            >
              {/* Avatar */}
              <div style={{ width: '96px', height: '96px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(237,228,210,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {person.profile_image ? (
                  <img
                    src={person.profile_image}
                    alt={person.full_name}
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
                  {person.full_name}
                </h1>
                {person.country && (
                  <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: 0 }} itemProp="nationality">
                    {person.country}
                  </p>
                )}
                {person.bio && (
                  <p
                    style={{ margin: '4px 0 0', fontSize: '16px', lineHeight: '1.65', color: '#8C857A', maxWidth: '560px' }}
                    itemProp="description"
                  >
                    {person.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FILMS ─────────────────────────────────────────────────── */}
        {films.length > 0 && (
          <section style={{ paddingTop: '56px', paddingBottom: '80px' }} aria-labelledby="films-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p
                id="films-heading"
                style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}
              >
                Films
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                {films.map((link: any) => {
                  const movie = link.movie
                  return (
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
                          {link.role ? ` · ${link.role}` : ''}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </>
  )
}
