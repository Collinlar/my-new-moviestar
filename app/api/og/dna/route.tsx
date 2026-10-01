import { ImageResponse } from 'next/og'
import { createStaticClient } from '@/lib/supabase/static'
import { parseShareOptions } from '@/lib/share'
import { loadDna } from '@/lib/dna-data'
import { harshnessLine } from '@/lib/dna'

export const runtime = 'edge'

const GOLD = '#C8963E'

function truncate(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '...'
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  const supabase = createStaticClient() as any
  const { data: card } = await supabase
    .from('share_cards')
    .select('user_id, payload')
    .eq('share_token', token)
    .eq('object_type', 'dna')
    .maybeSingle()
  if (!card?.user_id) return new Response('Not found', { status: 404 })

  const { dna } = await loadDna(supabase, card.user_id)
  if (!dna.unlocked) return new Response('Not found', { status: 404 })

  const options = parseShareOptions(card.payload)
  let name: string | null = null
  if (options.show_name) {
    const { data: profile } = await supabase.from('public_profiles').select('display_name').eq('user_id', card.user_id).maybeSingle()
    name = profile?.display_name ?? null
  }

  const W = 1080
  const H = 1080
  const headline = dna.headline ?? 'Still finding my taste'
  const bars = dna.mix.slice(0, 4)
  const top = bars[0]?.count ?? 1
  const standout = dna.tags.map((t) => t.label).join(', ')

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: `${W}px`, height: `${H}px`, background: '#0B0A09', fontFamily: 'sans-serif', flexDirection: 'column', justifyContent: 'space-between', padding: '80px 72px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#0B0A09' }}>
            M
          </div>
          <span style={{ fontSize: '20px', fontWeight: 600, color: '#EDE4D2' }}>MuvieStars</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div style={{ fontSize: '20px', letterSpacing: '0.18em', color: GOLD, display: 'flex' }}>MOVIE DNA</div>
          <div style={{ fontSize: '84px', fontWeight: 700, color: '#F6EFE2', lineHeight: '1.0', letterSpacing: '-0.02em', display: 'flex', maxWidth: '936px' }}>
            {truncate(headline, 60)}
          </div>

          {bars.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div style={{ fontSize: '16px', letterSpacing: '0.14em', color: '#8C857A', display: 'flex' }}>WHAT I TAKE MOST</div>
              {bars.map((b) => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div style={{ width: '210px', fontSize: '24px', color: '#C7BFB2', display: 'flex' }}>{truncate(cap(b.label), 16)}</div>
                  <div style={{ display: 'flex', height: '18px', width: `${Math.max(8, Math.round((b.count / top) * 560))}px`, background: GOLD, borderRadius: '9px' }} />
                  <div style={{ fontSize: '20px', color: '#8C857A', display: 'flex' }}>{`${b.count}`}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {standout && <div style={{ fontSize: '26px', color: '#EDE4D2', display: 'flex' }}>{`Stands out to me: ${truncate(standout, 50)}`}</div>}
            {dna.harshness && <div style={{ fontSize: '26px', color: '#A39B8F', display: 'flex' }}>{harshnessLine(dna.harshness)}</div>}
            <div style={{ fontSize: '22px', color: '#6E675E', display: 'flex' }}>{`Built from ${dna.takes} takes`}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {name && <div style={{ fontSize: '30px', color: '#EDE4D2', display: 'flex' }}>{truncate(name, 30)}</div>}
          <div style={{ fontSize: '16px', color: '#4B4440', letterSpacing: '0.03em', display: 'flex' }}>{`muviestars.com/dna/${token}`}</div>
        </div>
      </div>
    ),
    { width: W, height: H },
  )
}
