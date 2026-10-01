import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseTake } from '@/lib/reactions'
import { parseErrorMessage, parseSuccessValue } from '@/lib/parsed'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ReviewOutcome = 'submitted' | 'updated' | 'unchanged' | null

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const movie_id = body?.movie_id

    if (!user) {
      return NextResponse.json({ ok: true, saved: false, reason: 'not_authenticated' })
    }
    if (typeof movie_id !== 'string' || !UUID.test(movie_id)) {
      return NextResponse.json({ ok: false, saved: false, reason: 'bad_movie' }, { status: 400 })
    }

    const parsed = parseTake(body)
    const parseError = parseErrorMessage(parsed)
    if (parseError) {
      return NextResponse.json({ ok: false, saved: false, reason: 'invalid', error: parseError }, { status: 400 })
    }
    const { reaction, rating, tags, one_liner, review_text } = parseSuccessValue(parsed)

    const { data: reactionRow, error: reactionError } = await supabase
      .from('movie_reactions')
      .upsert(
        {
          user_id: user.id,
          movie_id,
          reaction,
          rating,
          one_liner,
          status: 'published',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,movie_id' }
      )
      .select('id')
      .single()

    if (reactionError || !reactionRow?.id) {
      return NextResponse.json({ ok: true, saved: false, reason: 'db_error' })
    }

    // Tags are replaced, not just added to, so a deselected tag really goes away.
    await supabase.from('movie_reaction_tags').delete().eq('reaction_id', reactionRow.id)
    if (tags.length > 0) {
      const { data: tagRows } = await supabase.from('reaction_tags').select('id, slug').in('slug', tags)
      if (tagRows && tagRows.length > 0) {
        await supabase
          .from('movie_reaction_tags')
          .insert((tagRows as { id: string; slug: string }[]).map((t) => ({ reaction_id: reactionRow.id, tag_id: t.id })))
      }
    }

    // A longer review is optional. It goes through moderation like any full review.
    let review: ReviewOutcome = null
    if (review_text && rating) {
      const { data: existing } = await supabase
        .from('reviews')
        .select('id, rating, content')
        .eq('movie_id', movie_id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!existing) {
        const { error } = await supabase
          .from('reviews')
          .insert({ movie_id, user_id: user.id, rating, content: review_text, status: 'pending' })
        review = error ? null : 'submitted'
      } else if (existing.content !== review_text) {
        const { error } = await supabase
          .from('reviews')
          .update({ rating, content: review_text, status: 'pending' })
          .eq('id', existing.id)
        review = error ? null : 'updated'
      } else {
        // Same words: only a changed star rating needs carrying over, and that needs no re-approval.
        if (existing.rating !== rating) await supabase.from('reviews').update({ rating }).eq('id', existing.id)
        review = 'unchanged'
      }
    }

    // Create or return the share card for this take
    let shareToken: string | null = null
    const { data: existingCard } = await supabase
      .from('share_cards')
      .select('share_token')
      .eq('object_type', 'take')
      .eq('object_id', reactionRow.id)
      .maybeSingle()

    if (existingCard?.share_token) {
      shareToken = existingCard.share_token
    } else {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      const { data: newCard } = await supabase
        .from('share_cards')
        .insert({
          object_type: 'take',
          object_id: reactionRow.id,
          reaction_id: reactionRow.id,
          user_id: user.id,
          movie_id,
          share_token: token,
        })
        .select('share_token')
        .single()
      shareToken = newCard?.share_token ?? null
    }

    // Did this take finish a challenge? The database awards laurels, so just ask what is new.
    let completed: Array<{ slug: string; title: string }> = []
    try {
      const { data: fresh } = await supabase
        .from('challenge_completions')
        .select('completed_at, challenge:challenges(slug, title)')
        .eq('user_id', user.id)
        .gte('completed_at', new Date(Date.now() - 60_000).toISOString())
      completed = ((fresh ?? []) as any[]).filter((r) => r.challenge).map((r) => ({ slug: r.challenge.slug, title: r.challenge.title }))
    } catch {
      // The take is saved either way.
    }

    return NextResponse.json({ ok: true, saved: true, shareToken, review, completed })
  } catch {
    return NextResponse.json({ ok: true, saved: false })
  }
}
