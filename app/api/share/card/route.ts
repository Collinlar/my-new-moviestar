import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SHARE_TOKEN_PATTERN, parseShareOptions } from '@/lib/share'

// What a card currently shows. Share cards are public, so anyone with the token can read this.
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token') ?? ''
    if (!SHARE_TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ ok: false, reason: 'bad_token', error: 'That share link is not valid.' }, { status: 400 })
    }
    const supabase = await createClient() as any
    const { data: card } = await supabase.from('share_cards').select('payload').eq('share_token', token).maybeSingle()
    if (!card) return NextResponse.json({ ok: false, reason: 'not_found', error: 'That share card was not found.' }, { status: 404 })
    return NextResponse.json({ ok: true, options: parseShareOptions(card.payload) })
  } catch {
    return NextResponse.json({ ok: false, reason: 'failed', error: 'We could not load your sharing choices.' }, { status: 500 })
  }
}

// Saves how a person wants their shared take to look. Only the owner of the card can change it.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'auth', error: 'Sign in to change how your card is shared.' }, { status: 401 })
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
      return NextResponse.json({ ok: false, reason: 'not_yours', error: 'You can only change your own share cards.' }, { status: 403 })
    }

    return NextResponse.json({ ok: true, options })
  } catch {
    return NextResponse.json({ ok: false, reason: 'failed', error: 'Your sharing choices did not save. Tap again.' }, { status: 500 })
  }
}
