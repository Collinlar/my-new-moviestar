import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'
import { parseImageRequest, SPECS, copyPath, type ImageKind } from '@/lib/images'
import { processImage, ImageProblem } from '@/lib/images-server'
import { parseErrorMessage, parseSuccessValue } from '@/lib/parsed'

export const runtime = 'nodejs'
export const maxDuration = 30

const BUCKET = 'posters'

const publicUrl = (supabase: any, path: string): string => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

/**
 * Makes the sized copies of an uploaded poster or banner. The browser sends the original straight to storage (a phone
 * photo or a scan can be far over the 4.5 MB a request body may carry), then asks here to crop, resize and save it.
 * Also puts the old link back when an uploaded picture is removed.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, isAdmin } = await getAdmin()
    if (!user) return NextResponse.json({ error: 'Your session timed out. Sign in again to keep going.' }, { status: 401 })
    if (!isAdmin) return NextResponse.json({ error: 'Only admins can change pictures.' }, { status: 403 })

    const parsed = parseImageRequest(await req.json().catch(() => null))
    const bad = parseErrorMessage(parsed)
    if (bad) return NextResponse.json({ error: bad }, { status: 400 })
    const r = parseSuccessValue(parsed)
    const kind: ImageKind = r.kind

    const { data: film } = await supabase.from('movies').select('id, poster_url, poster_path, banner_path').eq('id', r.movieId).maybeSingle()
    if (!film) return NextResponse.json({ error: 'That film could not be found.' }, { status: 404 })

    // ---- remove an uploaded picture and go back to the link it replaced ----
    if (r.action === 'remove') {
      const { data: last } = await supabase.from('movie_images').select('id, previous_url').eq('movie_id', r.movieId).eq('kind', kind).is('removed_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
      const patch = kind === 'poster'
        ? { poster_url: last?.previous_url ?? film.poster_url, poster_path: null, poster_sm_url: null, poster_lg_url: null, poster_blur: null, poster_color: null, poster_focus_x: null, poster_focus_y: null }
        : { banner_url: null, banner_path: null, banner_blur: null, banner_color: null, banner_focus_x: null, banner_focus_y: null }
      const { error } = await supabase.from('movies').update(patch).eq('id', r.movieId)
      if (error) return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 500 })
      await supabase.from('movie_images').update({ removed_at: new Date().toISOString() }).eq('movie_id', r.movieId).eq('kind', kind).is('removed_at', null)
      return NextResponse.json({ ok: true })
    }

    // ---- make the copies ----
    const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(r.originalPath)
    if (dlError || !blob) return NextResponse.json({ error: 'The uploaded picture could not be found. Choose it again.' }, { status: 400 })
    const original = Buffer.from(await blob.arrayBuffer())

    let made
    try {
      made = await processImage(original, kind, r.crop, r.quality)
    } catch (e) {
      if (e instanceof ImageProblem) return NextResponse.json({ error: e.message }, { status: 400 })
      throw e
    }

    const urls: Record<string, string> = {}
    const paths: Record<string, string> = {}
    const bytes: Record<string, number> = {}
    for (const c of made.copies) {
      const path = copyPath(r.movieId, kind, made.fingerprint, c.key)
      const { error } = await supabase.storage.from(BUCKET).upload(path, c.buf, { contentType: 'image/webp', cacheControl: '31536000', upsert: true })
      if (error) return NextResponse.json({ error: 'The picture could not be saved. Check your connection and try again.' }, { status: 502 })
      urls[c.key] = publicUrl(supabase, path); paths[c.key] = path; bytes[c.key] = c.buf.length
    }

    const primary = SPECS[kind].primary
    const main = urls[primary] ?? Object.values(urls)[0]
    const mainPath = paths[primary] ?? Object.values(paths)[0]

    // What this replaced, so removing the upload can put it back. Only remembered for the first upload.
    const { data: prior } = await supabase.from('movie_images').select('previous_url').eq('movie_id', r.movieId).eq('kind', kind).is('removed_at', null).order('created_at', { ascending: false }).limit(1).maybeSingle()
    const previousUrl = kind === 'poster' ? (film.poster_path ? prior?.previous_url ?? null : film.poster_url ?? null) : null

    const patch = kind === 'poster'
      ? { poster_url: main, poster_path: mainPath, poster_sm_url: urls.sm ?? null, poster_lg_url: urls.lg ?? null, poster_blur: made.blur, poster_color: made.color, poster_focus_x: r.focus.x, poster_focus_y: r.focus.y }
      : { banner_url: main, banner_path: mainPath, banner_blur: made.blur, banner_color: made.color, banner_focus_x: r.focus.x, banner_focus_y: r.focus.y }
    const { data: updated, error: upError } = await supabase.from('movies').update(patch).eq('id', r.movieId).select('id')
    if (upError || !updated || updated.length === 0) return NextResponse.json({ error: 'The copies were made but the film did not update. Your admin access may be missing. Try again.' }, { status: 403 })

    await supabase.from('movie_images').insert({
      movie_id: r.movieId, kind, original_path: r.originalPath, paths, bytes, src_width: made.source.width, src_height: made.source.height,
      crop: r.crop, focus: r.focus, quality: r.quality, previous_url: previousUrl, created_by: user.id,
    })

    return NextResponse.json({ ok: true, url: main, bytes, color: made.color, crop: made.rect, source: made.source })
  } catch (e) {
    console.error('[images] the poster route failed:', e)
    return NextResponse.json({ error: 'Something on our side stopped that. Nothing was changed. Try again in a moment.' }, { status: 500 })
  }
}
