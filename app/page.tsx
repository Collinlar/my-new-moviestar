import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import {
  getFeaturedMovies, getTrendingMovies, getCanonMovies,
  getTopCreators, getDbStats, getOldButGoldMovies,
  type Movie,
} from '@/lib/queries'
import { formatCount } from '@/lib/utils'
import { websiteSchema, organizationSchema, faqSchema } from '@/lib/schema'

export const metadata: Metadata = {
  title: 'The Living Database of African Cinema | MuvieStars',
  description:
    'Find what to watch, react to films you have seen, and explore the living database of African cinema. From Nollywood to Francophone Africa.',
  alternates: { canonical: 'https://muviestars.com' },
}

export const revalidate = 3600

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

/* ── static fallbacks ─────────────────────────────────────────────── */

const STATIC_CANON = [
  { title: 'Touki Bouki',                   meta: '1973 · Senegal',       dir: 'Djibril Diop Mambéty' },
  { title: 'Yeelen',                         meta: '1987 · Mali',          dir: 'Souleymane Cissé'      },
  { title: 'Love Brewed in the African Pot', meta: '1980 · Ghana',         dir: 'Kwaw Ansah'            },
  { title: 'Sarraounia',                     meta: '1986 · Burkina Faso',  dir: 'Med Hondo'             },
  { title: 'Living in Bondage',              meta: '1992 · Nigeria',       dir: 'Chris Obi Rapu'        },
]

const STATIC_OBG = [
  { title: 'Love Brewed in the African Pot', meta: '1980 · Ghana'   },
  { title: 'Heritage Africa',                meta: '1988 · Ghana'   },
  { title: 'Living in Bondage',              meta: '1992 · Nigeria' },
  { title: 'Touki Bouki',                    meta: '1973 · Senegal' },
  { title: 'Yeelen',                         meta: '1987 · Mali'    },
  { title: 'Osuofia in London',              meta: '2003 · Nigeria' },
]

const STATIC_TRENDING = [
  { title: 'Laughing Hearts',    meta: '2026 · Nigeria · Romance',     badge: 'New'     },
  { title: 'Silence',            meta: '2024 · Ghana · Drama',         badge: 'Club'    },
  { title: 'Cocoa Season Part 3',meta: '2023 · Ghana · Comedy',        badge: 'Ghana'   },
  { title: 'Nkabi',              meta: '2024 · South Africa · Action', badge: 'Gem'     },
  { title: 'Lagos Liars',        meta: '2025 · Nigeria · Comedy',      badge: 'Rising'  },
]

const STATIC_PEOPLE = [
  { ini: 'JA', name: 'Jackie Appiah',         role: 'Actor',            bg: '#1C2433', ink: '#8FA8C8', href: '/creators' },
  { ini: 'KA', name: 'Kwaw Ansah',             role: 'Director',         bg: '#2C1A0E', ink: '#E8A530', href: '/creators' },
  { ini: 'DM', name: 'Djibril Diop Mambéty',  role: 'Director',         bg: '#0F2230', ink: '#D9674E', href: '/creators' },
  { ini: 'NM', name: 'Nana Ama McBrown',       role: 'Actor',            bg: '#271A33', ink: '#D9A6B3', href: '/creators' },
  { ini: 'MS', name: 'Maurice Sam',            role: 'Actor',            bg: '#3A1520', ink: '#E0735A', href: '/creators' },
  { ini: 'YN', name: 'Yvonne Nelson',          role: 'Actor · Producer', bg: '#13241A', ink: '#7FA88B', href: '/creators' },
]

/* ── shape palettes ───────────────────────────────────────────────── */

const OBG_BG      = ['#2C1A0E', '#1E1A12', '#0E0E0C', '#0F2230', '#2B2008', '#1A1D2B']
const OBG_SHAPES: React.CSSProperties[] = [
  { position: 'absolute', left: '-30%', top: '10%', width: '90%', aspectRatio: '1', borderRadius: '50%', background: '#B5532F' },
  { position: 'absolute', left: 0, right: 0, top: '25%', height: '30%', background: 'repeating-linear-gradient(0deg,#C8963E 0 4px,transparent 4px 13px)' },
  { position: 'absolute', left: '30%', top: '22%', width: '40%', aspectRatio: '1', borderRadius: '50%', background: '#D8D2C4', boxShadow: '0 0 50px rgba(216,210,196,.4)' },
  { position: 'absolute', left: '15%', top: '30%', width: '70%', height: '18%', borderRadius: '200px 200px 0 0', background: '#D9674E' },
  { position: 'absolute', left: '10%', top: '10%', width: '80%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,#F0D48A 0 30%,#C8963E 31% 60%,transparent 61%)' },
  { position: 'absolute', left: '18%', top: '14%', width: '64%', height: '44%', border: '2px solid #8FA8C8', borderRadius: '8px' },
]

const TRENDING_BG     = ['#3B2317', '#12242B', '#2E2410', '#17171A', '#2A1330']
const TRENDING_SHAPES: React.CSSProperties[] = [
  { position: 'absolute', left: '6px',  top: '10px', width: '30px', height: '30px', borderRadius: '50%', background: '#F0B25C' },
  { position: 'absolute', left: '12px', top: '12px', width: '32px', height: '50px', borderRadius: '16px 16px 0 0', background: '#C8963E' },
  { position: 'absolute', left: '8px',  top: '8px',  width: '24px', height: '24px', borderRadius: '50%', background: '#E8A530' },
  { position: 'absolute', left: '-10px', top: '30px', width: '90px', height: '16px', background: '#B8432F', transform: 'rotate(-24deg)' },
  { position: 'absolute', left: '10px', top: '14px', width: '34px', height: '34px', borderRadius: '8px', background: '#E8A530', transform: 'rotate(12deg)' },
]

const CREATOR_PALETTES = [
  { bg: '#1C2433', ink: '#8FA8C8' },
  { bg: '#2C1A0E', ink: '#E8A530' },
  { bg: '#0F2230', ink: '#D9674E' },
  { bg: '#271A33', ink: '#D9A6B3' },
  { bg: '#3A1520', ink: '#E0735A' },
  { bg: '#13241A', ink: '#7FA88B' },
]

const REGIONS: Array<{ name: string; sub: string; shape: React.CSSProperties }> = [
  { name: 'Ghana',              sub: 'Ghallywood & Kumawood',          shape: { position: 'absolute', right: '-30px', top: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: '#C8963E', opacity: .18 } },
  { name: 'Nigeria',            sub: 'Nollywood',                      shape: { position: 'absolute', right: '-20px', top: '-40px', width: '120px', height: '200px', borderRadius: '60px', background: '#6F8F4E', opacity: .22 } },
  { name: 'South Africa',       sub: 'Zulu, Xhosa, Afrikaans & more', shape: { position: 'absolute', right: '-40px', top: '30px', width: '260px', height: '30px', background: '#B8432F', opacity: .25, transform: 'rotate(-20deg)' } },
  { name: 'Francophone Africa', sub: 'Senegal, Burkina Faso, Mali…',  shape: { position: 'absolute', right: '30px', top: '-60px', width: '160px', height: '120px', borderRadius: '0 0 80px 80px', background: '#8FA8C8', opacity: .2 } },
  { name: 'East Africa',        sub: 'Kenya, Tanzania, Uganda…',       shape: { position: 'absolute', right: '-50px', bottom: '-50px', width: '160px', height: '160px', borderRadius: '50%', border: '2px solid #E8C27A', opacity: .35 } },
  { name: 'North Africa',       sub: 'Egypt, Morocco, Tunisia…',       shape: { position: 'absolute', right: '20px', top: '-10px', width: '90px', height: '150px', borderRadius: '45px 45px 0 0', background: '#D9674E', opacity: .2 } },
]

/* ── helpers ──────────────────────────────────────────────────────── */

function getInitials(name: string | null | undefined): string {
  if (!name) return '??'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getTrendingBadge(m: Movie, idx: number): string {
  if (m.release_year >= 2025) return 'New'
  if (m.is_canon)             return 'Gem'
  if (m.featured)             return 'Club'
  if (m.country === 'Ghana')  return 'Ghana'
  if (m.country === 'Nigeria')return 'Nigeria'
  return idx === 0 ? 'Trending' : 'Rising'
}

function daysLeftThisWeek(): number {
  const day = new Date().getDay()
  const daysSinceMonday = (day - 1 + 7) % 7
  return 7 - daysSinceMonday
}

/* ── page ─────────────────────────────────────────────────────────── */

export default async function HomePage() {
  const [featured, trending, canon, creators, stats, obg] = await Promise.all([
    getFeaturedMovies(6),
    getTrendingMovies(8),
    getCanonMovies(5),
    getTopCreators(6),
    getDbStats(),
    getOldButGoldMovies(6),
  ])

  const daysLeft  = daysLeftThisWeek()
  const clubPick  = featured[0] || trending[0] || null

  /* canon rows — use DB if we have 5+, else use static */
  const canonRows = canon.length >= 5
    ? canon.slice(0, 5).map((m, i) => ({
        n:    String(i + 1).padStart(2, '0'),
        title: m.title,
        meta:  `${m.release_year}${m.country ? ` · ${m.country}` : ''}`,
        dir:   m.director || STATIC_CANON[i]?.dir || '',
        href:  `/movie/${m.id}`,
      }))
    : STATIC_CANON.map((s, i) => ({ n: String(i + 1).padStart(2, '0'), ...s, href: '/browse' }))

  /* OBG — use real DB films (pre-2001) if we have 3+, else static */
  const obgDisplay = obg.length >= 3
    ? obg.slice(0, 6).map((m, i) => ({
        title:  m.title,
        meta:   `${m.release_year}${m.country ? ` · ${m.country}` : ''}`,
        href:   `/movie/${m.id}`,
        poster: m.poster_url && m.poster_url.startsWith('http') ? m.poster_url : null,
        bg:     OBG_BG[i % OBG_BG.length],
        shape:  OBG_SHAPES[i % OBG_SHAPES.length],
      }))
    : STATIC_OBG.map((s, i) => ({
        ...s,
        href:   '/browse',
        poster: null,
        bg:     OBG_BG[i % OBG_BG.length],
        shape:  OBG_SHAPES[i % OBG_SHAPES.length],
      }))

  /* Trending — use real DB films if we have 3+, else static */
  const trendingDisplay = trending.length >= 3
    ? trending.slice(0, 5).map((m, i) => ({
        title:  m.title,
        meta:   `${m.release_year}${m.country ? ` · ${m.country}` : ''}${m.genre ? ` · ${m.genre}` : ''}`,
        href:   `/movie/${m.id}`,
        badge:  getTrendingBadge(m, i),
        poster: m.poster_url && m.poster_url.startsWith('http') ? m.poster_url : null,
        bg:     TRENDING_BG[i % TRENDING_BG.length],
        shape:  TRENDING_SHAPES[i % TRENDING_SHAPES.length],
      }))
    : STATIC_TRENDING.map((s, i) => ({
        ...s,
        href:   '/browse',
        poster: null,
        bg:     TRENDING_BG[i % TRENDING_BG.length],
        shape:  TRENDING_SHAPES[i % TRENDING_SHAPES.length],
      }))

  /* People — use real creators if we have 3+, else static */
  const creatorsDisplay = creators.length >= 3
    ? creators.slice(0, 6).map((c, i) => ({
        ini:   getInitials(c.name),
        name:  c.name,
        role:  'Director',
        bg:    CREATOR_PALETTES[i % CREATOR_PALETTES.length].bg,
        ink:   CREATOR_PALETTES[i % CREATOR_PALETTES.length].ink,
        href:  `/creator/${c.id}`,
        image: c.image_url && c.image_url.startsWith('http') ? c.image_url : null,
      }))
    : STATIC_PEOPLE

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

      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2' }}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section
          className="relative pt-[76px] overflow-hidden"
          style={{ minHeight: '760px', background: '#0B0A09' }}
          aria-labelledby="hero-heading"
        >
          <div className="ms-grain" aria-hidden="true" />

          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20 w-full">
            <div
              className="grid items-center gap-6"
              style={{ gridTemplateColumns: 'repeat(12,minmax(0,1fr))', columnGap: '24px', minHeight: '684px' }}
            >
              {/* Left: 7 cols */}
              <div
                style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '32px' }}
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

        {/* ── STATS ────────────────────────────────────────────────────── */}
        <div
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ borderTop: '1px solid rgba(237,228,210,.1)', borderBottom: '1px solid rgba(237,228,210,.1)' }}
          aria-label="Database statistics"
        >
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}
            className="grid-cols-2 sm:grid-cols-4"
          >
            {[
              { n: formatCount(stats.movieCount),   label: 'films documented'       },
              { n: String(stats.creatorCount || 0), label: 'people & filmographies' },
              { n: String(stats.countryCount || 0), label: 'countries'              },
              { n: '0',                              label: 'festivals & awards'     },
            ].map(({ n, label }, i) => (
              <div
                key={label}
                style={{
                  padding: i === 0 ? '36px 32px 36px 0' : i === 3 ? '36px 0 36px 32px' : '36px 32px',
                  display: 'flex', flexDirection: 'column', gap: '14px',
                  borderLeft: i > 0 ? '1px solid rgba(237,228,210,.1)' : undefined,
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
            style={{
              height: '480px', borderRadius: '32px', background: '#12242B',
              position: 'relative', overflow: 'hidden',
              display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))', columnGap: '24px',
            }}
          >
            {/* Decorative arch */}
            <div style={{ position: 'absolute', right: '140px', top: '60px', width: '340px', height: '460px', borderRadius: '170px 170px 0 0', background: '#C8963E' }} />
            <div style={{ position: 'absolute', right: '250px', top: '120px', width: '120px', height: '120px', borderRadius: '50%', background: '#12242B' }} />
            <div className="ms-grain" />

            {/* Content */}
            <div
              style={{ gridColumn: '1 / span 6', padding: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}
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
          </div>
        </section>

        {/* ── OLD BUT GOLD ─────────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', display: 'flex', flexDirection: 'column', gap: '32px' }}
          aria-labelledby="obg-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                From the archive · Old But Gold
              </p>
              <h2
                id="obg-heading"
                style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
              >
                How many have you actually seen?
              </h2>
            </div>
            <Link
              href="/swipe"
              style={{ height: '48px', padding: '0 20px', borderRadius: '14px', border: '1px solid rgba(237,228,210,.18)', color: '#EDE4D2', fontSize: '15px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              Take the 25-film challenge
            </Link>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: '20px' }}
            className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
          >
            {obgDisplay.map(({ title, meta, href, poster, bg, shape }) => (
              <Link
                key={title}
                href={href}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none', color: '#EDE4D2' }}
              >
                <div style={{ aspectRatio: '2/3', borderRadius: '14px', position: 'relative', overflow: 'hidden', background: bg }}>
                  {poster
                    ? <img src={poster} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={shape} />
                  }
                  <div className="ms-grain" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, lineHeight: '1.25' }}>{title}</div>
                  <div style={{ fontSize: '13px', color: '#A39B8F' }}>{meta}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── CANON + TRENDING ─────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))', columnGap: '24px' }}
          aria-labelledby="canon-heading"
        >
          {/* Canon: 7 cols */}
          <div
            style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '28px' }}
            className="col-span-12 lg:col-span-7"
          >
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

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {canonRows.map(({ n, title, meta, dir, href }) => (
                <Link
                  key={n}
                  href={href}
                  style={{
                    display: 'grid', gridTemplateColumns: '56px 1fr auto',
                    alignItems: 'center', gap: '20px', padding: '18px 0',
                    borderTop: '1px solid rgba(237,228,210,.1)', textDecoration: 'none', color: '#EDE4D2',
                  }}
                  className="hover:bg-cinema-surface/30 rounded transition-colors -mx-2 px-2"
                >
                  <span style={{ ...SERIF, fontSize: '36px', color: '#6E675E' }}>{n}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ ...SERIF, fontSize: '30px', lineHeight: '1.05', color: '#F6EFE2' }}>{title}</span>
                    <span style={{ fontSize: '14px', color: '#A39B8F' }}>{meta}</span>
                  </span>
                  <span style={{ fontSize: '14px', color: '#A39B8F', textAlign: 'right' }}>{dir}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Trending: 4 cols */}
          <div
            style={{ gridColumn: '9 / span 4', display: 'flex', flexDirection: 'column', gap: '28px' }}
            className="hidden lg:flex col-start-9 lg:col-span-4"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                Trending this week
              </p>
              <h2 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                Everyone&apos;s talking.
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {trendingDisplay.map(({ title, meta, badge, href, poster, bg, shape }) => (
                <Link
                  key={title}
                  href={href}
                  style={{ display: 'flex', gap: '16px', alignItems: 'center', textDecoration: 'none', color: '#EDE4D2' }}
                >
                  <div style={{ width: '56px', height: '80px', borderRadius: '8px', position: 'relative', overflow: 'hidden', background: bg, flexShrink: 0 }}>
                    {poster
                      ? <img src={poster} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={shape} />
                    }
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flexGrow: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: 500 }}>{title}</div>
                    <div style={{ fontSize: '13px', color: '#A39B8F' }}>{meta}</div>
                  </div>
                  <div style={{ ...MONO, fontSize: '12px', color: '#7FA88B', flexShrink: 0 }}>{badge}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── PEOPLE ───────────────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', display: 'flex', flexDirection: 'column', gap: '32px' }}
          aria-labelledby="people-heading"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <h2
              id="people-heading"
              style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
            >
              The people behind African cinema
            </h2>
            <Link href="/creators" style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none' }}>
              All people →
            </Link>
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: '20px' }}
            className="grid-cols-3 sm:grid-cols-6"
          >
            {creatorsDisplay.map((person) => (
              <Link
                key={person.name}
                href={'href' in person ? person.href : '/creators'}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px', textDecoration: 'none', color: '#EDE4D2' }}
              >
                <div style={{ aspectRatio: '1/1', borderRadius: '50%', background: person.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                  {'image' in person && person.image
                    ? <img src={(person as { image: string }).image} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ ...SERIF, fontSize: '56px', color: person.ink }}>{person.ini}</span>
                  }
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 500 }}>{person.name}</div>
                  <div style={{ fontSize: '13px', color: '#A39B8F' }}>{person.role}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ── BROWSE THE CONTINENT ─────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', display: 'flex', flexDirection: 'column', gap: '32px' }}
          aria-labelledby="browse-heading"
        >
          <h2
            id="browse-heading"
            style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
          >
            Browse the continent
          </h2>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}
            className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          >
            {REGIONS.map(({ name, sub, shape }) => (
              <Link
                key={name}
                href={`/browse?region=${encodeURIComponent(name)}`}
                style={{
                  height: '132px', borderRadius: '20px', background: '#131110', padding: '24px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  textDecoration: 'none', color: '#EDE4D2', position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={shape} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
                  <div style={{ ...SERIF, fontSize: '34px', lineHeight: 1, color: '#F6EFE2' }}>{name}</div>
                  <div style={{ fontSize: '14px', color: '#A39B8F' }}>{sub}</div>
                </div>
                <ArrowRight size={22} color="#A39B8F" style={{ position: 'relative' }} />
              </Link>
            ))}
          </div>
        </section>

        {/* ── COMMUNITY VERDICT ────────────────────────────────────────── */}
        <section
          className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
          style={{ paddingTop: '120px', display: 'grid', gridTemplateColumns: 'repeat(12,minmax(0,1fr))', columnGap: '24px', alignItems: 'center' }}
          aria-labelledby="verdict-heading"
        >
          <div
            style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px' }}
            className="col-span-12 lg:col-span-5 mb-10 lg:mb-0"
          >
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              Community Verdict
            </p>
            <h2
              id="verdict-heading"
              style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
            >
              More useful than a star rating.
            </h2>
            <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.55', color: '#C7BFB2' }}>
              Every swipe and reaction adds up to a verdict that tells you what a film is actually like — what viewers loved, what divided them, and who it&apos;s best for.
            </p>
          </div>

          <div
            style={{ gridColumn: '7 / span 6', borderRadius: '28px', background: '#15120E', padding: '36px', display: 'flex', flexDirection: 'column', gap: '28px' }}
            className="col-span-12 lg:col-start-7 lg:col-span-6"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '14px', color: '#A39B8F' }}>What MuvieStars viewers say about</div>
                <div style={{ ...SERIF, fontSize: '36px', lineHeight: 1, color: '#F6EFE2' }}>The Prince&apos;s Bride</div>
              </div>
              <div style={{ ...MONO, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7FA88B' }}>High confidence</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '24px' }}>
              {[['86%', 'enjoyed it', '#C8963E'], ['71%', 'would recommend', '#F6EFE2'], ['48%', 'would rewatch', '#F6EFE2']].map(([pct, lbl, clr]) => (
                <div key={lbl} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ ...SERIF, fontSize: 'clamp(40px,5vw,64px)', lineHeight: '0.95', color: clr }}>{pct}</div>
                  <div style={{ fontSize: '14px', color: '#A39B8F' }}>{lbl}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '20px', paddingTop: '24px', borderTop: '1px solid rgba(237,228,210,.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: '#A39B8F' }}>Viewers especially loved</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Chemistry', 'Acting'].map(tag => (
                    <span key={tag} style={{ height: '32px', padding: '0 12px', borderRadius: '999px', background: 'rgba(200,150,62,.16)', color: '#F2D6A2', fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '13px', color: '#A39B8F' }}>Mixed reactions around</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {['Pacing', 'Ending'].map(tag => (
                    <span key={tag} style={{ height: '32px', padding: '0 12px', borderRadius: '999px', border: '1px solid rgba(237,228,210,.16)', color: '#D8CFC0', fontSize: '14px', display: 'inline-flex', alignItems: 'center' }}>{tag}</span>
                  ))}
                </div>
              </div>
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
            style={{
              borderRadius: '36px', background: '#C8963E', color: '#0B0A09', padding: '72px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '40px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '760px' }}>
              <h2
                id="cta-heading"
                style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,6vw,88px)', lineHeight: '0.92', letterSpacing: '-0.02em', margin: 0 }}
              >
                Find something worth watching.
              </h2>
              <p style={{ margin: 0, fontSize: '19px', lineHeight: '1.5', color: 'rgba(43,33,18,.85)' }}>
                Tell us what you thought. Help shape how African cinema is discovered. Free, always.
              </p>
            </div>
            <Link
              href="/auth"
              style={{ height: '60px', padding: '0 30px', borderRadius: '18px', background: '#0B0A09', color: '#F6EFE2', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
            >
              Create your free account
            </Link>
          </div>
        </section>

      </main>

      <Footer />
    </>
  )
}
