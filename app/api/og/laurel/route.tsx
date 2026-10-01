import { ImageResponse } from 'next/og'
import { createStaticClient } from '@/lib/supabase/static'
import { parseShareOptions } from '@/lib/share'

export const runtime = 'edge'

function truncate(str: string, max: number) {
  return str.length <= max ? str : str.slice(0, max).trimEnd() + '...'
}

const GOLD = '#C8963E'

/** Two curved branches of leaves, drawn as shapes so the card never depends on a font. */
function Wreath({ size }: { size: number }) {
  const cx = 250
  const cy = 250
  const R = 175
  const count = 12
  const leaves: Array<{ x: number; y: number; rot: number; inner: boolean }> = []
  for (let i = 0; i < count; i++) {
    // Each branch starts at the bottom and climbs towards the top, leaving the top open.
    const left = (100 + (i * 150) / (count - 1)) * (Math.PI / 180)
    const right = Math.PI - left
    const inner = i % 2 === 1
    const r = R + (inner ? -16 : 16)
    const tilt = inner ? 24 : -24 // outward for the outer leaves, inward for the inner ones
    const deg = (a: number) => (a * 180) / Math.PI
    leaves.push({ x: cx + r * Math.cos(left), y: cy + r * Math.sin(left), rot: deg(left) + 90 + tilt, inner })
    leaves.push({ x: cx + r * Math.cos(right), y: cy + r * Math.sin(right), rot: deg(right) - 90 - tilt, inner })
  }
  return (
    <svg width={size} height={size} viewBox="0 0 500 500">
      {leaves.map((l, i) => (
        <ellipse
          key={i}
          cx={l.x.toFixed(1)}
          cy={l.y.toFixed(1)}
          rx={31}
          ry={11}
          fill={GOLD}
          fillOpacity={l.inner ? 0.5 : 1}
          transform={`rotate(${l.rot.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`}
        />
      ))}
      <polygon
        points="250,205 262,236 295,238 269,258 278,290 250,272 222,290 231,258 205,238 238,236"
        fill={GOLD}
      />
    </svg>
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return new Response('Missing token', { status: 400 })

  const supabase = createStaticClient() as any

  const { data: card } = await supabase
    .from('share_cards')
    .select('object_id, user_id, payload')
    .eq('share_token', token)
    .eq('object_type', 'challenge')
    .maybeSingle()
  if (!card) return new Response('Not found', { status: 404 })

  const { data: completion } = await supabase
    .from('challenge_completions')
    .select('completed_at, challenge:challenges(title, goal, sponsor_name)')
    .eq('id', card.object_id)
    .maybeSingle()
  if (!completion?.challenge) return new Response('Not found', { status: 404 })

  const options = parseShareOptions(card.payload)
  let name: string | null = null
  if (options.show_name && card.user_id) {
    const { data: profile } = await supabase
      .from('public_profiles')
      .select('display_name')
      .eq('user_id', card.user_id)
      .maybeSingle()
    name = profile?.display_name ?? null
  }

  const { title, goal, sponsor_name } = completion.challenge as { title: string; goal: number; sponsor_name: string | null }
  const day = new Date(completion.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

  const W = 1080
  const H = 1080

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: `${W}px`, height: `${H}px`, background: '#0B0A09', fontFamily: 'sans-serif', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '120px', right: '90px', display: 'flex' }}>
          <Wreath size={470} />
        </div>

        <div style={{ position: 'absolute', top: 0, left: 0, width: `${W}px`, height: `${H}px`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '80px 72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#0B0A09' }}>
              M
            </div>
            <span style={{ fontSize: '20px', fontWeight: 600, color: '#EDE4D2' }}>MuvieStars</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ fontSize: '20px', letterSpacing: '0.18em', color: GOLD, display: 'flex' }}>CHALLENGE COMPLETED</div>
            <div style={{ fontSize: '76px', fontWeight: 700, color: '#F6EFE2', lineHeight: '1.02', letterSpacing: '-0.02em', display: 'flex', maxWidth: '900px' }}>
              {truncate(title, 44)}
            </div>
            <div style={{ fontSize: '26px', color: '#A39B8F', display: 'flex' }}>
              {`${goal} ${goal === 1 ? 'film' : 'films'} taken. Finished ${day}.`}
            </div>
            {sponsor_name && (
              <div style={{ fontSize: '20px', color: '#8C857A', display: 'flex' }}>
                {`Sponsored by ${truncate(sponsor_name, 36)}`}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '26px' }}>
              {name && <div style={{ fontSize: '30px', color: '#EDE4D2', display: 'flex' }}>{truncate(name, 30)}</div>}
              <div style={{ fontSize: '16px', color: '#4B4440', letterSpacing: '0.03em', display: 'flex' }}>
                {`muviestars.com/laurel/${token}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H },
  )
}
