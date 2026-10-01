import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'
import { GENRES, INDUSTRIES } from '@/lib/utils'
import { REJECTION_REASONS } from '@/lib/listing'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isYouTube = (u: string) => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(u)
const FAILED = { ok: false, error: 'That did not go through. Check your connection and tap again.' }

// An editor decides on a submission. Accepting one adds the film to the listing queue as "submitted".
// It is not listed until it passes the same checks as every other film.
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, isAdmin } = await getAdmin()
    if (!user) return NextResponse.json({ ok: false, error: 'Sign in again to carry on.' }, { status: 401 })
    if (!isAdmin) return NextResponse.json({ ok: false, error: 'Only editors can decide on submissions.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    const action = body?.action
    const note = typeof body?.note === 'string' ? body.note.trim().slice(0, 500) : ''
    if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'That submission link is not valid.' }, { status: 400 })

    const { data: sub } = await supabase.from('movie_listing_submissions').select('*').eq('id', id).maybeSingle()
    if (!sub) return NextResponse.json({ ok: false, error: 'That submission was not found.' }, { status: 404 })
    if (sub.status === 'accepted' || sub.status === 'declined') {
      return NextResponse.json({ ok: false, error: 'That submission already has a decision.' }, { status: 409 })
    }

    const stamp = { reviewed_by: user.id, reviewed_at: new Date().toISOString() }

    if (action === 'needs_information') {
      if (!note) return NextResponse.json({ ok: false, error: 'Tell the submitter what you need from them. They will see this.' }, { status: 400 })
      const { error } = await supabase.from('movie_listing_submissions').update({ status: 'needs_information', public_note: note, ...stamp }).eq('id', id)
      if (error) return NextResponse.json(FAILED, { status: 500 })
      return NextResponse.json({ ok: true, status: 'needs_information' })
    }

    if (action === 'decline') {
      const reason = REJECTION_REASONS.find((r) => r.key === body?.reason)?.key
      if (!reason) return NextResponse.json({ ok: false, error: 'Pick a reason for turning this film down.' }, { status: 400 })
      const { error } = await supabase.from('movie_listing_submissions').update({ status: 'declined', decline_reason: reason, public_note: note || null, ...stamp }).eq('id', id)
      if (error) return NextResponse.json(FAILED, { status: 500 })
      return NextResponse.json({ ok: true, status: 'declined' })
    }

    if (action === 'accept') {
      const genre = GENRES.includes(body?.genre) ? body.genre : null
      if (!genre) return NextResponse.json({ ok: false, error: 'Pick the film\'s genre before adding it to the queue.' }, { status: 400 })
      const industry = (INDUSTRIES as readonly string[]).includes(body?.industry) ? body.industry : null

      const youtube = isYouTube(sub.evidence_url)
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .insert({
          title: sub.title,
          release_year: sub.release_year,
          country: sub.country,
          director: sub.director,
          description: sub.synopsis,
          synopsis: sub.synopsis,
          poster_url: sub.poster_url,
          genre,
          ...(industry ? { industry } : {}),
          youtube_url: youtube ? sub.evidence_url : '',
          streaming_links: youtube ? [] : [{ platform: 'Website', url: sub.evidence_url, free: false }],
          created_source: 'user_submission',
          listing_status: 'submitted',
        })
        .select('id')
        .single()
      if (movieError || !movie) {
        return NextResponse.json({ ok: false, error: `The film could not be added to the queue${movieError?.message ? `: ${movieError.message}` : '.'}` }, { status: 500 })
      }

      const { error } = await supabase
        .from('movie_listing_submissions')
        .update({ status: 'accepted', movie_id: movie.id, public_note: note || 'Your film is in our listing queue. An editor is checking it against the listing rules.', ...stamp })
        .eq('id', id)
      if (error) {
        // Do not leave a film in the queue that the submission does not point to.
        await supabase.from('movies').delete().eq('id', movie.id)
        return NextResponse.json(FAILED, { status: 500 })
      }
      return NextResponse.json({ ok: true, status: 'accepted', movie_id: movie.id })
    }

    return NextResponse.json({ ok: false, error: 'Pick what to do with this submission.' }, { status: 400 })
  } catch {
    return NextResponse.json(FAILED, { status: 500 })
  }
}
