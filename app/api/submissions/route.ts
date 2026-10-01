import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseErrorMessage, parseSuccessValue } from '@/lib/parsed'
import { parseSubmission } from '@/lib/submissions'

// A rights-holder puts their own film forward. This never lists anything: an editor decides.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'auth', error: 'Sign in to put your film forward.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const parsed = parseSubmission(body)
    const parseError = parseErrorMessage(parsed)
    if (parseError) return NextResponse.json({ ok: false, reason: 'invalid', error: parseError }, { status: 400 })
    const value = parseSuccessValue(parsed)

    const { data, error } = await supabase
      .from('movie_listing_submissions')
      .insert({ ...value, user_id: user.id })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23514' && /waiting for a decision/.test(error.message ?? '')) {
        return NextResponse.json({ ok: false, reason: 'limit', error: 'You already have 5 films waiting for a decision. We will get to them, then you can add more.' }, { status: 409 })
      }
      if (error.code === '23514' && /too far ahead/.test(error.message ?? '')) {
        return NextResponse.json({ ok: false, reason: 'invalid', error: 'That release year is too far ahead. Check it and send again.' }, { status: 400 })
      }
      return NextResponse.json({ ok: false, reason: 'failed', error: 'Your film did not go through. Check your connection and tap Send again.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true, id: data.id })
  } catch {
    return NextResponse.json({ ok: false, reason: 'failed', error: 'Your film did not go through. Check your connection and tap Send again.' }, { status: 500 })
  }
}
