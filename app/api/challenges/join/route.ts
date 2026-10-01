import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Join or step out of a challenge. The database decides whether the challenge is open.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'auth', error: 'Sign in to join this challenge.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const challengeId = typeof body?.challenge_id === 'string' ? body.challenge_id : ''
    const action = body?.action === 'leave' ? 'leave' : 'join'
    if (!UUID.test(challengeId)) {
      return NextResponse.json({ ok: false, reason: 'bad_challenge', error: 'That challenge link is not valid.' }, { status: 400 })
    }

    if (action === 'leave') {
      const { error } = await supabase.from('challenge_joins').delete().eq('challenge_id', challengeId).eq('user_id', user.id)
      if (error) {
        return NextResponse.json({ ok: false, reason: 'failed', error: 'That did not go through. Check your connection and tap again.' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, joined: false })
    }

    const { error } = await supabase.from('challenge_joins').insert({ challenge_id: challengeId, user_id: user.id })
    if (error) {
      // Already in is fine: the person ends up where they wanted to be.
      if (error.code === '23505') return NextResponse.json({ ok: true, joined: true })
      if (error.code === '23514') {
        const ended = /ended/i.test(error.message ?? '')
        return NextResponse.json(
          { ok: false, reason: ended ? 'ended' : 'closed', error: ended ? 'This challenge has ended. Have a look at what is open now.' : 'This challenge is not open yet.' },
          { status: 409 },
        )
      }
      return NextResponse.json({ ok: false, reason: 'failed', error: 'That did not go through. Check your connection and tap again.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, joined: true })
  } catch {
    return NextResponse.json({ ok: false, reason: 'failed', error: 'That did not go through. Check your connection and tap again.' }, { status: 500 })
  }
}
