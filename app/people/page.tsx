import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'
import { cleanSearchTerm } from '@/lib/people'

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

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 60

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function PeoplePage({ searchParams }: PageProps) {
  const { q, page: pageParam } = await searchParams
  const term = cleanSearchTerm(q ?? '')
  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE

  const supabase = await createClient()
  let query = (supabase as any)
    .from('people')
    .select('id, slug, full_name, profile_image, country, verified', { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('full_name', { ascending: true })
    .range(from, from + PAGE_SIZE - 1)
  if (term) query = query.ilike('search_text', `%${term}%`)

  const { data: people, count } = await query
  const personList = (people as any[]) || []
  const totalPages = Math.max(1, Math.ceil(((count as number) || 0) / PAGE_SIZE))
  const pageHref = (p: number) => {
    const params = new URLSearchParams()
    if (term) params.set('q', term)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/people?${qs}` : '/people'
  }

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
              <form action="/people" method="get" role="search" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <label htmlFor="people-q" className="sr-only">Search people</label>
                <input
                  id="people-q"
                  name="q"
                  type="search"
                  defaultValue={term}
                  placeholder="Who are you looking for?"
                  autoComplete="off"
                  style={{ flex: 1, minWidth: 0, height: '48px', padding: '0 16px', borderRadius: '14px', background: '#0B0A09', border: '1px solid rgba(237,228,210,0.16)', color: '#F6EFE2', fontSize: '16px' }}
                />
                <button
                  type="submit"
                  style={{ height: '48px', padding: '0 20px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  Find them
                </button>
              </form>
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
                  href={`/person/${person.slug}`}
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
              <p style={{ fontSize: '16px', color: '#8C857A', margin: 0, lineHeight: 1.6 }}>
                {term
                  ? `Nobody called "${term}" is on MuvieStars yet.`
                  : 'Profiles are being added to the archive.'}
              </p>
              {term && (
                <Link href="/people" style={{ color: '#C8963E', fontSize: '15px', textDecoration: 'none', minHeight: '44px', lineHeight: '44px' }}>
                  See everyone
                </Link>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <nav aria-label="People pages" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '48px', gap: '16px' }}>
              {page > 1 ? (
                <Link href={pageHref(page - 1)} rel="prev" style={{ minHeight: '44px', lineHeight: '44px', color: '#EDE4D2', textDecoration: 'none', fontSize: '15px' }}>
                  ← Previous
                </Link>
              ) : <span />}
              <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>Page {page} of {totalPages}</span>
              {page < totalPages ? (
                <Link href={pageHref(page + 1)} rel="next" style={{ minHeight: '44px', lineHeight: '44px', color: '#EDE4D2', textDecoration: 'none', fontSize: '15px' }}>
                  Next →
                </Link>
              ) : <span />}
            </nav>
          )}
        </div>

      </main>

      <Footer />
    </>
  )
}
