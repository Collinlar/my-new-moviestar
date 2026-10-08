import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'
import { checkLinks, hasYouTubeKey } from '@/lib/youtube-server'

export const runtime = 'nodejs'
export const maxDuration = 60

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Asks YouTube about the films' links and saves what it says. One film ({ movie_id }) or a page of the whole
 * catalogue ({ all: true, after }), 100 at a time with an API key and 40 without, so one request stays inside the time
 * limit. The screen keeps calling with the returned nextCursor until it is null.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, isAdmin } = await getAdmin()
    if (!user) return NextResponse.json({ error: 'Your session timed out. Sign in again to keep going.' }, { status: 401 })
    if (!isAdmin) return NextResponse.json({ error: 'Only admins can check links.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const keyed = hasYouTubeKey()
    const pageSize = keyed ? 100 : 40

    let films: Array<{ id: string; youtube_url: string | null }> = []
    let nextCursor: string | null = null

    if (typeof body?.movie_id === 'string') {
      if (!UUID.test(body.movie_id)) return NextResponse.json({ error: 'That film id is not valid.' }, { status: 400 })
      const { data } = await supabase.from('movies').select('id, youtube_url').eq('id', body.movie_id).maybeSingle()
      if (!data) return NextResponse.json({ error: 'That film could not be found.' }, { status: 404 })
      if (!data.youtube_url?.trim()) return NextResponse.json({ error: 'This film has no YouTube link to check. Add one and save first.' }, { status: 400 })
      films = [data]
    } else if (body?.all === true) {
      const after = typeof body.after === 'string' && UUID.test(body.after) ? body.after : null
      let q = supabase.from('movies').select('id, youtube_url').not('youtube_url', 'is', null).neq('youtube_url', '').order('id', { ascending: true }).limit(pageSize + 1)
      if (after) q = q.gt('id', after)
      const { data, error } = await q
      if (error) return NextResponse.json({ error: 'The films could not be read. Try again in a moment.' }, { status: 502 })
      films = (data ?? []).slice(0, pageSize)
      if ((data ?? []).length > pageSize) nextCursor = films[films.length - 1].id
    } else {
      return NextResponse.json({ error: 'Say which film to check, or ask for all of them.' }, { status: 400 })
    }

    const { results, source } = await checkLinks(films.map((f) => ({ movieId: f.id, url: f.youtube_url })))

    const now = new Date().toISOString()
    const rows = results.filter((r) => r.facts).map((r) => ({ movie_id: r.movieId, ...r.facts, checked_at: now }))
    if (rows.length) {
      const { error } = await supabase.from('movie_watch_checks').upsert(rows, { onConflict: 'movie_id' })
      if (error) {
        console.error('[watch-checks] save failed:', error)
        const missing = error.code === '42P01' || /movie_watch_checks/.test(error.message ?? '')
        return NextResponse.json({
          error: missing
            ? 'Link checks are not set up on this database yet. Run 20261001000013_watch_checks.sql in the Supabase SQL editor, then try again.'
            : 'The answers came back but did not save. Try again.',
        }, { status: missing ? 503 : 502 })
      }
    }

    const count = (state: string) => rows.filter((r: any) => r.state === state).length
    return NextResponse.json({
      ok: true, source, hasKey: keyed,
      checked: rows.length, unreachable: results.length - rows.length,
      ok_count: count('ok'), ghana_blocked: count('ghana_blocked'), gone: count('gone'), not_a_video: count('not_a_video'),
      nextCursor,
      check: films.length === 1 ? rows[0] ?? null : undefined,
    })
  } catch (e) {
    console.error('[watch-checks] failed:', e)
    return NextResponse.json({ error: 'Something on our side stopped that. Nothing was changed. Try again in a moment.' }, { status: 500 })
  }
}
