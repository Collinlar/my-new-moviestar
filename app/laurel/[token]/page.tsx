import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createStaticClient } from '@/lib/supabase/static'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ShareVisitBeacon } from '@/components/ShareVisitBeacon'
import { parseShareOptions } from '@/lib/share'
import { challengeState, formatDay, sponsorLabel } from '@/lib/challenges-shared'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface PageProps {
  params: Promise<{ token: string }>
}

async function getLaurel(token: string) {
  if (!/^[a-f0-9]{10}$/.test(token)) return null
  const supabase = createStaticClient() as any

  const { data: card } = await supabase
    .from('share_cards')
    .select('object_id, user_id, payload')
    .eq('share_token', token)
    .eq('object_type', 'challenge')
    .maybeSingle()
  if (!card) return null

  const { data: completion } = await supabase
    .from('challenge_completions')
    .select('completed_at, challenge:challenges(slug, title, description, goal, starts_at, ends_at, status, sponsor_name, sponsor_url)')
    .eq('id', card.object_id)
    .maybeSingle()
  if (!completion?.challenge || completion.challenge.status !== 'published') return null

  const options = parseShareOptions(card.payload)
  // The name is only looked up when the person chose to show it.
  let name: string | null = null
  if (options.show_name && card.user_id) {
    const { data: profile } = await supabase.from('public_profiles').select('display_name').eq('user_id', card.user_id).maybeSingle()
    name = profile?.display_name ?? null
  }
  return { challenge: completion.challenge, completedAt: completion.completed_at as string, name }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const data = await getLaurel(token)
  if (!data) return { title: 'MuvieStars' }
  const { challenge, name } = data
  const who = name ? `${name} completed` : 'Completed'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://muviestars.com'
  const image = `${baseUrl}/api/og/laurel?token=${token}`
  const title = `${who}: ${challenge.title}`
  const description = `${challenge.goal} African ${challenge.goal === 1 ? 'film' : 'films'} taken on MuvieStars. Join the challenge and earn your own laurel.`
  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, images: [{ url: image, width: 1080, height: 1080, alt: `${challenge.title} laurel` }], type: 'article' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export const dynamic = 'force-dynamic'

export default async function LaurelPage({ params }: PageProps) {
  const { token } = await params
  const data = await getLaurel(token)
  if (!data) notFound()
  const { challenge, completedAt, name } = data
  const state = challengeState(challenge)
  const sponsor = sponsorLabel(challenge)

  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-10 lg:gap-16 items-center">
            <img
              src={`/api/og/laurel?token=${token}`}
              alt={`${challenge.title} laurel`}
              width={420}
              height={420}
              style={{ width: '100%', maxWidth: '420px', aspectRatio: '1 / 1', borderRadius: '16px', background: '#15120E', display: 'block' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '620px' }}>
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                {name ? `${name} completed a challenge` : 'Challenge completed'}
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,76px)', lineHeight: 0.98, color: '#F6EFE2', margin: 0 }}>{challenge.title}</h1>
              <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                {challenge.goal} {challenge.goal === 1 ? 'film' : 'films'} taken. Finished {formatDay(completedAt)}.
                {sponsor ? ` ${sponsor}.` : ''}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  href={`/challenges/${challenge.slug}`}
                  style={{ minHeight: '52px', padding: '0 24px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  {state === 'ended' ? 'See how it went' : 'Take this challenge yourself'}
                </Link>
                <Link
                  href="/challenges"
                  style={{ minHeight: '52px', padding: '0 24px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2', fontSize: '16px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  See what is open now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <ShareVisitBeacon token={token} />
      <Footer />
    </>
  )
}
