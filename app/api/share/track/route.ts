import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    const { share_token, destination } = await req.json()

    if (!share_token) {
      return NextResponse.json({ ok: false })
    }

    const { data: card } = await supabase
      .from('review_share_cards')
      .select('id, reaction_id, movie_id')
      .eq('share_token', share_token)
      .maybeSingle()

    if (!card) {
      return NextResponse.json({ ok: false })
    }

    await supabase.from('share_events').insert({
      share_card_id: card.id,
      user_id: user?.id ?? null,
      destination,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
