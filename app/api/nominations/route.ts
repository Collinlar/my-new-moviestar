import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseErrorMessage, parseSuccessValue } from '@/lib/parsed'
import { parseNomination } from '@/lib/submissions'

const FAILED = { ok: false, reason: 'failed', error: 'That nomination did not go through. Check your connection and tap again.' }

// Nominate a film for listing, or take the nomination back. Nominations are a signal to editors, nothing more.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'auth', error: 'Sign in to nominate a film.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const withdraw = body?.action === 'withdraw'
    const parsed = parseNomination(body)
    const parseError = parseErrorMessage(parsed)
    if (parseError) return NextResponse.json({ ok: false, reason: 'invalid', error: parseError }, { status: 400 })
    const value = parseSuccessValue(parsed)

    if (withdraw) {
      if (value.kind !== 'catalogue') {
        return NextResponse.json({ ok: false, reason: 'invalid', error: 'Open the film to take your nomination back.' }, { status: 400 })
      }
      const { error } = await supabase.from('movie_nominations').delete().eq('user_id', user.id).eq('movie_id', value.movie_id)
      if (error) return NextResponse.json(FAILED, { status: 500 })
      return NextResponse.json({ ok: true, nominated: false })
    }

    const row = value.kind === 'catalogue'
      ? { user_id: user.id, movie_id: value.movie_id, reason: value.reason }
      : { user_id: user.id, title: value.title, release_year: value.release_year, link: value.link, reason: value.reason }

    const { error } = await supabase.from('movie_nominations').insert(row)
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, nominated: true, already: true })
      }
      if (error.code === '23514') {
        const msg = error.message ?? ''
        const text = /already listed/.test(msg)
          ? 'That film is already listed on MuvieStars.'
          : /10 nominations/.test(msg)
            ? 'You have made 10 nominations today. Come back tomorrow for more.'
            : 'That film is not open for nominations.'
        return NextResponse.json({ ok: false, reason: 'closed', error: text }, { status: 409 })
      }
      return NextResponse.json(FAILED, { status: 500 })
    }
    return NextResponse.json({ ok: true, nominated: true })
  } catch {
    return NextResponse.json(FAILED, { status: 500 })
  }
}
