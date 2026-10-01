import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Link unfurlers and crawlers that might still run JavaScript.
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|telegram|curl|headless|lighthouse/i

export async function POST(req: NextRequest) {
  try {
    if (BOT.test(req.headers.get('user-agent') ?? '')) return NextResponse.json({ ok: true, counted: false })

    const { token, referrer } = await req.json()
    if (typeof token !== 'string' || token.length < 4 || token.length > 40) {
      return NextResponse.json({ ok: false })
    }

    const supabase = await createClient() as any
    const [{ data: card }, { data: { user } }] = await Promise.all([
      supabase.from('share_cards').select('id, user_id').eq('share_token', token).maybeSingle(),
      supabase.auth.getUser(),
    ])
    if (!card) return NextResponse.json({ ok: false })

    // Looking at your own card is not a visit.
    if (user && card.user_id === user.id) return NextResponse.json({ ok: true, counted: false })

    let referrerHost: string | null = null
    if (typeof referrer === 'string' && referrer) {
      try { referrerHost = new URL(referrer).hostname.slice(0, 100) } catch {}
    }

    const { error } = await supabase.from('share_visits').insert({
      share_card_id: card.id,
      referrer_host: referrerHost,
      viewer_id: user?.id ?? null,
    })
    return NextResponse.json({ ok: !error, counted: !error })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
