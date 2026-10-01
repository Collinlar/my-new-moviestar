import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createStaticClient } from '@/lib/supabase/static'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ShareVisitBeacon } from '@/components/ShareVisitBeacon'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const REACTION_LABELS: Record<string, string> = {
  loved:      'Loved it',
  liked:      'Liked it',
  okay:       'It was okay',
  not_for_me: 'Not for me',
}

interface PageProps {
  params: Promise<{ token: string }>
}

async function getShareData(token: string) {
  const supabase = createStaticClient() as any

  const { data: card } = await supabase
    .from('share_cards')
    .select('reaction_id, movie_id, user_id')
    .eq('share_token', token)
    .eq('object_type', 'take')
    .maybeSingle()

  if (!card) return null

  const [{ data: rxn }, { data: movie }, { data: tagJoin }] = await Promise.all([
    supabase
      .from('movie_reactions')
      .select('reaction, rating, one_liner')
      .eq('id', card.reaction_id)
      .maybeSingle(),
    supabase
      .from('movies')
      .select('id, title, release_year, country, director, poster_url, description')
      .eq('id', card.movie_id)
      .maybeSingle(),
    supabase
      .from('movie_reaction_tags')
      .select('reaction_tags(slug, label)')
      .eq('reaction_id', card.reaction_id),
  ])

  const tags = (tagJoin ?? []).map((t: any) => t.reaction_tags).filter(Boolean) as { slug: string; label: string }[]

  return { card, rxn, movie, tags }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await getShareData(token)
  if (!data?.movie) {
    return { title: 'MuvieStars' }
  }

  const { movie, rxn } = data
  const reactionLabel = rxn?.reaction ? (REACTION_LABELS[rxn.reaction] ?? '') : ''
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muviestars.com'
  const ogImage = `${baseUrl}/api/og/take?token=${token}`

  return {
    title: `${movie.title} — My Take on MuvieStars`,
    description: rxn?.one_liner ?? `${reactionLabel ? `${reactionLabel}: ` : ''}${movie.title}${movie.release_year ? ` (${movie.release_year})` : ''}`,
    openGraph: {
      title: `${movie.title} — My Take`,
      description: rxn?.one_liner ?? reactionLabel,
      images: [{ url: ogImage, width: 1080, height: 1080, alt: `${movie.title} review card` }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${movie.title} — My Take`,
      description: rxn?.one_liner ?? reactionLabel,
      images: [ogImage],
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function TakePage({ params }: PageProps) {
  const { token } = await params
  const data = await getShareData(token)
  if (!data?.movie || !data?.rxn) notFound()

  const { movie, rxn, tags } = data
  const reactionLabel = rxn.reaction ? (REACTION_LABELS[rxn.reaction] ?? rxn.reaction) : null
  const rating = rxn.rating ?? null

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* Hero — movie backdrop + take card */}
        <section style={{ position: 'relative', paddingTop: '64px', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>

          {/* Poster background */}
          {movie.poster_url && (
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
              <img
                src={movie.poster_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.12 }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(11,10,9,0.6) 0%, #0B0A09 70%)' }} />
            </div>
          )}

          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20 w-full" style={{ position: 'relative', paddingTop: '60px', paddingBottom: '80px' }}>
            <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-6">

              {/* Movie poster column */}
              {movie.poster_url && (
                <div className="hidden lg:flex lg:col-span-4" style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                  <div style={{ borderRadius: '16px', overflow: 'hidden', width: '280px', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
                    <img
                      src={movie.poster_url}
                      alt={`${movie.title} poster`}
                      style={{ width: '280px', display: 'block', aspectRatio: '2/3', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              )}

              {/* Take content */}
              <div className={`${movie.poster_url ? 'lg:col-span-8' : 'lg:col-span-10 lg:col-start-2'}`} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                {/* From label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E' }}>
                    A take from MuvieStars
                  </span>
                </div>

                {/* Movie title */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,6vw,80px)', lineHeight: '0.95', color: '#F6EFE2', margin: 0 }}>
                    {movie.title}
                  </h1>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {[
                      movie.release_year?.toString(),
                      movie.country,
                      movie.director ? `Dir. ${movie.director}` : null,
                    ].filter(Boolean).map((item, i) => (
                      <span key={i} style={{
                        height: '26px', padding: '0 12px', borderRadius: '999px',
                        background: 'rgba(237,228,210,0.08)', border: '1px solid rgba(237,228,210,0.12)',
                        fontSize: '13px', color: '#C9D4D7', display: 'inline-flex', alignItems: 'center',
                      }}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* The take card */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(237,228,210,0.1)',
                  borderRadius: '20px',
                  padding: '28px 32px',
                  display: 'flex', flexDirection: 'column', gap: '20px',
                }}>
                  {/* Reaction + stars row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    {reactionLabel && (
                      <span style={{
                        height: '32px', padding: '0 16px', borderRadius: '999px',
                        background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.4)',
                        fontSize: '14px', color: '#C8963E', fontWeight: 500,
                        display: 'inline-flex', alignItems: 'center',
                      }}>
                        {reactionLabel}
                      </span>
                    )}
                    {rating && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[1,2,3,4,5].map(n => (
                          <span key={n} style={{ fontSize: '22px', color: n <= rating ? '#C8963E' : 'rgba(237,228,210,0.15)' }}>
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* One-liner */}
                  {rxn.one_liner && (
                    <p style={{ ...SERIF, margin: 0, fontSize: 'clamp(22px,3vw,28px)', lineHeight: '1.4', color: '#F6EFE2', fontWeight: 400 }}>
                      &ldquo;{rxn.one_liner}&rdquo;
                    </p>
                  )}

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {tags.map(t => (
                        <span key={t.slug} style={{
                          height: '30px', padding: '0 14px', borderRadius: '999px',
                          background: 'rgba(237,228,210,0.06)', border: '1px solid rgba(237,228,210,0.12)',
                          fontSize: '13px', color: '#A39B8F', display: 'inline-flex', alignItems: 'center',
                        }}>
                          {t.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link
                    href="/swipe"
                    style={{
                      height: '52px', padding: '0 28px', borderRadius: '16px',
                      background: '#EDE4D2', color: '#0B0A09',
                      fontSize: '15px', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    Rate this film yourself
                  </Link>
                  <Link
                    href={`/movie/${movie.id}`}
                    style={{
                      height: '52px', padding: '0 28px', borderRadius: '16px',
                      border: '1px solid rgba(237,228,210,0.18)',
                      color: '#EDE4D2', fontSize: '15px',
                      display: 'inline-flex', alignItems: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    See full profile
                  </Link>
                </div>

                {/* Footer note */}
                <p style={{ margin: 0, fontSize: '13px', color: '#6E675E', lineHeight: 1.6 }}>
                  Shared via{' '}
                  <Link href="/" style={{ color: '#C8963E', textDecoration: 'none' }}>MuvieStars</Link>
                  {' '}— the home of African cinema on the internet.
                </p>

              </div>
            </div>
          </div>
        </section>

      </main>

      <ShareVisitBeacon token={token} />
      <Footer />
    </>
  )
}
