import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ShareVisitBeacon } from '@/components/ShareVisitBeacon'
import { parseShareOptions, SHARE_TOKEN_PATTERN } from '@/lib/share'
import { harshnessLine } from '@/lib/dna'
import { loadDna } from '@/lib/dna-data'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ token: string }>
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

async function getSharedDna(token: string) {
  if (!SHARE_TOKEN_PATTERN.test(token)) return null
  const supabase = createStaticClient() as any
  const { data: card } = await supabase
    .from('share_cards')
    .select('user_id, payload')
    .eq('share_token', token)
    .eq('object_type', 'dna')
    .maybeSingle()
  if (!card?.user_id) return null

  const { dna } = await loadDna(supabase, card.user_id)
  if (!dna.unlocked) return null

  // The name is only looked up when the person chose to show it.
  const options = parseShareOptions(card.payload)
  let name: string | null = null
  if (options.show_name) {
    const { data: profile } = await supabase.from('public_profiles').select('display_name').eq('user_id', card.user_id).maybeSingle()
    name = profile?.display_name ?? null
  }
  return { dna, name }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await getSharedDna(token)
  if (!data) return { title: 'MuvieStars' }
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muviestars.com'
  const image = `${baseUrl}/api/og/dna?token=${token}`
  const title = data.name ? `${data.name}'s Movie DNA` : 'My Movie DNA'
  const description = data.dna.headline ?? 'A portrait of a taste in African cinema.'
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, images: [{ url: image, width: 1080, height: 1080, alt: title }], type: 'article' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export const dynamic = 'force-dynamic'

export default async function SharedDnaPage({ params }: PageProps) {
  const { token } = await params
  const data = await getSharedDna(token)
  if (!data) notFound()
  const { dna, name } = data

  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <div style={{ maxWidth: '860px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              {name ? `${name}'s Movie DNA` : 'Movie DNA'}
            </p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,96px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              {dna.headline ?? 'Still finding a taste.'}
            </h1>

            {dna.mix.length > 0 && (
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '8px 0 -8px' }}>What they take most</p>
            )}
            {dna.mix.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dna.mix.slice(0, 4).map((g) => (
                  <li key={g.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px', alignItems: 'center' }}>
                    <span style={{ fontSize: '16px', color: '#C7BFB2' }}>{cap(g.label)}</span>
                    <span aria-hidden="true" style={{ display: 'block', height: '10px', borderRadius: '5px', background: '#C8963E', width: `${Math.max(4, Math.round(g.share * 100))}%`, maxWidth: '100%' }} />
                  </li>
                ))}
              </ul>
            )}

            {dna.tags.length > 0 && (
              <p style={{ margin: 0, fontSize: '19px', color: '#EDE4D2' }}>Stands out to them: {dna.tags.map((t) => t.label).join(', ')}.</p>
            )}
            {dna.harshness && <p style={{ margin: 0, fontSize: '17px', color: '#A39B8F' }}>{harshnessLine(dna.harshness)}</p>}
            <p style={{ margin: 0, fontSize: '14px', color: '#6E675E' }}>Built from {dna.takes} takes.</p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', paddingTop: '8px' }}>
              <Link
                href="/dna"
                style={{ minHeight: '52px', padding: '0 24px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Find my own Movie DNA
              </Link>
              <Link
                href="/swipe"
                style={{ minHeight: '52px', padding: '0 24px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2', fontSize: '16px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Start swiping
              </Link>
            </div>
          </div>
        </div>
      </main>
      <ShareVisitBeacon token={token} />
      <Footer />
    </>
  )
}
