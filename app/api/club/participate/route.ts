import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
    }

    const { movie_id, status } = await req.json()

    if (!movie_id || !['interested', 'watching', 'completed'].includes(status)) {
      return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 })
    }

    const update: Record<string, unknown> = {
      user_id: user.id,
      movie_id,
      status,
    }

    if (status === 'completed') {
      update.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('club_participation')
      .upsert(update, { onConflict: 'user_id,movie_id' })

    if (error) {
      return NextResponse.json({ ok: false, reason: 'db_error' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, status })
  } catch {
    return NextResponse.json({ ok: false, reason: 'server_error' }, { status: 500 })
  }
}
