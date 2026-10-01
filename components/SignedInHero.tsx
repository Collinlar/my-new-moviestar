'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const MOODS = [
  { label: 'Make me laugh',        href: '/swipe?mood=laugh',       bg: '#2C1A0E', text: '#E8A530' },
  { label: 'Keep me guessing',     href: '/swipe?mood=thriller',    bg: '#1D2D3A', text: '#8FA8C8' },
  { label: 'Give me butterflies',  href: '/swipe?mood=romance',     bg: '#3A1520', text: '#E0735A' },
  { label: 'Gut punch',            href: '/swipe?mood=drama',       bg: '#231C14', text: '#D8CFC0' },
  { label: 'Night in Nigeria',     href: '/swipe?mood=nollywood',   bg: '#1A1D0E', text: '#7FA88B' },
  { label: 'Old but Gold',         href: '/swipe?mood=obg',         bg: '#201510', text: '#C8963E' },
  { label: 'Great performances',   href: '/swipe?mood=performance', bg: '#0F2230', text: '#8FA8C8' },
  { label: 'Something different',  href: '/swipe?mood=discover',    bg: '#1C1230', text: '#D9A6B3' },
]

interface Props {
  userName: string | null
}

interface Stats {
  reactions: number
  watchlist: number
}

export function SignedInHero({ userName }: Props) {
  const [greeting, setGreeting]   = useState('Good evening')
  const [stats, setStats]         = useState<Stats | null>(null)

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12)      setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else             setGreeting('Good evening')
  }, [])

  useEffect(() => {
    const supabase = createClient() as any
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ count: reactions }, { count: watchlist }] = await Promise.all([
        supabase
          .from('movie_reactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'published'),
        supabase
          .from('watchlists')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ])

      setStats({
        reactions: reactions ?? 0,
        watchlist: watchlist ?? 0,
      })
    }
    load()
  }, [])

  const name = userName || 'there'

  return (
    <section
      style={{ background: '#0B0A09', paddingTop: '76px' }}
      aria-labelledby="signed-in-hero-heading"
    >
      <div className="ms-grain" aria-hidden="true" />
      <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20 w-full">
        <div style={{ paddingTop: '48px', paddingBottom: '56px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Greeting + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              {greeting}
            </p>
            <h1
              id="signed-in-hero-heading"
              style={{ ...SERIF, fontWeight: 400, lineHeight: '0.94', letterSpacing: '-0.02em', color: '#F6EFE2', margin: 0 }}
            >
              <span style={{ fontSize: 'clamp(48px,7vw,96px)', display: 'block' }}>
                {greeting}, {name}.
              </span>
              <span style={{ fontSize: 'clamp(28px,4vw,52px)', color: '#8C857A', fontStyle: 'italic', display: 'block', marginTop: '8px' }}>
                What are you in the mood for?
              </span>
            </h1>

            {/* Activity stats — appear once loaded */}
            {stats !== null && (
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <Link
                  href="/account"
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <span style={{ ...SERIF, fontSize: '28px', lineHeight: 1, color: '#F6EFE2' }}>
                    {stats.reactions.toLocaleString()}
                  </span>
                  <span style={{ ...MONO, fontSize: '11px', color: '#6A6258', letterSpacing: '0.06em' }}>
                    films reacted to
                  </span>
                </Link>

                <div style={{ width: '1px', background: 'rgba(237,228,210,0.1)', alignSelf: 'stretch' }} />

                <Link
                  href="/account"
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}
                >
                  <span style={{ ...SERIF, fontSize: '28px', lineHeight: 1, color: '#F6EFE2' }}>
                    {stats.watchlist.toLocaleString()}
                  </span>
                  <span style={{ ...MONO, fontSize: '11px', color: '#6A6258', letterSpacing: '0.06em' }}>
                    on watch later
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Mood chips */}
          <div
            style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
            role="list"
            aria-label="Mood filters"
          >
            {MOODS.map(({ label, href, bg, text }) => (
              <Link
                key={label}
                href={href}
                role="listitem"
                style={{
                  height: '44px', padding: '0 20px', borderRadius: '999px',
                  background: bg, color: text,
                  fontSize: '15px', fontWeight: 500,
                  display: 'inline-flex', alignItems: 'center',
                  textDecoration: 'none',
                  border: '1px solid rgba(237,228,210,0.08)',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href="/swipe"
              style={{
                height: '56px', padding: '0 28px', borderRadius: '16px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '16px', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                textDecoration: 'none',
              }}
            >
              <Play size={18} />
              Continue swiping
            </Link>
            <Link
              href="/discover"
              style={{
                height: '56px', padding: '0 28px', borderRadius: '16px',
                border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2',
                fontSize: '16px', fontWeight: 500,
                display: 'inline-flex', alignItems: 'center',
                textDecoration: 'none',
              }}
            >
              Pick a way in
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}
