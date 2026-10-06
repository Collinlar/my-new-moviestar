import type { Metadata } from 'next'
import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import { notFound, permanentRedirect } from 'next/navigation'
import { BadgeCheck } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getPersonByRef, getPersonCredits, type PersonCredit } from '@/lib/queries'
import { getRecognitionForPerson } from '@/lib/awards'
import { getWinsForPerson } from '@/lib/awards-results'
import { RecognitionSection } from '@/components/RecognitionSection'
import { personProfileSchema, breadcrumbSchema } from '@/lib/schema'
import {
  ROLE_GROUPS, ROLE_LABELS, SOCIAL_KEYS, SOCIAL_LABELS,
  describeRoles, isUuid,
} from '@/lib/people'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

function knownFor(credits: PersonCredit[], limit = 6) {
  const seen = new Map<string, PersonCredit['movie']>()
  for (const c of credits) if (!seen.has(c.movie.id)) seen.set(c.movie.id, c.movie)
  return [...seen.values()]
    .sort((a, b) =>
      (b.review_count ?? 0) - (a.review_count ?? 0) ||
      (b.average_rating ?? 0) - (a.average_rating ?? 0) ||
      (b.release_year ?? 0) - (a.release_year ?? 0))
    .slice(0, limit)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const person = await getPersonByRef(slug)
  if (!person) return { title: 'Person Not Found', robots: { index: false } }

  const credits = await getPersonCredits(person.id)
  const roleText = describeRoles(credits.map(c => c.role))
  const top = knownFor(credits, 3).map(m => m.title)

  const description = truncate(
    person.bio ||
      `${person.full_name} is a${/^[aeiou]/i.test(roleText) ? 'n' : ''} ${roleText.toLowerCase()}${person.country ? ` from ${person.country}` : ''} in African cinema.` +
      (top.length ? ` Known for ${top.join(', ')}.` : '') +
      ' Full filmography, ratings and reviews on MuvieStars.',
    160,
  )
  const url = `${SITE_URL}/person/${person.slug}`
  const hasContent = !!person.bio || credits.length > 0

  return {
    title: `${person.full_name}: ${roleText}, Films and Biography`,
    description,
    alternates: { canonical: url },
    robots: hasContent ? undefined : { index: false, follow: true },
    openGraph: {
      title: `${person.full_name} | MuvieStars`,
      description,
      url,
      type: 'profile',
      images: person.profile_image ? [{ url: person.profile_image, alt: person.full_name }] : undefined,
    },
  }
}

export default async function PersonPage({ params }: PageProps) {
  const { slug } = await params
  const person = await getPersonByRef(slug)
  if (!person) notFound()
  // Old links used the UUID. Send them, and their link equity, to the slug URL.
  if (isUuid(slug)) permanentRedirect(`/person/${person.slug}`)

  const credits = await getPersonCredits(person.id)
  const [recognition, wins] = await Promise.all([
    getRecognitionForPerson(person.id).catch(() => []),
    getWinsForPerson(person.id).catch(() => []),
  ])
  const roles = credits.map(c => c.role)
  const roleText = describeRoles(roles)
  const uniqueFilms = new Map(credits.map(c => [c.movie.id, c.movie]))
  const featured = knownFor(credits)

  const socialLinks = SOCIAL_KEYS
    .map(k => ({ key: k, label: SOCIAL_LABELS[k], url: person.socials?.[k] }))
    .filter((s): s is { key: typeof s.key; label: string; url: string } => !!s.url && /^https?:\/\//i.test(s.url))
  const external = [
    ...(person.imdb_id ? [{ label: 'IMDb', url: `https://www.imdb.com/name/${person.imdb_id}/` }] : []),
    ...(person.website && /^https?:\/\//i.test(person.website) ? [{ label: 'Website', url: person.website }] : []),
  ]

  const schema = personProfileSchema({
    slug: person.slug,
    name: person.full_name,
    bio: person.bio,
    image_url: person.profile_image,
    country: person.country,
    date_of_birth: person.date_of_birth,
    date_of_death: person.date_of_death,
    job_titles: [...new Set(roles.map(r => ROLE_LABELS[r] ?? r))],
    aliases: person.aliases,
    same_as: [...socialLinks.map(s => s.url), ...external.map(e => e.url)],
    films: [...uniqueFilms.values()].map(m => ({ id: m.id, title: m.title })),
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'People', url: `${SITE_URL}/people` },
    { name: person.full_name, url: `${SITE_URL}/person/${person.slug}` },
  ])

  const groups = ROLE_GROUPS
    .map(g => ({
      ...g,
      items: credits
        .filter(c => g.roles.includes(c.role))
        .sort((a, b) => (b.movie.release_year ?? 0) - (a.movie.release_year ?? 0)),
    }))
    .filter(g => g.items.length > 0)

  const born = person.date_of_birth?.slice(0, 4)
  const died = person.date_of_death?.slice(0, 4)
  const initial = person.full_name.charAt(0).toUpperCase()

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
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '56px' }}>

            <NavLink
              href="/people"
              style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', display: 'inline-block', marginBottom: '28px', minHeight: '44px', lineHeight: '44px' }}
            >
              ← All people
            </NavLink>

            <div className="flex flex-col sm:flex-row" style={{ gap: '28px', alignItems: 'flex-start' }}>
              <div style={{ width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(200,150,62,0.08)', border: '1px solid rgba(237,228,210,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {person.profile_image ? (
                  <img src={person.profile_image} alt={person.full_name} width={120} height={120} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ ...SERIF, fontSize: '48px', color: '#C8963E' }}>{initial}</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                  {roleText}
                </p>
                <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,76px)', lineHeight: '0.95', color: '#F6EFE2', margin: 0, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  {person.full_name}
                  {person.verified && (
                    <BadgeCheck aria-label="Verified profile" style={{ width: '28px', height: '28px', color: '#C8963E', flexShrink: 0 }} />
                  )}
                </h1>

                <p style={{ ...MONO, fontSize: '13px', color: '#8C857A', margin: 0 }}>
                  {[
                    person.country,
                    born ? (died ? `${born} to ${died}` : `Born ${born}`) : null,
                    uniqueFilms.size > 0 ? `${uniqueFilms.size} film${uniqueFilms.size === 1 ? '' : 's'} on MuvieStars` : null,
                  ].filter(Boolean).join('  ·  ')}
                </p>

                {person.aliases && person.aliases.length > 0 && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#8C857A' }}>
                    Also known as {person.aliases.join(', ')}
                  </p>
                )}

                {person.bio && (
                  <p style={{ margin: '4px 0 0', fontSize: '17px', lineHeight: '1.65', color: '#C7BFB2', maxWidth: '620px' }}>
                    {person.bio}
                  </p>
                )}

                {(socialLinks.length > 0 || external.length > 0) && (
                  <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[...socialLinks, ...external].map(l => (
                      <li key={l.label}>
                        <a
                          href={l.url}
                          target="_blank"
                          rel="me noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', minHeight: '44px', padding: '0 16px', borderRadius: '999px', border: '1px solid rgba(237,228,210,0.16)', color: '#EDE4D2', fontSize: '14px', textDecoration: 'none' }}
                        >
                          {l.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── KNOWN FOR ─────────────────────────────────────────────── */}
        {featured.length > 0 && (
          <section style={{ paddingTop: '56px' }} aria-labelledby="known-heading">
            <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
              <h2 id="known-heading" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 24px', fontWeight: 400 }}>
                Known for
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '20px' }}>
                {featured.map(movie => (
                  <Link key={movie.id} href={`/movie/${movie.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', background: '#15120E', position: 'relative' }}>
                      {movie.poster_url && (
                        <img src={movie.poster_url} alt={`${movie.title} poster`} width={140} height={210} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                      {movie.average_rating > 0 && (
                        <div style={{ position: 'absolute', top: '7px', right: '7px', height: '22px', padding: '0 7px', borderRadius: '999px', background: 'rgba(11,10,9,0.8)', ...MONO, fontSize: '10px', fontWeight: 700, color: '#C8963E', display: 'flex', alignItems: 'center' }}>
                          {movie.average_rating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: '#D8CFC0', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {movie.title}
                      </p>
                      <p style={{ margin: '2px 0 0', ...MONO, fontSize: '11px', color: '#8C857A' }}>{movie.release_year}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── FILMOGRAPHY ───────────────────────────────────────────── */}
        <RecognitionSection items={recognition} wins={wins} sectionStyle={{ paddingTop: '56px' }} />

        <section style={{ paddingTop: '56px', paddingBottom: '96px' }} aria-labelledby="filmography-heading">
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ maxWidth: '900px', marginLeft: 0 }}>
            <h2 id="filmography-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1, color: '#F6EFE2', margin: '0 0 32px' }}>
              Filmography
            </h2>

            {groups.length === 0 ? (
              <p style={{ margin: 0, fontSize: '16px', color: '#8C857A', lineHeight: 1.6 }}>
                No credits on MuvieStars yet. They appear here as soon as {person.full_name} is added to a film.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                {groups.map(g => (
                  <div key={g.key}>
                    <h3 style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 8px', fontWeight: 400 }}>
                      {g.heading} ({g.items.length})
                    </h3>
                    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {g.items.map((c, i) => (
                        <li key={`${c.movie.id}-${c.role}-${i}`} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                          <NavLink
                            href={`/movie/${c.movie.id}`}
                            className="grid grid-cols-[52px_1fr] sm:grid-cols-[64px_1fr_auto]"
                            style={{ gap: '16px', alignItems: 'baseline', padding: '14px 0', textDecoration: 'none', color: '#EDE4D2', minHeight: '44px' }}
                          >
                            <span style={{ ...MONO, fontSize: '13px', color: '#8C857A' }}>{c.movie.release_year || 'n/a'}</span>
                            <span style={{ fontSize: '17px', color: '#F6EFE2', lineHeight: 1.35 }}>{c.movie.title}</span>
                            <span className="hidden sm:block" style={{ fontSize: '14px', color: '#8C857A', textAlign: 'right' }}>
                              {c.role === 'actor' && c.character_name ? `as ${c.character_name}` : ROLE_LABELS[c.role] ?? c.role}
                            </span>
                          </NavLink>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
