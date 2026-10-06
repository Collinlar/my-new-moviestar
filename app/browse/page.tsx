import type { Metadata } from 'next'
import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SearchBar } from '@/components/SearchBar'
import { browseMovies } from '@/lib/queries'
import { breadcrumbSchema } from '@/lib/schema'
import { ListedDot } from '@/components/ListedMark'
import { SITE_URL, GENRES, LANGUAGES, LANGUAGE_META, INDUSTRIES, capitalise } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  searchParams: Promise<{
    q?: string
    genre?: string
    language?: string
    industry?: string
    country?: string
    yearFrom?: string
    yearTo?: string
    sort?: string
    page?: string
  }>
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const sp = await searchParams
  const parts: string[] = ['Browse African Movies']
  if (sp.genre) parts.push(capitalise(sp.genre))
  if (sp.language) parts.push(capitalise(sp.language))
  const title = parts.join(' — ')
  return {
    title,
    description:
      'Browse and discover African movies by genre, language, country, and year. Find Nollywood, Ghallywood, and African cinema gems with advanced filters.',
    alternates: { canonical: `${SITE_URL}/browse` },
    robots: sp.q ? { index: false } : undefined,
  }
}

export const dynamic = 'force-dynamic'

export default async function BrowsePage({ searchParams }: PageProps) {
  const sp       = await searchParams
  const page     = Math.max(1, Number(sp.page || 1))
  const perPage  = 24
  const offset   = (page - 1) * perPage

  const [sortBy, sortOrder] = (sp.sort || 'created_at:desc').split(':')

  const { movies, total } = await browseMovies({
    search:    sp.q,
    genre:     sp.genre,
    language:  sp.language,
    industry:  sp.industry,
    country:   sp.country,
    yearFrom:  sp.yearFrom ? Number(sp.yearFrom) : undefined,
    yearTo:    sp.yearTo   ? Number(sp.yearTo)   : undefined,
    sortBy:    sortBy as 'title' | 'release_year' | 'average_rating' | 'created_at',
    sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
    limit:     perPage,
    offset,
  })

  const totalPages = Math.ceil(total / perPage)

  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'Browse', url: `${SITE_URL}/browse` },
  ])

  const buildUrl = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { ...sp, ...extra }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    return `/browse?${p.toString()}`
  }

  const activeSort = sp.sort || 'created_at:desc'

  const SORT_OPTIONS = [
    { value: 'created_at:desc',     label: 'Newest first'  },
    { value: 'average_rating:desc', label: 'Highest rated' },
    { value: 'release_year:desc',   label: 'Year (newest)' },
    { value: 'release_year:asc',    label: 'Year (oldest)' },
    { value: 'title:asc',           label: 'A to Z'        },
  ]

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
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '40px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '640px' }}>
              <div>
                <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                  {sp.country
                    ? `Films from ${sp.country}`
                    : sp.industry
                    ? `${sp.industry} films`
                    : sp.genre
                      ? `${capitalise(sp.genre)} films`
                      : sp.q
                        ? `Results for "${sp.q}"`
                        : 'African cinema'}
                </h1>
                <p style={{ ...MONO, fontSize: '13px', color: '#6A6258', margin: '8px 0 0' }}>
                  {total.toLocaleString()} {total === 1 ? 'film' : 'films'} in the archive
                </p>
              </div>

              <SearchBar defaultValue={sp.q} />
            </div>
          </div>
        </section>

        {/* ── FILTER STRIP ──────────────────────────────────────────── */}
        <div style={{ borderBottom: '1px solid rgba(237,228,210,0.06)', overflowX: 'auto' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', gap: '0', alignItems: 'stretch', minWidth: 'max-content' }}>

              {/* Industry chips */}
              <div style={{ display: 'flex', gap: '4px', padding: '12px 0', marginRight: '20px', alignItems: 'center' }}>
                {['All', ...INDUSTRIES.filter(i => i !== 'Other')].map((ind) => {
                  const active = ind === 'All' ? !sp.industry : sp.industry === ind
                  return (
                    <NavLink
                      key={ind}
                      href={buildUrl({ industry: ind === 'All' ? undefined : ind, page: '1' })}
                      style={{
                        height: '32px', padding: '0 14px', borderRadius: '999px',
                        background: active ? '#C8963E' : 'transparent',
                        border: active ? 'none' : '1px solid rgba(237,228,210,0.1)',
                        color: active ? '#0B0A09' : '#8C857A',
                        ...MONO, fontSize: '12px', fontWeight: active ? 700 : 400,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {ind}
                    </NavLink>
                  )
                })}
              </div>

              {/* Divider */}
              <div style={{ width: '1px', background: 'rgba(237,228,210,0.06)', margin: '8px 0' }} />

              {/* Genre chips */}
              <div style={{ display: 'flex', gap: '4px', padding: '12px 16px', marginRight: '4px', alignItems: 'center' }}>
                {['All', ...GENRES].map((g) => {
                  const active = g === 'All' ? !sp.genre : sp.genre === g
                  return (
                    <NavLink
                      key={g}
                      href={buildUrl({ genre: g === 'All' ? undefined : g, page: '1' })}
                      style={{
                        height: '32px', padding: '0 14px', borderRadius: '999px',
                        background: active ? 'rgba(200,150,62,0.15)' : 'transparent',
                        border: active ? '1px solid rgba(200,150,62,0.4)' : '1px solid rgba(237,228,210,0.1)',
                        color: active ? '#C8963E' : '#8C857A',
                        ...MONO, fontSize: '12px', fontWeight: active ? 600 : 400,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {g === 'All' ? 'All genres' : capitalise(g)}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
          <div style={{ display: 'flex', gap: '48px', paddingTop: '40px', paddingBottom: '80px' }}>

            {/* ── SIDEBAR ─────────────────────────────────────────────── */}
            <aside
              style={{ width: '180px', flexShrink: 0 }}
              className="hidden lg:block"
              aria-label="Filter options"
            >
              <div style={{ position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* Language */}
                <div>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 12px' }}>
                    Language
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <Link
                      href={buildUrl({ language: undefined, page: '1' })}
                      style={{
                        padding: '5px 8px', borderRadius: '6px',
                        ...MONO, fontSize: '12px',
                        color: !sp.language ? '#F6EFE2' : '#6A6258',
                        fontWeight: !sp.language ? 600 : 400,
                        textDecoration: 'none',
                        background: !sp.language ? 'rgba(246,239,226,0.06)' : 'transparent',
                      }}
                    >
                      All languages
                    </Link>
                    {LANGUAGES.filter(l => l !== 'other').map((l) => {
                      const active = sp.language === l
                      return (
                        <Link
                          key={l}
                          href={buildUrl({ language: l, page: '1' })}
                          style={{
                            padding: '5px 8px', borderRadius: '6px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            ...MONO, fontSize: '12px',
                            color: active ? '#C8963E' : '#6A6258',
                            fontWeight: active ? 600 : 400,
                            textDecoration: 'none',
                            background: active ? 'rgba(200,150,62,0.08)' : 'transparent',
                          }}
                        >
                          <span>{capitalise(l)}</span>
                          {LANGUAGE_META[l] && (
                            <span style={{ fontSize: '10px', color: '#4B4540', marginLeft: '6px' }}>{LANGUAGE_META[l]}</span>
                          )}
                        </Link>
                      )
                    })}
                    <Link
                      href={buildUrl({ language: 'other', page: '1' })}
                      style={{
                        padding: '5px 8px', borderRadius: '6px',
                        ...MONO, fontSize: '12px',
                        color: sp.language === 'other' ? '#C8963E' : '#6A6258',
                        fontWeight: sp.language === 'other' ? 600 : 400,
                        textDecoration: 'none',
                        background: sp.language === 'other' ? 'rgba(200,150,62,0.08)' : 'transparent',
                      }}
                    >
                      Other
                    </Link>
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 12px' }}>
                    Sort
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {SORT_OPTIONS.map((opt) => {
                      const active = activeSort === opt.value
                      return (
                        <Link
                          key={opt.value}
                          href={buildUrl({ sort: opt.value, page: '1' })}
                          style={{
                            padding: '5px 8px', borderRadius: '6px',
                            ...MONO, fontSize: '12px',
                            color: active ? '#F6EFE2' : '#6A6258',
                            fontWeight: active ? 600 : 400,
                            textDecoration: 'none',
                            background: active ? 'rgba(246,239,226,0.06)' : 'transparent',
                          }}
                        >
                          {opt.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>

                {/* Active filters */}
                {(sp.genre || sp.language || sp.industry || sp.country || sp.q) && (
                  <div>
                    <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6A6258', margin: '0 0 10px' }}>
                      Active filters
                    </p>
                    <Link
                      href="/browse"
                      style={{
                        height: '32px', padding: '0 12px', borderRadius: '8px',
                        border: '1px solid rgba(224,115,90,0.2)',
                        color: '#8C4A3A', ...MONO, fontSize: '12px',
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                      }}
                    >
                      Clear all
                    </Link>
                  </div>
                )}
              </div>
            </aside>

            {/* ── GRID ────────────────────────────────────────────────── */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Mobile sort row */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }} className="lg:hidden">
                {SORT_OPTIONS.map((opt) => {
                  const active = activeSort === opt.value
                  return (
                    <NavLink
                      key={opt.value}
                      href={buildUrl({ sort: opt.value, page: '1' })}
                      style={{
                        height: '32px', padding: '0 14px', borderRadius: '999px',
                        background: active ? 'rgba(246,239,226,0.08)' : 'transparent',
                        border: active ? '1px solid rgba(237,228,210,0.2)' : '1px solid rgba(237,228,210,0.08)',
                        color: active ? '#F6EFE2' : '#6A6258',
                        ...MONO, fontSize: '11px', fontWeight: active ? 600 : 400,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {opt.label}
                    </NavLink>
                  )
                })}
              </div>

              {movies.length > 0 ? (
                <>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}
                    aria-label={`${movies.length} movies shown`}
                  >
                    {movies.map((movie) => (
                      <Link
                        key={movie.id}
                        href={`/movie/${movie.id}`}
                        style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        {/* Poster */}
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

                          {/* Rating badge */}
                          {movie.listing_status === 'approved' && <ListedDot />}
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

                        {/* Info */}
                        <div>
                          <p style={{
                            margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          }}>
                            {movie.title}
                          </p>
                          <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                            {movie.release_year}
                            {movie.genre ? ` · ${capitalise(movie.genre)}` : ''}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav
                      aria-label="Pagination"
                      style={{ marginTop: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
                    >
                      {page > 1 && (
                        <Link
                          href={buildUrl({ page: String(page - 1) })}
                          aria-label="Previous page"
                          style={{
                            height: '40px', padding: '0 20px', borderRadius: '10px',
                            border: '1px solid rgba(237,228,210,0.12)',
                            color: '#8C857A', ...MONO, fontSize: '13px',
                            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                          }}
                        >
                          ← Prev
                        </Link>
                      )}
                      <span style={{ ...MONO, fontSize: '12px', color: '#6A6258', padding: '0 8px' }}>
                        {page} / {totalPages}
                      </span>
                      {page < totalPages && (
                        <Link
                          href={buildUrl({ page: String(page + 1) })}
                          aria-label="Next page"
                          style={{
                            height: '40px', padding: '0 20px', borderRadius: '10px',
                            border: '1px solid rgba(237,228,210,0.12)',
                            color: '#8C857A', ...MONO, fontSize: '13px',
                            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                          }}
                        >
                          Next →
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                <div style={{
                  padding: '80px 24px', borderRadius: '20px',
                  border: '1px solid rgba(237,228,210,0.06)',
                  textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center',
                }}>
                  <span style={{ fontSize: '48px', opacity: 0.3 }} aria-hidden="true">🎬</span>
                  <div>
                    <p style={{ ...SERIF, fontSize: '22px', color: '#F6EFE2', margin: '0 0 8px' }}>No films found</p>
                    <p style={{ fontSize: '15px', color: '#6A6258', margin: 0 }}>Try different filters or search terms.</p>
                  </div>
                  <NavLink button pendingLabel="Opening the archive..."
                    href="/browse"
                    style={{
                      height: '44px', padding: '0 24px', borderRadius: '12px',
                      border: '1px solid rgba(237,228,210,0.12)',
                      color: '#EDE4D2', fontSize: '14px', textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center', ...MONO,
                    }}
                  >
                    Clear filters
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
