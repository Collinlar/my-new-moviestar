import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { movie_id, interaction_type } = body

    if (!user) {
      return NextResponse.json({ ok: true, saved: false, reason: 'not_authenticated' })
    }

    // Watch later reuses the existing watchlists table
    if (interaction_type === 'watch_later') {
      await supabase
        .from('watchlists')
        .upsert({ movie_id, user_id: user.id }, { onConflict: 'movie_id,user_id' })
      return NextResponse.json({ ok: true, saved: true })
    }

    // All other interactions go to movie_interactions
    await supabase
      .from('movie_interactions')
      .insert({
        user_id: user.id,
        movie_id,
        interaction_type,
        source: 'swipe',
      })

    return NextResponse.json({ ok: true, saved: true })
  } catch {
    return NextResponse.json({ ok: true, saved: false })
  }
}
