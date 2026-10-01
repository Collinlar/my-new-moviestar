import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SharePanel } from '@/components/SharePanel'
import { createClient } from '@/lib/supabase/server'
import { DNA_MIN_TAKES, harshnessLine, type DnaItem } from '@/lib/dna'
import { ensureDnaCard, findBlindSpot, loadDna } from '@/lib/dna-data'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Your Movie DNA',
  description: 'A portrait of your taste in African cinema, built from the takes you have saved.',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function LeanRow({ label, items }: { label: string; items: DnaItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-6" style={{ padding: '16px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
      <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C857A', alignSelf: 'center' }}>{label}</span>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
        {items.map((i) => (
          <span key={i.label} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ ...SERIF, fontSize: '30px', lineHeight: 1.1, color: '#F6EFE2' }}>{cap(i.label)}</span>
            <span style={{ fontSize: '14px', color: '#8C857A' }}>{`${i.count} ${i.count === 1 ? 'take' : 'takes'}, ${i.avg} stars`}</span>
          </span>
        ))}
      </span>
    </div>
  )
}

export default async function DnaPage() {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/dna')

  const { dna, takes } = await loadDna(supabase, user.id)

  const shell = (children: React.ReactNode) => (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>{children}</div>
      </main>
      <Footer />
    </>
  )

  if (!dna.unlocked) {
    return shell(
      <header style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Movie DNA</p>
        <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
          {dna.remaining} more {dna.remaining === 1 ? 'take' : 'takes'} and your DNA appears.
        </h1>
        <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>
          Your Movie DNA is built only from what you say about films, so it needs {DNA_MIN_TAKES} takes before it can say anything true. You have {dna.takes}.
        </p>
        <div role="img" aria-label={`${dna.takes} of ${DNA_MIN_TAKES} takes`} style={{ display: 'flex', gap: '6px', maxWidth: '360px' }}>
          {Array.from({ length: DNA_MIN_TAKES }).map((_, i) => (
            <span key={i} style={{ flex: 1, height: '8px', borderRadius: '4px', background: i < dna.takes ? '#C8963E' : 'rgba(237,228,210,0.12)' }} />
          ))}
        </div>
        <div>
          <Link
            href="/swipe"
            style={{ minHeight: '58px', padding: '0 28px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}
          >
            Swipe to add takes
            <ArrowRight size={18} />
          </Link>
        </div>
      </header>,
    )
  }

  const [token, blindSpot] = await Promise.all([
    ensureDnaCard(supabase, user.id),
    findBlindSpot(supabase, takes).catch(() => null),
  ])

  return shell(
    <>
      <header style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '48px' }}>
        <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Your Movie DNA</p>
        <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,96px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
          {dna.headline ?? 'You are still finding your taste.'}
        </h1>
        <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#A39B8F' }}>
          {dna.headline
            ? `Built from your ${dna.takes} takes. It changes as you add more.`
            : `Your ${dna.takes} takes do not point one way yet. Take a few more from the same corner of African cinema and a pattern shows up.`}
        </p>
      </header>

      <section aria-label="What you lean towards" style={{ maxWidth: '900px' }}>
        <LeanRow label="Genres" items={dna.lean.genres} />
        <LeanRow label="Industries" items={dna.lean.industries} />
        <LeanRow label="Decade" items={dna.lean.decades} />
        {dna.tags.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-6" style={{ padding: '16px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
            <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C857A', alignSelf: 'center' }}>Stands out to you</span>
            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              {dna.tags.map((t) => (
                <span key={t.slug} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '10px' }}>
                  <span style={{ ...SERIF, fontSize: '30px', lineHeight: 1.1, color: '#F6EFE2' }}>{t.label}</span>
                  <span style={{ fontSize: '14px', color: '#8C857A' }}>{`${t.count} ${t.count === 1 ? 'film' : 'films'}`}</span>
                </span>
              ))}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-1 sm:gap-6" style={{ padding: '16px 0', borderTop: '1px solid rgba(237,228,210,0.08)', borderBottom: '1px solid rgba(237,228,210,0.08)' }}>
          <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C857A', alignSelf: 'center' }}>How you rate</span>
          <span style={{ fontSize: '19px', lineHeight: 1.55, color: '#F6EFE2' }}>
            {dna.average !== null && <>Your takes average {dna.average} stars. </>}
            {dna.harshness ? harshnessLine(dna.harshness) : 'There are not enough ratings from others on these films yet to compare.'}
          </span>
        </div>
      </section>

      {blindSpot && (
        <section aria-labelledby="blind-heading" style={{ maxWidth: '900px', paddingTop: '48px' }}>
          <h2 id="blind-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 10px' }}>Your blind spot</h2>
          <p style={{ ...SERIF, fontSize: 'clamp(28px,4vw,40px)', lineHeight: 1.1, color: '#F6EFE2', margin: '0 0 8px' }}>
            You have not taken a single {blindSpot.industry} film.
          </p>
          <p style={{ margin: '0 0 16px', fontSize: '16px', color: '#A39B8F' }}>{`There are ${blindSpot.listed} listed ones waiting.`}</p>
          <Link
            href={blindSpot.deck ? `/decks/${blindSpot.deck.slug}` : `/browse?industry=${encodeURIComponent(blindSpot.industry)}`}
            style={{ minHeight: '48px', padding: '0 20px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.5)', color: '#C8963E', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          >
            {blindSpot.deck ? `Start with ${blindSpot.deck.title}` : `See ${blindSpot.industry} films`}
            <ArrowRight size={16} />
          </Link>
        </section>
      )}

      {token && dna.headline && (
        <section aria-labelledby="share-heading" style={{ maxWidth: '420px', paddingTop: '64px' }}>
          <h2 id="share-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,4vw,40px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 6px' }}>
            Share your DNA.
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '15px', color: '#8C857A' }}>
            The card shows your headline, your genre mix and what stands out to you. It never shows your blind spot or the films you took.
          </p>
          <SharePanel token={token} title="Movie DNA" kind="dna" />
        </section>
      )}
    </>,
  )
}
