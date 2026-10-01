import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ChallengeJoin } from '@/components/ChallengeJoin'
import { SharePanel } from '@/components/SharePanel'
import { createClient } from '@/lib/supabase/server'
import { getChallengeBySlug, getChallengeProgress } from '@/lib/challenges'
import { challengeState, formatDay, sponsorLabel, stateLine } from '@/lib/challenges-shared'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const found = await getChallengeBySlug(slug)
  if (!found) return { title: 'Challenge not found', robots: { index: false } }
  const { challenge, films } = found
  const description = truncate(
    challenge.description || `Take ${challenge.goal} of ${films.length} African films before ${formatDay(challenge.ends_at)} and earn a laurel.`,
    160,
  )
  return {
    title: `${challenge.title}: A MuvieStars Challenge`,
    description,
    alternates: { canonical: `${SITE_URL}/challenges/${challenge.slug}` },
    openGraph: { title: `${challenge.title} | MuvieStars Challenges`, description, url: `${SITE_URL}/challenges/${challenge.slug}` },
  }
}

export default async function ChallengePage({ params }: PageProps) {
  const { slug } = await params
  const found = await getChallengeBySlug(slug)
  if (!found) notFound()
  const { challenge, deck, films, clubFilm } = found

  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  const progress = user ? await getChallengeProgress(user.id, found) : null

  const now = new Date()
  const state = challengeState(challenge, now)
  const sponsor = sponsorLabel(challenge)
  const taken = new Set(progress?.takenIds ?? [])
  const dfCount = films.filter((f) => taken.has(f.movie.id)).length
  const showProgress = !!progress?.joined || !!progress?.completion
  const complete = !!progress?.completion

  const crumbs = breadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Challenges', url: `${SITE_URL}/challenges` },
    { name: challenge.title, url: `${SITE_URL}/challenges/${challenge.slug}` },
  ])

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <Link href="/challenges" style={{ ...MONO, fontSize: '12px', color: '#8C857A', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
            ← All challenges
          </Link>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '18px', padding: '16px 0 40px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span>Challenge</span>
              <span style={{ color: state === 'open' ? '#C8963E' : '#8C857A' }}>{stateLine(challenge, now)}</span>
              {sponsor && (
                challenge.sponsor_url ? (
                  <a href={challenge.sponsor_url} target="_blank" rel="sponsored noopener noreferrer" style={{ color: '#C8963E' }}>{sponsor}</a>
                ) : (
                  <span>{sponsor}</span>
                )
              )}
            </p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>{challenge.title}</h1>
            {challenge.description && <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>{challenge.description}</p>}
            <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#EDE4D2' }}>
              {challenge.goal >= films.length ? `Take all ${films.length}` : `Take ${challenge.goal} of the ${films.length}`} films below
              {clubFilm ? <>, plus the Club film <Link href={`/movie/${clubFilm.movie.id}`} style={{ color: '#C8963E', textDecoration: 'none' }}>{clubFilm.movie.title}</Link>,</> : null}
              {' '}between {formatDay(challenge.starts_at)} and {formatDay(challenge.ends_at)}. A take is a reaction or a review you save on the film while the challenge is running.
            </p>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <ChallengeJoin
                challengeId={challenge.id}
                slug={challenge.slug}
                joined={!!progress?.joined}
                signedIn={!!user}
                open={state !== 'ended' && !complete}
                upcoming={state === 'upcoming'}
              />
              {state !== 'ended' && (
                <Link
                  href={`/swipe?deck=${deck.slug}`}
                  style={{ minHeight: '58px', padding: '0 22px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                >
                  Swipe this deck
                  <ArrowRight size={18} />
                </Link>
              )}
            </div>
          </header>

          {showProgress && (
            <section aria-label="Your progress" style={{ maxWidth: '720px', paddingBottom: '48px' }}>
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 12px' }}>Your progress</p>
              <p style={{ ...SERIF, fontSize: 'clamp(40px,6vw,64px)', lineHeight: 1, color: '#F6EFE2', margin: '0 0 14px' }}>
                {Math.min(complete ? challenge.goal : dfCount, challenge.goal)} of {challenge.goal}
              </p>
              <div role="img" aria-label={`${Math.min(dfCount, challenge.goal)} of ${challenge.goal} films taken`} style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: challenge.goal }).map((_, i) => (
                  <span key={i} style={{ flex: 1, maxWidth: '64px', height: '8px', borderRadius: '4px', background: complete || i < dfCount ? '#C8963E' : 'rgba(237,228,210,0.12)' }} />
                ))}
              </div>
              {clubFilm && (
                <p style={{ margin: '14px 0 0', fontSize: '15px', color: progress?.clubDone || complete ? '#C8963E' : '#A39B8F' }}>
                  {progress?.clubDone || complete ? `Club film taken: ${clubFilm.movie.title}` : `Still to take: the Club film, ${clubFilm.movie.title}`}
                </p>
              )}
              {state === 'upcoming' && progress?.joined && (
                <p style={{ margin: '14px 0 0', fontSize: '14px', color: '#8C857A' }}>
                  You are in. Takes you save from {formatDay(challenge.starts_at)} count.
                </p>
              )}
            </section>
          )}

          {complete && progress?.completion && (
            <section aria-labelledby="laurel-heading" style={{ maxWidth: '420px', paddingBottom: '56px' }}>
              <h2 id="laurel-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,44px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 6px' }}>
                You earned the laurel.
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#8C857A' }}>
                Completed {formatDay(progress.completion.completed_at)}. It stays on your profile. You choose what shows when you share it.
              </p>
              {progress.completion.shareToken ? (
                <SharePanel token={progress.completion.shareToken} title={challenge.title} kind="laurel" />
              ) : (
                <p style={{ margin: 0, fontSize: '14px', color: '#8C857A' }}>Your share card is being made. Refresh in a moment.</p>
              )}
            </section>
          )}

          <ol style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '900px' }}>
            {films.map((f, i) => {
              const isTaken = taken.has(f.movie.id)
              return (
                <li key={f.movie.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                  <Link
                    href={`/movie/${f.movie.id}`}
                    className="grid grid-cols-[56px_1fr_auto] sm:grid-cols-[40px_72px_1fr_auto] gap-4 items-center"
                    style={{ padding: '18px 0', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span className="hidden sm:block" style={{ ...SERIF, fontSize: '28px', color: '#6E675E' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ width: '56px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#15120E', display: 'block' }}>
                      {f.movie.poster_url && (
                        <img src={f.movie.poster_url} alt="" width={56} height={84} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      )}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      <span style={{ ...SERIF, fontSize: '28px', lineHeight: 1.1, color: '#F6EFE2' }}>{f.movie.title}</span>
                      <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                        {[f.movie.release_year, f.movie.country].filter(Boolean).join(' · ')}
                      </span>
                      {f.note && <span style={{ fontSize: '15px', lineHeight: 1.5, color: '#A39B8F' }}>{f.note}</span>}
                    </span>
                    {showProgress && (
                      <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', color: isTaken ? '#C8963E' : '#6E675E' }}>
                        {isTaken ? 'Taken' : 'To take'}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ol>
        </div>
      </main>

      <Footer />
    </>
  )
}
