import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SignedInHero } from '@/components/SignedInHero'
import { OnboardingFlow } from '@/components/OnboardingFlow'
import { createClient } from '@/lib/supabase/server'
import {
  getCanonMovies, getDbStats, getCurrentClubCycle, getMovieById,
} from '@/lib/queries'
import { formatCount } from '@/lib/utils'
import { websiteSchema, organizationSchema, faqSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'The Living Database of African Cinema | MuvieStars',
  description:
    'Find what to watch, react to films you have seen, and explore the living database of African cinema. From Nollywood to Francophone Africa.',
  alternates: { canonical: 'https://muviestars.com' },
}

export const dynamic = 'force-dynamic'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const STATIC_CANON = [
  { title: 'Touki Bouki',                   meta: '1973 · Senegal',       dir: 'Djibril Diop Mambéty' },
  { title: 'Yeelen',                         meta: '1987 · Mali',          dir: 'Souleymane Cissé'      },
  { title: 'Love Brewed in the African Pot', meta: '1980 · Ghana',         dir: 'Kwaw Ansah'            },
  { title: 'Sarraounia',                     meta: '1986 · Burkina Faso',  dir: 'Med Hondo'             },
  { title: 'Living in Bondage',              meta: '1992 · Nigeria',       dir: 'Chris Obi Rapu'        },
]

function daysLeftThisWeek(): number {
  const day = new Date().getDay()
  const daysSinceMonday = (day - 1 + 7) % 7
  return 7 - daysSinceMonday
}

export default async function HomePage() {
  const supabase = await createClient() as any

  const [{ data: { user } }, canon, stats, cycle] = await Promise.all([
    supabase.auth.getUser(),
    getCanonMovies(5),
    getDbStats(),
    getCurrentClubCycle(),
  ])

  const isSignedIn      = !!user
  const showOnboarding  = isSignedIn && !user?.user_metadata?.onboarding_completed
  const fullName        = user?.user_metadata?.full_name as string | undefined
  const firstName       = fullName?.split(' ')[0] || (user?.email as string | undefined)?.split('@')[0] || null

  const daysLeft = daysLeftThisWeek()
  const clubPick = cycle ? await getMovieById(cycle.movie_id) : null

  const canonRows = canon.length >= 5
    ? canon.slice(0, 5).map((m, i) => ({
        n:    String(i + 1).padStart(2, '0'),
        title: m.title,
        meta:  `${m.release_year}${m.country ? ` · ${m.country}` : ''}`,
        dir:   m.director || STATIC_CANON[i]?.dir || '',
        href:  `/movie/${m.id}`,
      }))
    : STATIC_CANON.map((s, i) => ({ n: String(i + 1).padStart(2, '0'), ...s, href: '/browse' }))

  const HOME_FAQ = [
    {
      question: 'What is MuvieStars?',
      answer:
        'MuvieStars is the most comprehensive database of African cinema on the internet. It covers films from Nollywood (Nigeria), Ghallywood (Ghana), Francophone African cinema, East African films, South African cinema, and the African diaspora worldwide. Users can discover movies, react to films, and explore filmmakers.',
    },
    {
      question: 'How many African movies are on MuvieStars?',
      answer:
        `MuvieStars currently documents over ${stats.movieCount.toLocaleString()} verified African films, with new titles added regularly. The database includes films in Yoruba, Igbo, Hausa, Twi, Pidgin, Swahili, French, Arabic, Amharic, and English, among other African languages.`,
    },
    {
      question: 'What is the African Film Canon?',
      answer:
        'The African Film Canon is a curated collection of landmark films that defined African storytelling. These are films selected for their cultural significance, critical acclaim, or historical importance to African cinema heritage.',
    },
    {
      question: 'Which African film industries are covered?',
      answer:
        "MuvieStars covers all major African film industries including Nollywood (Nigeria), Ghallywood (Ghana), South African cinema, Kenyan films, Ethiopian cinema, Senegalese films, Cameroonian films, Ivorian productions, and diaspora African films from Europe and North America.",
    },
  ]

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
            <div
              className="grid items-center gap-6 lg:grid-cols-12"
              style={{ minHeight: '684px' }}
            >
              {/* Left: 7 cols */}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}
                className="col-span-12 lg:col-span-7 flex flex-col gap-8"
              >
                <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E' }}>
                  The living database of African cinema
                </p>

                <h1
                  id="hero-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(52px, 8vw, 116px)', lineHeight: '0.92', letterSpacing: '-0.025em', color: '#F6EFE2', margin: 0 }}
                >
                  African cinema,{' '}
                  <em style={{ color: '#C8963E', fontStyle: 'italic' }}>discovered</em>{' '}
                  differently.
                </h1>

                <p style={{ margin: 0, maxWidth: '540px', fontSize: '20px', lineHeight: '1.5', color: '#C7BFB2' }}>
                  Find what to watch, react to films you have seen, and explore the living database of African cinema.
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
                    href="/browse"
                    style={{ height: '58px', padding: '0 28px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2', fontSize: '17px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                  >
                    Explore the database
                  </Link>
                </div>
              </div>

              {/* Right: swipe card — hidden on mobile */}
              <div
                className="hidden lg:flex"
                style={{ gridColumn: 'span 5', flexDirection: 'column', alignItems: 'center', gap: '22px' }}
              >
                {/* Stacked cards */}
                <div style={{ position: 'relative', width: '380px', height: '520px' }}>
                  {/* Ghost back */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', background: '#3A1520', transform: 'translateX(46px) rotate(9deg)', opacity: 0.45 }} />
                  {/* Ghost mid */}
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '26px', background: '#0F2230', transform: 'translateX(22px) rotate(4.5deg)', opacity: 0.7, overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '270px', height: '2px', background: '#E8C27A' }} />
                  </div>
                  {/* Main card */}
                  <div className="ph-card" style={{ position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,.6)' }}>
                    <div style={{ position: 'absolute', inset: 0, background: '#12242B' }} />
                    {/* Abstract arch art */}
                    <div style={{ position: 'absolute', left: '50%', top: '14%', width: '270px', height: '360px', marginLeft: '-135px', borderRadius: '135px 135px 0 0', background: '#C8963E' }} />
                    <div style={{ position: 'absolute', left: '50%', top: '25%', width: '118px', height: '118px', marginLeft: '-59px', borderRadius: '50%', background: '#12242B' }} />
                    <div className="ms-grain" />
                    {/* Gradient */}
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', background: 'linear-gradient(to top,rgba(8,7,6,.96) 0%,rgba(8,7,6,.7) 40%,rgba(8,7,6,0))' }} />
                    {/* Club pick badge */}
                    <div style={{ position: 'absolute', top: '16px', left: '16px', height: '30px', padding: '0 12px', borderRadius: '999px', background: 'rgba(11,10,9,0.6)', display: 'flex', alignItems: 'center', gap: '8px', ...MONO, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C8963E', display: 'inline-block' }} />
                      Club pick
                    </div>
                    {/* Film info */}
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

                {/* Swipe buttons */}
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

                <p style={{ fontSize: '13px', color: '#8C857A' }}>
                  Try it — no account needed. {stats.movieCount.toLocaleString()}+ films in the stack.
                </p>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <div
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ borderTop: '1px solid rgba(237,228,210,.1)', borderBottom: '1px solid rgba(237,228,210,.1)' }}
          aria-label="Database statistics"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {[
              { n: formatCount(stats.movieCount),   label: 'films documented'       },
              { n: String(stats.creatorCount || 0), label: 'people & filmographies' },
              { n: String(stats.countryCount || 0), label: 'countries'              },
              { n: '0',                              label: 'festivals & awards'     },
            ].map(({ n, label }, i) => (
              <div
                key={label}
                className={i > 0 ? 'border-l border-white/10' : ''}
                style={{
                  padding: '24px 20px',
                  display: 'flex', flexDirection: 'column', gap: '14px',
                }}
              >
                <div style={{ ...SERIF, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1, color: '#F6EFE2' }}>
                  {n}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px', color: '#C7BFB2' }}>{label}</span>
                  <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7FA88B' }}>Live</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MUVIESTARS CLUB ──────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px' }}
          aria-labelledby="club-heading"
        >
          <div
            className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[480px]"
            style={{
              borderRadius: '32px', background: '#12242B',
              position: 'relative', overflow: 'hidden',
            }}
          >
            {/* Arch fallback — only when no poster */}
            {!clubPick?.poster_url && (
              <>
                <div style={{ position: 'absolute', right: '140px', top: '60px', width: '340px', height: '460px', borderRadius: '170px 170px 0 0', background: '#C8963E' }} />
                <div style={{ position: 'absolute', right: '250px', top: '120px', width: '120px', height: '120px', borderRadius: '50%', background: '#12242B' }} />
              </>
            )}
            <div className="ms-grain" />

            {/* Content */}
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
                  One film, watched together, every week. This week: a story worth watching and discussing as a community.
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

            {/* Poster — desktop right column */}
            {clubPick?.poster_url && (
              <div
                className="hidden lg:block lg:col-span-6"
                style={{ position: 'relative', minHeight: '480px' }}
              >
                <img
                  src={clubPick.poster_url}
                  alt={`${clubPick.title} poster`}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'center top',
                    opacity: 0.75,
                  }}
                />
                {/* Blend left edge into card background */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #12242B 0%, transparent 40%)' }} />
              </div>
            )}
          </div>
        </section>

        {/* ── AFRICAN FILM CANON ───────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px' }}
          aria-labelledby="canon-heading"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                  African Film Canon
                </p>
                <h2
                  id="canon-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
                >
                  The essentials.
                </h2>
              </div>
              <Link href="/canon" style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none' }}>
                View the Canon →
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '720px' }}>
              {canonRows.map(({ n, title, meta, dir, href }) => (
                <Link
                  key={n}
                  href={href}
                  className="grid grid-cols-[44px_1fr] lg:grid-cols-[44px_1fr_auto] items-center gap-[14px] py-4 hover:bg-cinema-surface/30 rounded transition-colors"
                  style={{ borderTop: '1px solid rgba(237,228,210,.1)', textDecoration: 'none', color: '#EDE4D2' }}
                >
                  <span style={{ ...SERIF, fontSize: '36px', color: '#6E675E' }}>{n}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ ...SERIF, fontSize: '30px', lineHeight: '1.05', color: '#F6EFE2' }}>{title}</span>
                    <span style={{ fontSize: '14px', color: '#A39B8F' }}>{meta}</span>
                  </span>
                  <span className="hidden lg:block" style={{ fontSize: '14px', color: '#A39B8F', textAlign: 'right' }}>{dir}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', paddingBottom: '0' }}
          aria-labelledby="faq-heading"
        >
          <div style={{ maxWidth: '760px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 12px' }}>
              Common questions
            </p>
            <h2
              id="faq-heading"
              style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: '0 0 48px' }}
            >
              About MuvieStars
            </h2>
            <dl style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {HOME_FAQ.map((item) => (
                <div key={item.question} style={{ borderTop: '1px solid rgba(237,228,210,.1)', padding: '24px 0' }}>
                  <dt style={{ fontSize: '18px', fontWeight: 500, color: '#F6EFE2', marginBottom: '10px' }}>
                    {item.question}
                  </dt>
                  <dd style={{ fontSize: '15px', color: '#C7BFB2', lineHeight: '1.65', margin: 0 }}>
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '140px', paddingBottom: '0' }}
          aria-labelledby="cta-heading"
        >
          <div
            className="p-8 sm:p-12 lg:p-[72px]"
            style={{
              borderRadius: '36px', background: '#C8963E', color: '#0B0A09',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '40px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '760px' }}>
              <h2
                id="cta-heading"
                style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,6vw,88px)', lineHeight: '0.92', letterSpacing: '-0.02em', margin: 0 }}
              >
                {isSignedIn ? 'There is always more to discover.' : 'Find something worth watching.'}
              </h2>
              <p style={{ margin: 0, fontSize: '19px', lineHeight: '1.5', color: 'rgba(43,33,18,.85)' }}>
                {isSignedIn
                  ? 'Every swipe adds to your collection and sharpens the picture of what African cinema actually is.'
                  : 'Tell us what you thought. Help shape how African cinema is discovered. Free, always.'}
              </p>
            </div>
            {isSignedIn ? (
              <Link
                href="/swipe"
                style={{ height: '60px', padding: '0 30px', borderRadius: '18px', background: '#0B0A09', color: '#F6EFE2', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
              >
                Keep swiping
              </Link>
            ) : (
              <Link
                href="/auth"
                style={{ height: '60px', padding: '0 30px', borderRadius: '18px', background: '#0B0A09', color: '#F6EFE2', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
              >
                Create your free account
              </Link>
            )}
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
