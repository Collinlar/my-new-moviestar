import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SHARE_TOKEN_PATTERN, parseShareOptions } from '@/lib/share'

// Saves how a person wants their shared take to look. Only the owner of the card can change it.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'auth', error: 'Sign in to change how your take is shared.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const token = typeof body?.share_token === 'string' ? body.share_token : ''
    if (!SHARE_TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ ok: false, reason: 'bad_token', error: 'That share link is not valid.' }, { status: 400 })
    }

    const options = parseShareOptions(body)

    const { data: updated, error } = await supabase
      .from('share_cards')
      .update({ payload: options })
      .eq('share_token', token)
      .eq('user_id', user.id)
      .select('share_token')

    if (error) {
      return NextResponse.json({ ok: false, reason: 'failed', error: 'Your sharing choices did not save. Tap again.' }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ ok: false, reason: 'not_yours', error: 'You can only change cards for your own takes.' }, { status: 403 })
    }

    return NextResponse.json({ ok: true, options })
  } catch {
    return NextResponse.json({ ok: false, reason: 'failed', error: 'Your sharing choices did not save. Tap again.' }, { status: 500 })
  }
}
