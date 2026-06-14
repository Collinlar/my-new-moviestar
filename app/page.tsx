import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Film, Star, TrendingUp, Award, Users, ArrowRight, ChevronRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard, MovieCardWide } from '@/components/MovieCard'
import { SearchBar } from '@/components/SearchBar'
import { getFeaturedMovies, getTrendingMovies, getCanonMovies, getTopCreators, getDbStats } from '@/lib/queries'
import { INDUSTRY_META, formatCount } from '@/lib/utils'
import { websiteSchema, organizationSchema, faqSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'The African Movie Database | MuvieStars',
  description:
    "Explore Africa's most complete collection of movies, filmmakers, and reviews — from timeless classics to new releases across Nollywood, Ghallywood, and beyond.",
  alternates: { canonical: 'https://muviestars.com' },
}

export const revalidate = 3600 // revalidate every hour

const HOME_FAQ = [
  {
    question: 'What is MuvieStars?',
    answer:
      'MuvieStars is the most comprehensive database of African cinema on the internet. It covers films from Nollywood (Nigeria), Ghallywood (Ghana), Francophone African cinema, East African films, South African cinema, and the African diaspora worldwide. Users can discover movies, read and write reviews, track watchlists, and explore filmmakers.',
  },
  {
    question: 'How many African movies are on MuvieStars?',
    answer:
      'MuvieStars currently documents over 8,350 African films spanning more than five decades of cinema. The database includes films in Yoruba, Igbo, Hausa, Twi, Pidgin, Swahili, French, Arabic, and English, among other African languages.',
  },
  {
    question: 'What is the African Film Canon?',
    answer:
      'The African Film Canon is a curated collection of landmark films that defined African storytelling. These are films selected by the MuvieStars editorial team for their cultural significance, critical acclaim, or historical importance to African cinema heritage.',
  },
  {
    question: 'Which African film industries are covered?',
    answer:
      "MuvieStars covers all major African film industries including Nollywood (Nigeria's world-famous industry), Ghallywood (Ghana), South African cinema, Kenyan films, Ethiopian cinema, Senegalese films, Cameroonian films, Ivorian productions, and diaspora African films from Europe and North America.",
  },
]

export default async function HomePage() {
  const [featured, trending, canon, creators, stats] = await Promise.all([
    getFeaturedMovies(6),
    getTrendingMovies(8),
    getCanonMovies(4),
    getTopCreators(4),
    getDbStats(),
  ])

  const schemaGraph = [websiteSchema(), organizationSchema(), faqSchema(HOME_FAQ)]

  return (
    <>
      {/* JSON-LD — injected server-side, visible to all crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': schemaGraph }) }}
      />

      <Navigation />

      <main>
        {/* ─── HERO ─────────────────────────────────────────────────────── */}
        <section
          className="relative flex items-center min-h-screen pt-16 overflow-hidden"
          aria-labelledby="hero-heading"
        >
          {/* Background: film-strip grid of posters */}
          <div
            className="absolute inset-0 bg-cinema-black"
            aria-hidden="true"
          >
            {/* Diagonal gold accent line */}
            <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-film-gold/20 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(200,150,62,0.12),transparent)]" />
          </div>

          <div className="relative section-container py-24 lg:py-32 w-full">
            <div className="max-w-4xl mx-auto text-center">
              {/* Label */}
              <p className="section-label mb-6 animate-fade-in">
                The African Movie Database
              </p>

              {/* Headline */}
              <h1
                id="hero-heading"
                className="text-5xl sm:text-6xl lg:text-7xl font-bold text-film-cream leading-[1.1] tracking-tight animate-fade-in text-balance"
              >
                Africa's cinema,{' '}
                <span className="text-gold">documented.</span>
              </h1>

              {/* Sub-headline */}
              <p className="mt-6 text-lg sm:text-xl text-film-muted max-w-2xl mx-auto leading-relaxed animate-fade-in text-balance">
                Thousands of films from Nollywood, Ghallywood, and across the continent.
                Reviewed, rated, and preserved — including those no longer available to watch.
              </p>

              {/* Search */}
              <div className="mt-10 max-w-2xl mx-auto animate-fade-in">
                <SearchBar size="large" />
              </div>

              {/* Stats — live from the database */}
              <div
                className="mt-10 flex flex-wrap justify-center gap-6 text-sm animate-fade-in"
                aria-label="Database statistics"
              >
                {[
                  { icon: Film,  value: formatCount(stats.movieCount),  label: 'African films'      },
                  { icon: Star,  value: formatCount(stats.reviewCount),  label: 'Community reviews'  },
                  { icon: Users, value: String(stats.countryCount || 0), label: 'Countries covered'  },
                ].map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-cinema-dark border border-cinema-border"
                  >
                    <Icon className="w-4 h-4 text-film-gold" aria-hidden="true" />
                    <span className="font-semibold text-film-cream">{value}</span>
                    <span className="text-film-muted">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div
            className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-cinema-black to-transparent pointer-events-none"
            aria-hidden="true"
          />
        </section>

        {/* ─── FEATURED MOVIES ─────────────────────────────────────────── */}
        <section className="py-20 bg-cinema-black" aria-labelledby="featured-heading">
          <div className="section-container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="section-label mb-2">Editor's picks</p>
                <h2 id="featured-heading" className="text-2xl font-bold text-film-cream">
                  From the Archive
                </h2>
              </div>
              <Link href="/featured" className="btn-ghost text-sm gap-1 hidden sm:flex">
                View all <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {featured.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {featured.slice(0, 4).map((movie) => (
                  <MovieCardWide
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
            ) : (
              <EmptyState
                icon="🎬"
                title="Featured films coming soon"
                description="Our editors are curating the best of African cinema."
              />
            )}

            <div className="mt-6 text-center sm:hidden">
              <Link href="/featured" className="btn-outline text-sm">
                View all picks
              </Link>
            </div>
          </div>
        </section>

        {/* ─── AFRICAN FILM CANON ───────────────────────────────────────── */}
        <section
          className="py-20 bg-cinema-dark border-y border-cinema-border"
          aria-labelledby="canon-heading"
        >
          <div className="section-container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="section-label mb-2">Essential viewing</p>
                <h2 id="canon-heading" className="text-2xl font-bold text-film-cream flex items-center gap-2">
                  <Award className="w-6 h-6 text-film-gold" aria-hidden="true" />
                  African Film Canon
                </h2>
                <p className="mt-2 text-sm text-film-muted max-w-md">
                  Landmark films that shaped African storytelling across generations.
                </p>
              </div>
              <Link href="/canon" className="btn-ghost text-sm gap-1 hidden sm:flex">
                Full canon <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {canon.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {canon.map((movie) => (
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
                    isCanon
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="poster-wrap skeleton rounded-lg" />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── TRENDING ─────────────────────────────────────────────────── */}
        <section className="py-20 bg-cinema-black" aria-labelledby="trending-heading">
          <div className="section-container">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="section-label mb-2">This week</p>
                <h2 id="trending-heading" className="text-2xl font-bold text-film-cream flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-film-gold" aria-hidden="true" />
                  Trending now
                </h2>
              </div>
              <Link href="/trending" className="btn-ghost text-sm gap-1 hidden sm:flex">
                See all <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            {trending.length > 0 ? (
              <div className="scroll-rail">
                {trending.map((movie) => (
                  <div key={movie.id} className="w-40 sm:w-48">
                    <MovieCard
                      id={movie.id}
                      title={movie.title}
                      release_year={movie.release_year}
                      genre={movie.genre}
                      language={movie.language}
                      poster_url={movie.poster_url}
                      average_rating={movie.average_rating}
                      review_count={movie.review_count}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="scroll-rail">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="w-40 sm:w-48 flex-shrink-0">
                    <div className="poster-wrap skeleton rounded-t-lg" />
                    <div className="p-3 space-y-2 bg-cinema-dark rounded-b-lg border border-cinema-border">
                      <div className="skeleton h-3 w-3/4 rounded" />
                      <div className="skeleton h-2 w-1/2 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ─── FILMMAKERS ───────────────────────────────────────────────── */}
        {creators.length > 0 && (
          <section
            className="py-20 bg-cinema-dark border-t border-cinema-border"
            aria-labelledby="filmmakers-heading"
          >
            <div className="section-container">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="section-label mb-2">Behind the camera</p>
                  <h2 id="filmmakers-heading" className="text-2xl font-bold text-film-cream flex items-center gap-2">
                    <Users className="w-5 h-5 text-film-gold" aria-hidden="true" />
                    People behind African cinema
                  </h2>
                </div>
                <Link href="/creators" className="btn-ghost text-sm gap-1 hidden sm:flex">
                  All filmmakers <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {creators.map((creator) => (
                  <Link
                    key={creator.id}
                    href={`/creator/${creator.id}`}
                    className="cinema-card group text-center p-4"
                  >
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-cinema-surface border border-cinema-border mb-3">
                      {creator.image_url ? (
                        <img
                          src={creator.image_url}
                          alt={creator.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🎬
                        </div>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-film-cream group-hover:text-film-gold transition-colors line-clamp-1">
                      {creator.name}
                    </h3>
                    {creator.movie_count != null && (
                      <p className="text-xs text-film-muted mt-0.5">
                        {creator.movie_count} {creator.movie_count === 1 ? 'film' : 'films'}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── BROWSE BY INDUSTRY ───────────────────────────────────────── */}
        <section className="py-20 bg-cinema-black border-t border-cinema-border" aria-labelledby="industry-heading">
          <div className="section-container">
            <p className="section-label mb-2">Explore African cinema</p>
            <h2 id="industry-heading" className="text-2xl font-bold text-film-cream mb-2">
              Browse by industry
            </h2>
            <p className="text-sm text-film-muted mb-10 max-w-xl">
              African cinema is not one thing. Each industry has its own voice, history, and audience.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-cinema-border" role="list">
              {Object.entries(INDUSTRY_META).slice(0, 9).map(([name, meta]) => (
                <div key={name} role="listitem" className="bg-cinema-black">
                  <Link
                    href={`/browse?industry=${encodeURIComponent(name)}`}
                    className="group flex flex-col justify-between h-full p-6 hover:bg-cinema-dark transition-colors"
                  >
                    <div>
                      <p className="text-[10px] font-semibold tracking-widest text-film-subtle uppercase mb-3">
                        {meta.region}
                      </p>
                      <h3 className="text-xl font-bold text-film-cream group-hover:text-film-gold transition-colors leading-tight">
                        {name}
                      </h3>
                      <p className="text-xs text-film-muted mt-2 leading-relaxed">
                        {meta.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-6 text-xs text-film-subtle group-hover:text-film-gold transition-colors">
                      <span>Browse films</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── BROWSE BY GENRE ──────────────────────────────────────────── */}
        <section className="py-16 bg-cinema-dark border-t border-cinema-border" aria-labelledby="genre-heading">
          <div className="section-container">
            <p className="section-label mb-2">By mood</p>
            <h2 id="genre-heading" className="text-xl font-bold text-film-cream mb-6">
              What are you in the mood for?
            </h2>
            <div className="flex flex-wrap gap-2" role="list">
              {[
                { label: 'Drama',       href: '/browse?genre=drama'       },
                { label: 'Comedy',      href: '/browse?genre=comedy'      },
                { label: 'Action',      href: '/browse?genre=action'      },
                { label: 'Romance',     href: '/browse?genre=romance'     },
                { label: 'Documentary', href: '/browse?genre=documentary' },
                { label: 'Thriller',    href: '/browse?genre=thriller'    },
                { label: 'Historical',  href: '/browse?genre=historical'  },
                { label: 'Family',      href: '/browse?genre=family'      },
              ].map((g) => (
                <div key={g.label} role="listitem">
                  <Link
                    href={g.href}
                    className="inline-flex items-center px-4 py-2 rounded-full border border-cinema-border text-sm text-film-muted hover:text-film-cream hover:border-film-gold/50 transition-colors"
                  >
                    {g.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── FAQ — AI snippet capture ─────────────────────────────────── */}
        <section
          className="py-20 bg-cinema-dark border-t border-cinema-border"
          aria-labelledby="faq-heading"
        >
          <div className="section-container max-w-3xl">
            <p className="section-label mb-2">Common questions</p>
            <h2 id="faq-heading" className="text-2xl font-bold text-film-cream mb-10">
              About MuvieStars
            </h2>

            <dl className="space-y-6">
              {HOME_FAQ.map((item) => (
                <div
                  key={item.question}
                  className="border-b border-cinema-border pb-6 last:border-0"
                >
                  <dt className="text-base font-semibold text-film-cream mb-3">
                    {item.question}
                  </dt>
                  <dd className="text-sm text-film-muted leading-relaxed">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ─── CTA ──────────────────────────────────────────────────────── */}
        <section
          className="py-20 bg-cinema-black border-t border-cinema-border"
          aria-labelledby="cta-heading"
        >
          <div className="section-container text-center max-w-2xl">
            <Film className="w-10 h-10 text-film-gold mx-auto mb-6" aria-hidden="true" />
            <h2 id="cta-heading" className="text-3xl font-bold text-film-cream mb-4 text-balance">
              Join Africa's growing cinema archive
            </h2>
            <p className="text-film-muted mb-8 text-balance">
              Review films, contribute knowledge, and help preserve African cinema for future generations.
              Every review added makes the archive richer.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth" className="btn-gold">
                Create free account
              </Link>
              <Link href="/browse" className="btn-outline">
                Explore the archive
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function EmptyState({
  icon, title, description,
}: { icon: string; title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <span className="text-5xl mb-4 block" aria-hidden="true">{icon}</span>
      <h3 className="text-base font-semibold text-film-cream mb-2">{title}</h3>
      <p className="text-sm text-film-muted">{description}</p>
    </div>
  )
}
