import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { FilmShelf } from '@/components/FilmShelf'
import { SignedInHero } from '@/components/SignedInHero'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import { createClient } from '@/lib/supabase/server'
import { getCanonMovies, getCurrentClubCycle, getMovieById, getOldButGoldMovies } from '@/lib/queries'
import {
  getWorthYourTime, getFeaturedPeople, getBecauseYouLoved, getUnfinishedTitles, getRecentTakes,
} from '@/lib/home'
import { MOOD_MAP } from '@/lib/mood'
import { getPublishedDecks, sponsorLabel } from '@/lib/decks'
import { getPublishedChallenges } from '@/lib/challenges'
import { getCurrentSelection, periodLabel } from '@/lib/selections'
import { sponsorLabel as challengeSponsor, stateLine, goalPhrase } from '@/lib/challenges-shared'
import { websiteSchema, organizationSchema, faqSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: { absolute: 'MuvieStars: Standout African Cinema, Rated by the People Who Watch It' },
  description:
    'Find African films worth your time, say what you thought, and see what other viewers made of them. Every listed film has been checked by a person. Nollywood, Ghallywood, Francophone, East and South African cinema.',
  alternates: { canonical: 'https://muviestars.com' },
}

export const dynamic = 'force-dynamic'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

// A section only appears once there is enough real content to make it worth a visit.
const MIN_SHELF = 4
const MIN_SMALL_SHELF = 3

const REACTION_LABEL: Record<string, string> = {
  loved: 'Loved it', liked: 'Liked it', okay: 'It was okay', not_for_me: 'Not for me',
}

const HOME_FAQ = [
  {
    question: 'What is MuvieStars?',
    answer:
      'MuvieStars is a home for standout African cinema. A person at MuvieStars checks each film before it is listed, and viewers react to what they watch with a rating, a few words and the things that stood out. It covers Nollywood, Ghallywood, Francophone African, East African and South African films, and the diaspora.',
  },
  {
    question: 'How do films get on MuvieStars?',
    answer:
      'A person at MuvieStars checks that a film is a real production, has an African origin, a synopsis, a poster, and evidence it has been released or shown. Listed films appear in Swipe and in recommendations. A listing cannot be bought. The full explanation is at muviestars.com/how-listing-works.',
  },
  {
    question: 'What is the African Film Canon?',
    answer:
      'The African Film Canon is a small collection of landmark films that defined African storytelling, chosen for their cultural significance, critical acclaim or historical importance, each with an essay on why it belongs.',
  },
  {
    question: 'Which African film industries are covered?',
    answer:
      'MuvieStars covers Nollywood (Nigeria), Ghallywood (Ghana), South African cinema, Kenyan, Ugandan and other East African films, Francophone African cinema, North African cinema, and diaspora films from Europe and North America.',
  },
]

function daysLeftThisWeek(): number {
  const day = new Date().getDay()
  const daysSinceMonday = (day - 1 + 7) % 7
  return 7 - daysSinceMonday
}

export default async function HomePage() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  const isSignedIn     = !!user
  const showOnboarding = isSignedIn && !user?.user_metadata?.onboarding_completed
  const fullName       = user?.user_metadata?.full_name as string | undefined
  const firstName      = fullName?.split(' ')[0] || (user?.email as string | undefined)?.split('@')[0] || null

  const club = (async () => {
    const cycle = await getCurrentClubCycle()
    return cycle ? getMovieById(cycle.movie_id) : null
  })()

  const [clubPick, obg, worth, canon, people, loved, unfinished, takes, decks, challenges, selection] = await Promise.all([
    club,
    getOldButGoldMovies(6),
    isSignedIn ? Promise.resolve([]) : getWorthYourTime(6),
    isSignedIn ? Promise.resolve([]) : getCanonMovies(5),
    isSignedIn ? Promise.resolve([]) : getFeaturedPeople(8),
    isSignedIn ? getBecauseYouLoved(user.id) : Promise.resolve(null),
    isSignedIn ? getUnfinishedTitles(user.id) : Promise.resolve([]),
    isSignedIn ? getRecentTakes(user.id) : Promise.resolve([]),
    getPublishedDecks({ featuredOnly: true, limit: 3 }).catch(() => []),
    getPublishedChallenges({ featuredOnly: true, openOnly: true, limit: 2 }).catch(() => []),
    getCurrentSelection().catch(() => null),
  ])

  const daysLeft = daysLeftThisWeek()
  const schemaGraph = [websiteSchema(), organizationSchema(), faqSchema(HOME_FAQ)]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': schemaGraph }) }}
      />

      {showOnboarding && <OnboardingFlow show={true} userName={firstName} />}

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        {isSignedIn ? (
          <SignedInHero userName={firstName} />
        ) : (
        <section
          className="relative pt-[76px] overflow-hidden"
          style={{ minHeight: '760px', background: '#0B0A09' }}
          aria-labelledby="hero-heading"
        >
          <div className="ms-grain" aria-hidden="true" />

          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20 w-full">
            <div className="grid items-center gap-6 lg:grid-cols-12" style={{ minHeight: '684px' }}>
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
                className="col-span-12 lg:col-span-7 flex flex-col gap-8"
              >
                <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E' }}>
                  African cinema worth your time
                </p>

                <h1
                  id="hero-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(52px, 8vw, 116px)', lineHeight: '0.92', letterSpacing: '-0.025em', color: '#F6EFE2', margin: 0 }}
                >
                  African films worth your{' '}
                  <em style={{ color: '#C8963E', fontStyle: 'italic' }}>time.</em>
                </h1>

                <p style={{ margin: 0, maxWidth: '540px', fontSize: '20px', lineHeight: '1.5', color: '#C7BFB2' }}>
                  Swipe through films a person at MuvieStars has checked. Say what you thought. See what everyone else made of it.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <Link
                    href="/swipe"
                    style={{ height: '58px', padding: '0 28px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
                  >
                    Start swiping
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/discover"
                    style={{ height: '58px', padding: '0 28px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2', fontSize: '17px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                  >
                    Pick a way in
                  </Link>
                </div>
              </div>

              {/* Right: swipe card, hidden on mobile */}
              <div
                className="hidden lg:flex"
                style={{ gridColumn: 'span 5', flexDirection: 'column', alignItems: 'center', gap: '22px' }}
              >
                <div style={{ position: 'relative', width: '380px', height: '520px' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', background: '#3A1520', transform: 'translateX(46px) rotate(9deg)', opacity: 0.45 }} />
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', background: '#0F2230', transform: 'translateX(22px) rotate(4.5deg)', opacity: 0.7, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '270px', height: '2px', background: '#E8C27A' }} />
                  </div>
                  <div className="ph-card" style={{ position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,.6)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#12242B' }} />
                    <div style={{ position: 'absolute', left: '50%', top: '14%', width: '270px', height: '360px', marginLeft: '-135px', borderRadius: '135px 135px 0 0', background: '#C8963E' }} />
                    <div style={{ position: 'absolute', left: '50%', top: '25%', width: '118px', height: '118px', marginLeft: '-59px', borderRadius: '50%', background: '#12242B' }} />
                    <div className="ms-grain" />
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', background: 'linear-gradient(to top,rgba(8,7,6,.96) 0%,rgba(8,7,6,.7) 40%,rgba(8,7,6,0))' }} />
                    <div style={{ position: 'absolute', top: '16px', left: '16px', height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(11,10,9,0.6)', display: 'flex', alignItems: 'center', gap: '8px', ...MONO, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C8963E', display: 'inline-block' }} />
                      Club pick
                    </div>
                    <div style={{ position: 'absolute', left: '24px', right: '24px', bottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ ...SERIF, fontSize: '48px', lineHeight: '0.98', color: '#F6EFE2' }}>
                        {clubPick?.title || 'Silence'}
                      </div>
                      <div style={{ fontSize: '15px', color: '#D8CFC0' }}>
                        {clubPick
                          ? `${clubPick.release_year}${clubPick.country ? ` · ${clubPick.country}` : ''}${clubPick.genre ? ` · ${clubPick.genre}` : ''}`
                          : '2024 · Ghana · Drama'}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', width: '380px' }}>
                  <Link
                    href="/swipe"
                    style={{ flex: 1, height: '54px', borderRadius: '16px', border: '1px solid rgba(237,228,210,.16)', background: '#161411', color: '#EDE4D2', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                  >
                    <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
                    Haven&apos;t seen it
                  </Link>
                  <Link
                    href="/swipe"
                    style={{ flex: 1, height: '54px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', textDecoration: 'none' }}
                  >
                    Seen it
                    <ArrowRight size={18} />
                  </Link>
                </div>

                <p style={{ fontSize: '13px', color: '#8C857A', margin: 0 }}>
                  Try it. No account needed.
                </p>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── MUVIESTARS CLUB ──────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '96px' }}
          aria-labelledby="club-heading"
        >
          <div
            className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[480px]"
            style={{ borderRadius: '32px', background: '#12242B', position: 'relative', overflow: 'hidden' }}
          >
            {!clubPick?.poster_url && (
              <>
                <div style={{ position: 'absolute', right: '140px', top: '60px', width: '340px', height: '460px', borderRadius: '170px 170px 0 0', background: '#C8963E' }} />
                <div style={{ position: 'absolute', right: '250px', top: '120px', width: '120px', height: '120px', borderRadius: '50%', background: '#12242B' }} />
              </>
            )}
            <div className="ms-grain" />

            <div
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}
              className="col-span-12 lg:col-span-6 p-8 lg:p-14"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <span style={{ height: '28px', padding: '0 12px', borderRadius: '999px', background: '#C8963E', color: '#0B0A09', ...MONO, fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
                  MuvieStars Club · This week
                </span>
                <h2
                  id="club-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(48px,7vw,96px)', lineHeight: '0.92', color: '#F6EFE2', margin: 0 }}
                >
                  {clubPick?.title || 'African Cinema'}
                </h2>
                <p style={{ margin: 0, maxWidth: '460px', fontSize: '18px', lineHeight: '1.5', color: '#C9D4D7' }}>
                  One film, watched together, every week. Watch it when you can, then come back and say what you thought.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/club"
                  style={{ height: '54px', padding: '0 24px', borderRadius: '16px', background: '#EDE4D2', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  Join this week&apos;s Club
                </Link>
                <span style={{ fontSize: '14px', color: '#B9C7CC' }}>
                  {daysLeft === 1 ? 'Last day today' : `${daysLeft} days left`}
                </span>
              </div>
            </div>

            {clubPick?.poster_url && (
              <div className="hidden lg:block lg:col-span-6" style={{ position: 'relative', minHeight: '480px' }}>
                <img
                  src={clubPick.poster_url}
                  alt={`${clubPick.title} poster`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', opacity: 0.75 }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #12242B 0%, transparent 40%)' }} />
              </div>
            )}
          </div>
        </section>

        {/* ── THE CURRENT SELECTION ────────────────────────────────────── */}
        {selection && selection.films.length >= MIN_SMALL_SHELF && (
          <FilmShelf
            id="selection"
            eyebrow={[selection.selection.label, periodLabel(selection.selection.period)].filter(Boolean).join(' · ')}
            title={selection.selection.title}
            note={selection.selection.intro ?? undefined}
            href={`/selections/${selection.selection.slug}`}
            hrefLabel="See why each one is here"
            films={selection.films.slice(0, 6).map((f) => ({ ...f.movie, why_listed: f.note ?? f.movie.why_listed }))}
          />
        )}

        {/* ── SIGNED-OUT: WORTH YOUR TIME ──────────────────────────────── */}
        {!isSignedIn && worth.length >= MIN_SHELF && (
          <FilmShelf
            id="worth"
            eyebrow="Worth your time"
            title="Start with these."
            note="Listed films, checked by a person. The ones with a reason come first."
            href="/discover"
            hrefLabel="More ways in"
            films={worth}
          />
        )}

        {/* ── SIGNED-IN: BECAUSE YOU LOVED ─────────────────────────────── */}
        {isSignedIn && loved && loved.films.length >= MIN_SMALL_SHELF && (
          <FilmShelf
            id="loved"
            eyebrow="Because you loved"
            title={loved.source.title}
            href={`/movie/${loved.source.id}`}
            hrefLabel="See the film"
            films={loved.films}
          />
        )}

        {/* ── OLD BUT GOLD ─────────────────────────────────────────────── */}
        {obg.length >= MIN_SMALL_SHELF && (
          <FilmShelf
            id="obg"
            eyebrow="Old but Gold"
            title="Worth going back for."
            note="Films from before 2010."
            href="/swipe?mood=obg"
            hrefLabel="Swipe through them"
            films={obg}
          />
        )}

        {/* ── SIGNED-IN: UNFINISHED TITLES ─────────────────────────────── */}
        {isSignedIn && unfinished.length > 0 && (
          <FilmShelf
            id="unfinished"
            eyebrow="Pick up where you left off"
            title="You said you had seen these."
            note="Tell us what you thought. It takes ten seconds."
            films={unfinished}
          />
        )}

        {/* ── SIGNED-IN: RECENT TAKES ──────────────────────────────────── */}
        {isSignedIn && takes.length > 0 && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '96px' }}
            aria-labelledby="takes-heading"
          >
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 10px' }}>
              Your recent takes
            </p>
            <h2 id="takes-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: '0 0 28px' }}>
              What you said.
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '760px' }}>
              {takes.map((t) => (
                <li key={t.id} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: '16px', padding: '18px 0', borderTop: '1px solid rgba(237,228,210,.1)' }}>
                  <Link href={`/movie/${t.movie.id}`} style={{ display: 'block', width: '56px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#15120E' }}>
                    {t.movie.poster_url && (
                      <img src={t.movie.poster_url} alt="" width={56} height={84} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}
                  </Link>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <Link href={`/movie/${t.movie.id}`} style={{ ...SERIF, fontSize: '26px', lineHeight: 1.1, color: '#F6EFE2', textDecoration: 'none' }}>
                      {t.movie.title}
                    </Link>
                    <p style={{ margin: 0, ...MONO, fontSize: '12px', color: '#8C857A' }}>
                      {REACTION_LABEL[t.reaction] ?? t.reaction}
                      {t.rating ? `  ·  ${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}` : ''}
                    </p>
                    {t.one_liner && (
                      <p style={{ margin: '4px 0 0', fontSize: '16px', lineHeight: 1.5, color: '#C7BFB2' }}>&ldquo;{t.one_liner}&rdquo;</p>
                    )}
                    {t.token && (
                      <Link href={`/take/${t.token}`} style={{ marginTop: '6px', fontSize: '14px', color: '#C8963E', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                        Open your share card
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── SIGNED-OUT: CANON ────────────────────────────────────────── */}
        {!isSignedIn && canon.length > 0 && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '96px' }}
            aria-labelledby="canon-heading"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                    African Film Canon
                  </p>
                  <h2 id="canon-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                    The essentials.
                  </h2>
                </div>
                <Link href="/canon" style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                  View the Canon →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '720px' }}>
                {canon.map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/movie/${m.id}`}
                    className="grid grid-cols-[44px_1fr] lg:grid-cols-[44px_1fr_auto] items-center gap-[14px] py-4 hover:bg-cinema-surface/30 rounded transition-colors"
                    style={{ borderTop: '1px solid rgba(237,228,210,.1)', textDecoration: 'none', color: '#EDE4D2' }}
                  >
                    <span style={{ ...SERIF, fontSize: '36px', color: '#6E675E' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ ...SERIF, fontSize: '30px', lineHeight: '1.05', color: '#F6EFE2' }}>{m.title}</span>
                      <span style={{ fontSize: '14px', color: '#A39B8F' }}>
                        {m.release_year}{m.country ? ` · ${m.country}` : ''}
                      </span>
                    </span>
                    <span className="hidden lg:block" style={{ fontSize: '14px', color: '#A39B8F', textAlign: 'right' }}>{m.director ?? ''}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── FEATURED DECKS ───────────────────────────────────────────── */}
        {decks.length > 0 && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '96px' }}
            aria-labelledby="decks-heading"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Decks</p>
                <h2 id="decks-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                  Short sets, picked by a person.
                </h2>
              </div>
              <Link href="/decks" style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                All decks →
              </Link>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {decks.map((d) => {
                const sponsor = sponsorLabel(d)
                return (
                  <li key={d.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                    <Link
                      href={`/decks/${d.slug}`}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-8 items-baseline"
                      style={{ padding: '22px 0', textDecoration: 'none', minHeight: '44px' }}
                    >
                      <span style={{ ...SERIF, fontSize: 'clamp(26px,3vw,36px)', lineHeight: 1.1, color: '#F6EFE2' }}>{d.title}</span>
                      <span style={{ ...MONO, fontSize: '12px', color: sponsor ? '#C8963E' : '#8C857A' }}>
                        {sponsor ?? (d.film_count !== null ? `${d.film_count} films` : 'Picked by rule')}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {/* ── FEATURED CHALLENGES ──────────────────────────────────────── */}
        {challenges.length > 0 && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '96px' }}
            aria-labelledby="challenges-heading"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Challenges</p>
                <h2 id="challenges-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                  Finish a set. Earn the laurel.
                </h2>
              </div>
              <Link href="/challenges" style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                All challenges →
              </Link>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {challenges.map((c) => (
                <li key={c.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                  <Link
                    href={`/challenges/${c.slug}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 sm:gap-8 items-baseline"
                    style={{ padding: '22px 0', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span style={{ ...SERIF, fontSize: 'clamp(26px,3vw,36px)', lineHeight: 1.1, color: '#F6EFE2' }}>{c.title}</span>
                    <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                      {[goalPhrase(c.goal, c.film_count), stateLine(c), challengeSponsor(c)].filter(Boolean).join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── SIGNED-OUT: PEOPLE TO WATCH ──────────────────────────────── */}
        {!isSignedIn && people.length >= MIN_SMALL_SHELF && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '96px' }}
            aria-labelledby="people-heading"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>People to watch</p>
                <h2 id="people-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                  Behind and in front of the camera.
                </h2>
              </div>
              <Link href="/people" style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
                All people →
              </Link>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              {people.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/person/${p.slug}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '64px', padding: '8px 18px 8px 8px', borderRadius: '999px', border: '1px solid rgba(237,228,210,0.12)', background: '#0F0D0B', textDecoration: 'none' }}
                  >
                    <span style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(200,150,62,0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {p.profile_image ? (
                        <img src={p.profile_image} alt="" width={48} height={48} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ ...SERIF, fontSize: '22px', color: '#C8963E' }}>{p.full_name.charAt(0)}</span>
                      )}
                    </span>
                    <span style={{ fontSize: '16px', color: '#F6EFE2' }}>{p.full_name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── SIGNED-OUT: BY MOOD AND SEARCH ───────────────────────────── */}
        {!isSignedIn && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '96px' }}
            aria-labelledby="mood-heading"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Not sure what to watch?</p>
                  <h2 id="mood-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                    Start from how you feel.
                  </h2>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {Object.values(MOOD_MAP).map((m) => (
                    <li key={m.slug}>
                      <Link
                        href={`/swipe?mood=${m.slug}`}
                        style={{ height: '44px', padding: '0 20px', borderRadius: '999px', background: m.chipBg, color: m.chipText, fontSize: '15px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', border: '1px solid rgba(237,228,210,0.08)' }}
                      >
                        {m.label}
                      </Link>
                    </li>
                  ))}
                </ul>
                <p style={{ margin: 0, fontSize: '15px', color: '#8C857A' }}>
                  Or go by <Link href="/browse" style={{ color: '#C8963E', textDecoration: 'none' }}>genre</Link>,{' '}
                  <Link href="/discover" style={{ color: '#C8963E', textDecoration: 'none' }}>country and industry</Link>.
                </p>
              </div>

              <div className="lg:col-span-5" style={{ display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'flex-end' }}>
                <form action="/search" method="get" role="search" style={{ display: 'flex', gap: '10px' }}>
                  <label htmlFor="home-q" className="sr-only">Search films, people and places</label>
                  <input
                    id="home-q"
                    name="q"
                    type="search"
                    autoComplete="off"
                    placeholder="A film, an actor, a city"
                    style={{ flex: 1, minWidth: 0, height: '52px', padding: '0 18px', borderRadius: '14px', background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.16)', color: '#F6EFE2', fontSize: '16px' }}
                  />
                  <button
                    type="submit"
                    style={{ height: '52px', padding: '0 22px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                  >
                    Find it
                  </button>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ (signed-out only) ────────────────────────────────────── */}
        {!isSignedIn && (
          <section
            className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
            style={{ paddingTop: '120px' }}
            aria-labelledby="faq-heading"
          >
            <div style={{ maxWidth: '760px' }}>
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 12px' }}>
                Common questions
              </p>
              <h2 id="faq-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: '0 0 48px' }}>
                About MuvieStars
              </h2>
              <dl style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {HOME_FAQ.map((item) => (
                  <div key={item.question} style={{ borderTop: '1px solid rgba(237,228,210,.1)', padding: '24px 0' }}>
                    <dt style={{ fontSize: '18px', fontWeight: 500, color: '#F6EFE2', marginBottom: '10px' }}>{item.question}</dt>
                    <dd style={{ fontSize: '15px', color: '#C7BFB2', lineHeight: '1.65', margin: 0 }}>{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', paddingBottom: '0' }}
          aria-labelledby="cta-heading"
        >
          <div
            className="p-8 sm:p-12 lg:p-[72px]"
            style={{ borderRadius: '36px', background: '#C8963E', color: '#0B0A09', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '40px', flexWrap: 'wrap' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '760px' }}>
              <h2 id="cta-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,6vw,88px)', lineHeight: '0.92', letterSpacing: '-0.02em', margin: 0 }}>
                {isSignedIn ? 'There is always another one.' : 'Find something worth watching.'}
              </h2>
              <p style={{ margin: 0, fontSize: '19px', lineHeight: '1.5', color: 'rgba(43,33,18,.85)' }}>
                {isSignedIn
                  ? 'Every swipe teaches us what you like, so the next film is a better pick.'
                  : 'Tell us what you thought. Your rating helps the next viewer decide. Free, always.'}
              </p>
            </div>
            <Link
              href={isSignedIn ? '/swipe' : '/auth'}
              style={{ height: '60px', padding: '0 30px', borderRadius: '18px', background: '#0B0A09', color: '#F6EFE2', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
            >
              {isSignedIn ? 'Keep swiping' : 'Create your free account'}
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
