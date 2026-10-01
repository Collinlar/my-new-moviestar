import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import {
  getMovieById, getMovieReviews, getMovieCast,
  getMovieAwards, getAllMovieIds, browseMovies, getMovieVerdict,
} from '@/lib/queries'
import { hasSupabaseConfig } from '@/lib/supabase/env'
import { ReviewForm } from '@/components/ReviewForm'
import { WatchlistButton } from '@/components/WatchlistButton'
import { HelpfulButton } from '@/components/HelpfulButton'
import { SaveToListButton } from '@/components/SaveToListButton'
import { CommunityVerdict } from '@/components/CommunityVerdict'
import { PersonalContext } from '@/components/PersonalContext'
import { movieSchema, breadcrumbSchema } from '@/lib/schema'
import { ROLE_GROUPS } from '@/lib/people'
import { ListedMark } from '@/components/ListedMark'
import { capitalise, formatRating, truncate, SITE_URL } from '@/lib/utils'

// Films that were turned down or taken down should not be found through search engines.
const HIDDEN_FROM_SEARCH = ['rejected', 'archived', 'delisted']

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  if (!hasSupabaseConfig()) return []
  try {
    const ids = await getAllMovieIds()
    return ids.slice(0, 500).map((id) => ({ id }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const movie = await getMovieById(id)
  if (!movie) return { title: 'Movie Not Found' }

  const title   = `${movie.title} (${movie.release_year})`
  const desc    = truncate(movie.synopsis || movie.description, 160)
  const country = movie.country ? ` from ${movie.country}` : ''
  const dir     = movie.director || movie.creator?.name
  const fullDesc = desc || `${movie.title} is a ${movie.release_year} ${movie.genre} film${country}${dir ? ` directed by ${dir}` : ''}.`

  return {
    title,
    description: fullDesc,
    keywords: [
      movie.title, movie.genre, capitalise(movie.language),
      movie.country || '', movie.director || '',
      'African movie', 'African cinema', 'movie review',
    ].filter(Boolean),
    alternates: { canonical: `${SITE_URL}/movie/${id}` },
    robots: HIDDEN_FROM_SEARCH.includes(movie.listing_status ?? '') ? { index: false, follow: true } : undefined,
    openGraph: {
      title, description: fullDesc, type: 'video.movie',
      url: `${SITE_URL}/movie/${id}`,
      images: movie.poster_url
        ? [{ url: movie.poster_url, width: 800, height: 1200, alt: `${movie.title} poster` }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image', title, description: fullDesc,
      images: movie.poster_url ? [movie.poster_url] : undefined,
    },
  }
}

export const revalidate = 3600

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params
  const [movie, reviews, cast, awards, verdict] = await Promise.all([
    getMovieById(id),
    getMovieReviews(id, 8),
    getMovieCast(id),
    getMovieAwards(id),
    getMovieVerdict(id),
  ])

  if (!movie) notFound()

  const { movies: relatedMovies } = await browseMovies({ genre: movie.genre, limit: 6 }).catch(() => ({ movies: [], total: 0 }))
  const similar = relatedMovies.filter((m) => m.id !== id).slice(0, 4)

  const schema = movieSchema(movie, reviews, cast)
  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'Discover', url: `${SITE_URL}/discover` },
    { name: movie.title, url: `${SITE_URL}/movie/${id}` },
  ])

  const dir       = movie.director || movie.creator?.name
  const wonAwards = awards.filter((a) => a.won)

  // Directors link to their profiles when they have one. Older films fall back to the text field.
  const directorCredits = cast.filter((c: any) => c.role === 'director' && c.person?.slug)
  // Acting first, then directing and the rest of the crew, each in billing order.
  const roleOrder = ROLE_GROUPS.flatMap((g) => g.roles)
  const creditsInOrder = [...cast].sort(
    (a: any, b: any) =>
      roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) ||
      (a.billing_order ?? 0) - (b.billing_order ?? 0),
  )

  const SECTION: React.CSSProperties = {
    borderTop: '1px solid rgba(237,228,210,0.06)',
    paddingTop: '72px',
    paddingBottom: '72px',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [schema, crumbs] }) }}
      />

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2' }}>

        {/* ─── HERO ──────────────────────────────────────────────────────── */}
        <section
          style={{ position: 'relative', paddingTop: '76px', overflow: 'hidden', background: '#0B0A09' }}
          aria-label={`${movie.title} header`}
        >
          {/* Blurred backdrop */}
          {movie.poster_url && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }} aria-hidden="true">
              <img
                src={movie.poster_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(60px)', transform: 'scale(1.15)', opacity: 0.08 }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11,10,9,0.5) 0%, #0B0A09 85%)' }} />
            </div>
          )}
          <div className="ms-grain" style={{ zIndex: 1 }} aria-hidden="true" />

          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ position: 'relative', zIndex: 2, paddingTop: '48px', paddingBottom: '72px' }}>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" style={{ marginBottom: '40px' }}>
              <ol style={{ display: 'flex', gap: '8px', alignItems: 'center', ...MONO, fontSize: '12px', color: '#6A6258', listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap' }}>
                <li><Link href="/" style={{ color: '#6A6258', textDecoration: 'none' }}>Home</Link></li>
                <li aria-hidden="true" style={{ opacity: 0.4 }}>/</li>
                <li><Link href="/discover" style={{ color: '#6A6258', textDecoration: 'none' }}>Discover</Link></li>
                <li aria-hidden="true" style={{ opacity: 0.4 }}>/</li>
                <li style={{ color: '#8C857A' }} aria-current="page">{movie.title}</li>
              </ol>
            </nav>

            {/* Main grid: poster | info */}
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 lg:gap-14" style={{ alignItems: 'start' }}>

              {/* ── Poster column ── */}
              <div className="max-w-[220px] mx-auto w-full lg:max-w-none lg:mx-0" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ borderRadius: '16px', overflow: 'hidden', aspectRatio: '2/3', background: '#15120E', position: 'relative', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>
                  {movie.poster_url ? (
                    <img
                      src={movie.poster_url}
                      alt={`${movie.title} poster`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="eager"
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', opacity: 0.15 }}>🎬</div>
                  )}
                </div>

                {/* Rating below poster */}
                {movie.average_rating > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                    <div style={{ ...SERIF, fontSize: '48px', lineHeight: 1, color: '#C8963E' }}>
                      {formatRating(movie.average_rating)}
                    </div>
                    <div style={{ display: 'flex', gap: '3px' }} aria-label={`${formatRating(movie.average_rating)} out of 5 stars`}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          aria-hidden="true"
                          style={{ fontSize: '14px', color: i < Math.round(movie.average_rating) ? '#C8963E' : 'rgba(237,228,210,0.15)' }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <p style={{ ...MONO, fontSize: '11px', color: '#6A6258', letterSpacing: '0.06em' }}>
                      {movie.review_count.toLocaleString()} {movie.review_count === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Info column ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Industry / canon badge */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {movie.listing_status === 'approved' && <ListedMark />}
                  {movie.industry && movie.industry !== 'Other' && (
                    <Link
                      href={`/browse?industry=${encodeURIComponent(movie.industry)}`}
                      style={{
                        height: '26px', padding: '0 12px', borderRadius: '999px',
                        background: 'rgba(200,150,62,0.12)', border: '1px solid rgba(200,150,62,0.25)',
                        ...MONO, fontSize: '11px', fontWeight: 600, color: '#C8963E',
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                      }}
                    >
                      {movie.industry}
                    </Link>
                  )}
                  {movie.is_canon && (
                    <span style={{
                      height: '26px', padding: '0 12px', borderRadius: '999px',
                      background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(200,150,62,0.2)',
                      ...MONO, fontSize: '11px', color: '#C8963E',
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C8963E', display: 'inline-block' }} />
                      African Canon
                    </span>
                  )}
                  {wonAwards.length > 0 && wonAwards.slice(0, 2).map(award => (
                    <span
                      key={award.id}
                      style={{
                        height: '26px', padding: '0 12px', borderRadius: '999px',
                        background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(200,150,62,0.2)',
                        ...MONO, fontSize: '11px', color: '#C8963E',
                        display: 'inline-flex', alignItems: 'center',
                      }}
                    >
                      🏆 {award.name} {award.year}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,5vw,80px)', lineHeight: '0.95', color: '#F6EFE2', margin: 0, letterSpacing: '-0.01em' }}>
                    {movie.title}
                  </h1>
                  {movie.original_title && movie.original_title !== movie.title && (
                    <p style={{ margin: 0, fontSize: '17px', color: '#6A6258', fontStyle: 'italic' }}>
                      {movie.original_title}
                    </p>
                  )}
                  {movie.tagline && (
                    <p style={{ margin: 0, fontSize: '18px', color: '#8C857A', fontStyle: 'italic' }}>
                      &ldquo;{movie.tagline}&rdquo;
                    </p>
                  )}
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', ...MONO, fontSize: '13px', color: '#8C857A' }}>
                  <span>{movie.release_year}</span>
                  {movie.genre && <span>{capitalise(movie.genre)}</span>}
                  {movie.language && <span>{capitalise(movie.language)}</span>}
                  {movie.country && <span>{movie.country}</span>}
                  {movie.rating && (
                    <span style={{ padding: '0 8px', border: '1px solid rgba(237,228,210,0.12)', borderRadius: '4px' }}>
                      {movie.rating}
                    </span>
                  )}
                </div>


                {/* Credits grid */}
                <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px 24px' }}>
                  {(directorCredits.length > 0 || dir) && (
                    <div>
                      <dt style={{ ...MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6A6258', marginBottom: '4px' }}>
                        {directorCredits.length > 1 ? 'Directors' : 'Director'}
                      </dt>
                      <dd style={{ fontSize: '15px', fontWeight: 500, color: '#EDE4D2', margin: 0 }}>
                        {directorCredits.length > 0
                          ? directorCredits.map((c: any, i: number) => (
                              <span key={c.id}>
                                {i > 0 && ', '}
                                <Link href={`/person/${c.person.slug}`} style={{ color: '#EDE4D2', textDecorationColor: 'rgba(200,150,62,0.6)', textUnderlineOffset: '3px' }}>
                                  {c.person.full_name}
                                </Link>
                              </span>
                            ))
                          : dir}
                      </dd>
                    </div>
                  )}
                  {movie.producer && (
                    <div>
                      <dt style={{ ...MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6A6258', marginBottom: '4px' }}>Producer</dt>
                      <dd style={{ fontSize: '15px', fontWeight: 500, color: '#EDE4D2', margin: 0 }}>{movie.producer}</dd>
                    </div>
                  )}
                  {movie.production_company && (
                    <div>
                      <dt style={{ ...MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6A6258', marginBottom: '4px' }}>Studio</dt>
                      <dd style={{ fontSize: '15px', fontWeight: 500, color: '#EDE4D2', margin: 0 }}>{movie.production_company}</dd>
                    </div>
                  )}
                  {movie.distribution_status && (
                    <div>
                      <dt style={{ ...MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6A6258', marginBottom: '4px' }}>Availability</dt>
                      <dd style={{ fontSize: '15px', fontWeight: 500, color: '#EDE4D2', margin: 0 }}>{capitalise(movie.distribution_status)}</dd>
                    </div>
                  )}
                </dl>

                {/* Keywords */}
                {movie.keywords && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {movie.keywords.split(',').map((k: string) => k.trim()).filter(Boolean).map((k: string) => (
                      <Link
                        key={k}
                        href={`/search?q=${encodeURIComponent(k)}`}
                        style={{
                          height: '28px', padding: '0 12px', borderRadius: '999px',
                          border: '1px solid rgba(237,228,210,0.1)', color: '#8C857A',
                          ...MONO, fontSize: '12px', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Personal context */}
                <PersonalContext movieId={id} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '8px' }}>
                  <a
                    href="#community-reviews"
                    style={{
                      height: '52px', padding: '0 24px', borderRadius: '14px',
                      background: '#C8963E', color: '#0B0A09',
                      fontSize: '16px', fontWeight: 600, textDecoration: 'none',
                      display: 'inline-flex', alignItems: 'center',
                    }}
                  >
                    Write a review
                  </a>
                  <WatchlistButton movieId={id} />
                  <SaveToListButton movieId={id} />
                  {movie.streaming_links && movie.streaming_links.length > 0 && (
                    <a
                      href="#where-to-watch"
                      style={{
                        height: '52px', padding: '0 24px', borderRadius: '14px',
                        border: '1px solid rgba(237,228,210,0.15)', color: '#EDE4D2',
                        fontSize: '16px', fontWeight: 500, textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center',
                      }}
                    >
                      Where to watch
                    </a>
                  )}
                  {movie.youtube_url && (
                    <a
                      href={movie.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        height: '52px', padding: '0 24px', borderRadius: '14px',
                        border: '1px solid rgba(237,228,210,0.15)', color: '#EDE4D2',
                        fontSize: '16px', fontWeight: 500, textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                      }}
                    >
                      Watch trailer
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── COMMUNITY VERDICT ──────────────────────────────────────────── */}
        {verdict && <CommunityVerdict verdict={verdict} movieTitle={movie.title} />}

        {/* ─── WHY IT'S ON MUVIESTARS ─────────────────────────────────────── */}
        {movie.why_listed && (
          <section style={{ ...SECTION, paddingTop: '56px', paddingBottom: '56px' }} aria-labelledby="why-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ maxWidth: '760px' }}>
              <p id="why-heading" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 16px' }}>
                Why it&apos;s on MuvieStars
              </p>
              <p style={{ ...SERIF, margin: 0, fontSize: 'clamp(24px,3vw,32px)', lineHeight: 1.3, color: '#F6EFE2' }}>
                {movie.why_listed}
              </p>
            </div>
          </section>
        )}

        {/* ─── SYNOPSIS ───────────────────────────────────────────────────── */}
        {(movie.synopsis || movie.description) && (
          <section style={SECTION} aria-labelledby="synopsis-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ maxWidth: '760px' }}>
              <p id="synopsis-heading" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 20px' }}>
                About the film
              </p>
              <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.7, color: '#C7BFB2' }}>
                {movie.synopsis || movie.description}
              </p>
            </div>
          </section>
        )}

        {/* ─── CANON ESSAY ────────────────────────────────────────────────── */}
        {movie.is_canon && movie.canon_essay && (
          <section style={SECTION} aria-labelledby="canon-essay-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ maxWidth: '760px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 24px' }}>
                African Film Canon
              </p>
              <blockquote style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {movie.canon_essay.split('\n\n').filter(Boolean).map((para: string, i: number) => (
                  <p key={i} style={{ margin: 0, fontSize: '18px', lineHeight: '1.75', color: '#C7BFB2' }}>{para}</p>
                ))}
              </blockquote>
              <p style={{ ...MONO, marginTop: '20px', fontSize: '12px', color: '#6A6258' }}>
                {movie.canon_essay_author || 'MuvieStars Editorial'}
              </p>
            </div>
          </section>
        )}

        {/* ─── CULTURAL CONTEXT ───────────────────────────────────────────── */}
        {movie.cultural_context && (
          <section style={{ ...SECTION, background: '#0F0D0B' }} aria-labelledby="context-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ maxWidth: '760px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 20px' }}>
                Cultural context
              </p>
              <p style={{ margin: 0, fontSize: '17px', lineHeight: '1.7', color: '#C7BFB2' }}>{movie.cultural_context}</p>
            </div>
          </section>
        )}

        {/* ─── CAST & CREW ────────────────────────────────────────────────── */}
        {cast.length > 0 && (
          <section style={SECTION} aria-labelledby="cast-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}>
                Cast &amp; crew
              </p>
              <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '8px' }}>
                {creditsInOrder.map((member: any) => {
                  const name = member.person?.full_name ?? '—'
                  const initial = name.charAt(0).toUpperCase()
                  const cardStyle: React.CSSProperties = {
                    flexShrink: 0, width: '100px',
                    display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center',
                    textDecoration: 'none',
                  }
                  const card = (
                    <>
                      {member.person?.profile_image ? (
                        <img
                          src={member.person.profile_image}
                          alt={name}
                          style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(237,228,210,0.1)' }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{
                          width: '56px', height: '56px', borderRadius: '50%',
                          background: '#15120E', border: '1px solid rgba(237,228,210,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          ...SERIF, fontSize: '22px', color: '#8C857A',
                        }}>
                          {initial}
                        </div>
                      )}
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 500, color: '#EDE4D2', lineHeight: 1.3 }}>{name}</p>
                        <p style={{ margin: '3px 0 0', ...MONO, fontSize: '10px', color: '#6A6258' }}>
                          {member.character_name || member.role?.replace('_', ' ')}
                        </p>
                      </div>
                    </>
                  )
                  return member.person?.slug ? (
                    <Link key={member.id} href={`/person/${member.person.slug}`} style={cardStyle}>{card}</Link>
                  ) : (
                    <div key={member.id} style={cardStyle}>{card}</div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* ─── REVIEWS ────────────────────────────────────────────────────── */}
        <section id="community-reviews" style={SECTION} aria-labelledby="reviews-heading">
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '36px' }}>
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                Community reviews
              </p>
              {movie.review_count > 0 && (
                <span style={{ ...MONO, fontSize: '13px', color: '#6A6258' }}>
                  {movie.review_count.toLocaleString()}
                </span>
              )}
            </div>

            <ReviewForm movieId={id} />

            {reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '28px' }}>
                {reviews.map((review) => (
                  <article
                    key={review.id}
                    style={{
                      padding: '24px', borderRadius: '16px',
                      background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)',
                    }}
                    itemScope
                    itemType="https://schema.org/Review"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', marginBottom: review.content ? '16px' : 0 }}>
                      {/* Reviewer */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(200,150,62,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            ...SERIF, fontSize: '16px', color: '#C8963E',
                          }}
                          aria-hidden="true"
                        >
                          {(review.profile?.display_name || review.profile?.username || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div
                          itemProp="author"
                          itemScope
                          itemType="https://schema.org/Person"
                        >
                          {review.profile?.username ? (
                            <Link
                              href={`/u/${review.profile.username}`}
                              style={{ textDecoration: 'none', fontSize: '14px', fontWeight: 600, color: '#EDE4D2' }}
                              itemProp="name"
                            >
                              {review.profile.display_name || review.profile.username}
                            </Link>
                          ) : (
                            <span itemProp="name" style={{ fontSize: '14px', fontWeight: 600, color: '#EDE4D2' }}>
                              {review.profile?.display_name || 'MuvieStars Member'}
                            </span>
                          )}
                          <time
                            style={{ display: 'block', ...MONO, fontSize: '11px', color: '#6A6258', marginTop: '2px' }}
                            dateTime={review.created_at}
                            itemProp="datePublished"
                          >
                            {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </time>
                        </div>
                      </div>

                      {/* Stars */}
                      <div
                        style={{ display: 'flex', gap: '3px', alignItems: 'center' }}
                        itemProp="reviewRating"
                        itemScope
                        itemType="https://schema.org/Rating"
                      >
                        <meta itemProp="ratingValue" content={String(review.rating)} />
                        <meta itemProp="bestRating" content="5" />
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            aria-hidden="true"
                            style={{ fontSize: '14px', color: i < review.rating ? '#C8963E' : 'rgba(237,228,210,0.12)' }}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {review.content && (
                      <p
                        style={{ margin: 0, fontSize: '15px', lineHeight: '1.65', color: '#C7BFB2' }}
                        itemProp="reviewBody"
                      >
                        {review.content}
                      </p>
                    )}

                    <div style={{ marginTop: '16px' }}>
                      <HelpfulButton reviewId={review.id} initialCount={review.helpful_count || 0} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '56px 24px', borderRadius: '20px', marginTop: '28px',
                border: '1px solid rgba(237,228,210,0.06)', textAlign: 'center',
              }}>
                <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>No reviews yet. Be the first.</p>
              </div>
            )}
          </div>
        </section>

        {/* ─── AWARDS ─────────────────────────────────────────────────────── */}
        {awards.length > 0 && (
          <section style={{ ...SECTION, background: '#0F0D0B' }} aria-labelledby="awards-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}>
                Festival &amp; industry recognition
              </p>
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px',
              }}>
                {awards.map((award) => (
                  <div
                    key={award.id}
                    style={{
                      display: 'flex', gap: '14px', alignItems: 'flex-start',
                      padding: '16px 18px', borderRadius: '12px',
                      background: award.won ? 'rgba(200,150,62,0.06)' : '#15120E',
                      border: award.won ? '1px solid rgba(200,150,62,0.2)' : '1px solid rgba(237,228,210,0.06)',
                    }}
                  >
                    <span style={{ fontSize: '16px', marginTop: '1px' }}>{award.won ? '🏆' : '🎖'}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: award.won ? '#C8963E' : '#D8CFC0' }}>
                        {award.name}
                        {award.won && <span style={{ ...MONO, fontSize: '11px', marginLeft: '8px', color: '#C8963E' }}>Won</span>}
                      </p>
                      <p style={{ margin: '3px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                        {award.category} · {award.year}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── WHERE TO WATCH ─────────────────────────────────────────────── */}
        {movie.streaming_links && movie.streaming_links.length > 0 && (
          <section id="where-to-watch" style={SECTION} aria-labelledby="watch-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 20px' }}>
                Where to watch
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {movie.streaming_links.map((link: { url: string; platform: string; free?: boolean }, i: number) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: '44px', padding: '0 20px', borderRadius: '12px',
                      border: '1px solid rgba(237,228,210,0.12)', background: '#15120E',
                      color: '#EDE4D2', fontSize: '14px', fontWeight: 500,
                      textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px',
                    }}
                  >
                    {link.platform}
                    {link.free && (
                      <span style={{
                        height: '20px', padding: '0 8px', borderRadius: '4px',
                        background: 'rgba(127,168,139,0.15)', border: '1px solid rgba(127,168,139,0.25)',
                        ...MONO, fontSize: '10px', fontWeight: 700, color: '#7FA88B',
                        display: 'inline-flex', alignItems: 'center',
                      }}>FREE</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── SIMILAR FILMS ──────────────────────────────────────────────── */}
        {similar.length > 0 && (
          <section style={{ ...SECTION, background: '#0F0D0B' }} aria-labelledby="similar-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 28px' }}>
                More {capitalise(movie.genre)} films
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
                {similar.map((m) => (
                  <Link
                    key={m.id}
                    href={`/movie/${m.id}`}
                    style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    <div style={{ aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', background: '#15120E', position: 'relative' }}>
                      {m.poster_url ? (
                        <img
                          src={m.poster_url}
                          alt={m.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', opacity: 0.15 }}>🎬</div>
                      )}
                      {m.average_rating > 0 && (
                        <div style={{
                          position: 'absolute', top: '8px', right: '8px',
                          height: '22px', padding: '0 7px', borderRadius: '999px',
                          background: 'rgba(11,10,9,0.75)', ...MONO, fontSize: '11px', fontWeight: 700, color: '#C8963E',
                          display: 'flex', alignItems: 'center',
                        }}>
                          {formatRating(m.average_rating)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {m.title}
                      </p>
                      <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#6A6258' }}>
                        {m.release_year}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      <Footer />
    </>
  )
}
