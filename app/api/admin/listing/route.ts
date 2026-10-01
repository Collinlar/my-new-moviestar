import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'
import { missingHard, parseCountryFill, parseDecision, parseFieldUpdate, type QueueRow } from '@/lib/listing'
import { parseErrorMessage, parseSuccessValue } from '@/lib/parsed'

const NO_PERMISSION =
  'No films were changed. Your account may not be allowed to edit films. Ask the site owner to check your admin access.'

export async function POST(req: NextRequest) {
  try {
    const { supabase, user, isAdmin } = await getAdmin()
    if (!user) return NextResponse.json({ error: 'Your session timed out. Sign in again to keep going.' }, { status: 401 })
    if (!isAdmin) return NextResponse.json({ error: 'Only admins can decide on listings.' }, { status: 403 })

    const body = await req.json()

    // ---- fix a blocking field without leaving the queue -----------------------------------
    if (body?.action === 'update_fields') {
      const parsed = parseFieldUpdate(body)
      const fieldError = parseErrorMessage(parsed)
      if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 })
      const fieldUpdate = parseSuccessValue(parsed)

      const { data, error } = await supabase
        .from('movies')
        .update(fieldUpdate.patch)
        .eq('id', fieldUpdate.id)
        .select('id')
      if (error) return NextResponse.json({ error: 'That did not save. Check the details and try again.' }, { status: 500 })
      if (!data || data.length === 0) return NextResponse.json({ error: NO_PERMISSION }, { status: 403 })
      return NextResponse.json({ ok: true })
    }

    // ---- fill a missing country on many films at once ----------------------------------
    if (body?.action === "set_country") {
      const parsed = parseCountryFill(body)
      const countryError = parseErrorMessage(parsed)
      if (countryError) return NextResponse.json({ error: countryError }, { status: 400 })
      const countryFill = parseSuccessValue(parsed)

      const { data, error } = await supabase
        .from("movies")
        .update({ country: countryFill.country })
        .in("id", countryFill.ids)
        .or("country.is.null,country.eq.")
        .select("id")
      if (error) return NextResponse.json({ error: "That did not save. Try again." }, { status: 500 })
      return NextResponse.json({ ok: true, updated: data?.length ?? 0, skipped: countryFill.ids.length - (data?.length ?? 0) })
    }

    // ---- listing decisions ----------------------------------------------------------------
    const parsed = parseDecision(body)
    const decisionError = parseErrorMessage(parsed)
    if (decisionError) return NextResponse.json({ error: decisionError }, { status: 400 })
    const d = parseSuccessValue(parsed)

    let allowedIds = d.ids
    const skipped: Array<{ id: string; title: string; missing: string[] }> = []

    if (d.status === 'approved') {
      // The database decides what "ready" means, so the screen and this check cannot disagree.
      const { data: rows, error } = await supabase
        .from('movie_listing_queue_scored')
        .select('id, title, hard_ready, ok_title, ok_year, ok_country, ok_synopsis, ok_poster, ok_evidence, ok_credits, ok_clean_title')
        .in('id', d.ids)
      if (error) return NextResponse.json({ error: 'Could not check these films. Try again.' }, { status: 500 })

      const byId = new Map<string, QueueRow>((rows ?? []).map((r: QueueRow) => [r.id, r]))
      allowedIds = []
      for (const id of d.ids) {
        const row = byId.get(id)
        if (!row) skipped.push({ id, title: 'Unknown film', missing: ['Film not found'] })
        else if (!row.hard_ready) skipped.push({ id, title: row.title, missing: missingHard(row) })
        else allowedIds.push(id)
      }
    }

    if (allowedIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0, skipped })
    }

    const patch: Record<string, unknown> = {
      listing_status: d.status,
      listing_reviewed_at: new Date().toISOString(),
      listing_reviewed_by: user.id,
      listing_rejection_reason: d.reason,
      listing_notes: d.note,
    }
    if (d.whyListed) patch.why_listed = d.whyListed

    const { data: updated, error } = await supabase
      .from('movies')
      .update(patch)
      .in('id', allowedIds)
      .select('id')
    if (error) return NextResponse.json({ error: 'That did not save. Try again.' }, { status: 500 })
    if (!updated || updated.length === 0) return NextResponse.json({ error: NO_PERMISSION }, { status: 403 })

    return NextResponse.json({ ok: true, updated: updated.length, skipped })
  } catch {
    return NextResponse.json({ error: 'That did not go through. Check your connection and try again.' }, { status: 500 })
  }
}
