import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { SearchBar } from '@/components/SearchBar'
import { browseMovies } from '@/lib/queries'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, GENRES, LANGUAGES, LANGUAGE_META, INDUSTRIES, capitalise } from '@/lib/utils'
import { SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    q?: string
    genre?: string
    language?: string
    industry?: string
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Navigation />

      <main className="pt-16">
        {/* Header */}
        <section className="py-12 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">Browse</li>
              </ol>
            </nav>

            <h1 className="text-3xl font-bold text-film-cream mb-2">
              {sp.industry
                ? `${sp.industry} films`
                : sp.genre
                  ? `${capitalise(sp.genre)} films`
                  : sp.q
                    ? `Results for "${sp.q}"`
                    : 'Browse African cinema'}
            </h1>
            <p className="text-film-muted mb-6">
              {total.toLocaleString()} {total === 1 ? 'film' : 'films'} in the archive
            </p>

            <SearchBar defaultValue={sp.q} />
          </div>
        </section>

        {/* Filters + grid */}
        <div className="section-container py-10">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar filters */}
            <aside className="lg:w-56 flex-shrink-0" aria-label="Filter options">
              <div className="sticky top-20 space-y-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-film-cream">
                  <SlidersHorizontal className="w-4 h-4 text-film-gold" aria-hidden="true" />
                  Filters
                </div>

                {/* Industry */}
                <fieldset>
                  <legend className="section-label mb-3">Industry</legend>
                  <div className="space-y-1">
                    <Link
                      href={buildUrl({ industry: undefined, page: '1' })}
                      className={`block px-3 py-2 rounded text-sm transition-colors ${
                        !sp.industry ? 'bg-film-gold text-cinema-black font-medium' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                      }`}
                    >
                      All industries
                    </Link>
                    {INDUSTRIES.filter(i => i !== 'Other').map((ind) => (
                      <Link
                        key={ind}
                        href={buildUrl({ industry: ind, page: '1' })}
                        className={`block px-3 py-2 rounded text-sm transition-colors ${
                          sp.industry === ind ? 'bg-film-gold text-cinema-black font-medium' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                        }`}
                      >
                        {ind}
                      </Link>
                    ))}
                  </div>
                </fieldset>

                {/* Genre */}
                <fieldset>
                  <legend className="section-label mb-3">Genre</legend>
                  <div className="space-y-1">
                    <Link
                      href={buildUrl({ genre: undefined, page: '1' })}
                      className={`block px-3 py-2 rounded text-sm transition-colors ${
                        !sp.genre ? 'bg-film-gold text-cinema-black font-medium' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                      }`}
                    >
                      All genres
                    </Link>
                    {GENRES.map((g) => (
                      <Link
                        key={g}
                        href={buildUrl({ genre: g, page: '1' })}
                        className={`block px-3 py-2 rounded text-sm transition-colors ${
                          sp.genre === g ? 'bg-film-gold text-cinema-black font-medium' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                        }`}
                      >
                        {capitalise(g)}
                      </Link>
                    ))}
                  </div>
                </fieldset>

                {/* Language */}
                <fieldset>
                  <legend className="section-label mb-3">Language</legend>
                  <div className="space-y-1">
                    <Link
                      href={buildUrl({ language: undefined, page: '1' })}
                      className={`block px-3 py-2 rounded text-sm transition-colors ${
                        !sp.language ? 'bg-cinema-surface text-film-cream' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                      }`}
                    >
                      All languages
                    </Link>
                    {LANGUAGES.filter(l => l !== 'other').map((l) => (
                      <Link
                        key={l}
                        href={buildUrl({ language: l, page: '1' })}
                        className={`flex items-baseline justify-between px-3 py-1.5 rounded text-sm transition-colors ${
                          sp.language === l ? 'bg-cinema-surface text-film-gold font-medium' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                        }`}
                      >
                        <span>{capitalise(l)}</span>
                        {LANGUAGE_META[l] && (
                          <span className="text-[10px] text-film-subtle ml-2 shrink-0">
                            {LANGUAGE_META[l]}
                          </span>
                        )}
                      </Link>
                    ))}
                    <Link
                      href={buildUrl({ language: 'other', page: '1' })}
                      className={`block px-3 py-1.5 rounded text-sm transition-colors ${
                        sp.language === 'other' ? 'bg-cinema-surface text-film-gold font-medium' : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                      }`}
                    >
                      Other
                    </Link>
                  </div>
                </fieldset>

                {/* Sort */}
                <fieldset>
                  <legend className="section-label mb-3">Sort by</legend>
                  <div className="space-y-1">
                    {[
                      { value: 'created_at:desc', label: 'Newest first'    },
                      { value: 'average_rating:desc', label: 'Highest rated' },
                      { value: 'release_year:desc', label: 'Year (newest)'  },
                      { value: 'release_year:asc',  label: 'Year (oldest)'  },
                      { value: 'title:asc',         label: 'A to Z'         },
                    ].map((opt) => (
                      <Link
                        key={opt.value}
                        href={buildUrl({ sort: opt.value, page: '1' })}
                        className={`block px-3 py-2 rounded text-sm transition-colors ${
                          (sp.sort || 'created_at:desc') === opt.value
                            ? 'text-film-gold font-medium'
                            : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                        }`}
                      >
                        {opt.label}
                      </Link>
                    ))}
                  </div>
                </fieldset>
              </div>
            </aside>

            {/* Movie grid */}
            <div className="flex-1 min-w-0">
              {movies.length > 0 ? (
                <>
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4"
                    aria-label={`${movies.length} movies shown`}
                  >
                    {movies.map((movie) => (
                      <MovieCard
                        key={movie.id}
                        id={movie.id}
                        title={movie.title}
                        release_year={movie.release_year}
                        genre={movie.genre}
                        language={movie.language}
                        poster_url={movie.poster_url}
                        average_rating={movie.average_rating}
                        review_count={movie.review_count}
                        director={movie.director || movie.creator?.name}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-2">
                      {page > 1 && (
                        <Link href={buildUrl({ page: String(page - 1) })} className="btn-outline p-2" aria-label="Previous page">
                          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      )}
                      <span className="text-sm text-film-muted px-4">
                        Page {page} of {totalPages}
                      </span>
                      {page < totalPages && (
                        <Link href={buildUrl({ page: String(page + 1) })} className="btn-outline p-2" aria-label="Next page">
                          <ChevronRight className="w-4 h-4" aria-hidden="true" />
                        </Link>
                      )}
                    </nav>
                  )}
                </>
              ) : (
                <div className="text-center py-20">
                  <span className="text-5xl block mb-4" aria-hidden="true">🎬</span>
                  <h2 className="text-xl font-semibold text-film-cream mb-2">No films found</h2>
                  <p className="text-film-muted mb-6">Try different filters or search terms.</p>
                  <Link href="/browse" className="btn-outline">Clear filters</Link>
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
