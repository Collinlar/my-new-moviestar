import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseGuestImport } from '@/lib/guest-swipes'
import { parseErrorMessage, parseSuccessValue } from '@/lib/parsed'

/**
 * Brings the picks someone made in the homepage swipe preview into their new account.
 * "Haven't seen it" goes to their watch-later list. "Seen it" is marked as seen, so Swipe will not show the film
 * again and it appears under "finish your take". Only listed films count, and nothing already rated is touched.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Sign in first, then your picks come across.' }, { status: 401 })

    const parsed = parseGuestImport(await req.json().catch(() => null))
    const bad = parseErrorMessage(parsed)
    if (bad) return NextResponse.json({ ok: false, error: bad }, { status: 400 })
    const { items } = parseSuccessValue(parsed)
    if (items.length === 0) return NextResponse.json({ ok: true, later: 0, seen: 0, skipped: 0 })

    const ids = items.map((i) => i.id)
    const [{ data: listed }, { data: reacted }, { data: already }, { data: onList }] = await Promise.all([
      supabase.from('movies').select('id').in('id', ids).eq('listing_status', 'approved'),
      supabase.from('movie_reactions').select('movie_id').eq('user_id', user.id).in('movie_id', ids),
      supabase.from('movie_interactions').select('movie_id').eq('user_id', user.id).eq('interaction_type', 'seen').in('movie_id', ids),
      supabase.from('watchlists').select('movie_id').eq('user_id', user.id).in('movie_id', ids),
    ])
    const ok = new Set(((listed ?? []) as Array<{ id: string }>).map((m) => m.id))
    const rated = new Set(((reacted ?? []) as Array<{ movie_id: string }>).map((m) => m.movie_id))
    const marked = new Set(((already ?? []) as Array<{ movie_id: string }>).map((m) => m.movie_id))
    const listedAlready = new Set(((onList ?? []) as Array<{ movie_id: string }>).map((m) => m.movie_id))

    const later = items.filter((i) => i.a === 'later' && ok.has(i.id) && !rated.has(i.id) && !listedAlready.has(i.id))
    const seen = items.filter((i) => i.a === 'seen' && ok.has(i.id) && !rated.has(i.id) && !marked.has(i.id))

    if (later.length) {
      await supabase.from('watchlists').upsert(later.map((i) => ({ user_id: user.id, movie_id: i.id })), { onConflict: 'movie_id,user_id' })
    }
    if (seen.length) {
      await supabase.from('movie_interactions').insert(
        seen.map((i) => ({ user_id: user.id, movie_id: i.id, interaction_type: 'seen', source: 'hero_guest' })),
      )
    }
    return NextResponse.json({ ok: true, later: later.length, seen: seen.length, skipped: items.length - later.length - seen.length })
  } catch {
    return NextResponse.json({ ok: false, error: 'We could not add your picks just now. They stay on this device and we will try again.' }, { status: 500 })
  }
}
