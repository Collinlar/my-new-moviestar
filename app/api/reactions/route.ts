import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { movie_id, reaction, rating, tags, one_liner } = body

    if (!user) {
      return NextResponse.json({ ok: true, saved: false, reason: 'not_authenticated' })
    }

    const { data: reactionRow, error: reactionError } = await supabase
      .from('movie_reactions')
      .upsert(
        {
          user_id: user.id,
          movie_id,
          reaction,
          rating: rating ?? null,
          one_liner: one_liner || null,
          status: 'published',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,movie_id' }
      )
      .select('id')
      .single()

    if (reactionError) {
      return NextResponse.json({ ok: true, saved: false, reason: 'db_error' })
    }

    if (tags && tags.length > 0 && reactionRow?.id) {
      const { data: tagRows } = await supabase
        .from('reaction_tags')
        .select('id, slug')
        .in('slug', tags)

      if (tagRows && tagRows.length > 0) {
        await supabase
          .from('movie_reaction_tags')
          .upsert(
            (tagRows as { id: string; slug: string }[]).map(t => ({
              reaction_id: reactionRow.id,
              tag_id: t.id,
            })),
            { onConflict: 'reaction_id,tag_id' }
          )
      }
    }

    // Create or return the share card for this reaction
    let shareToken: string | null = null

    if (reactionRow?.id) {
      const { data: existingCard } = await supabase
        .from('share_cards')
        .select('share_token')
        .eq('object_type', 'take')
        .eq('object_id', reactionRow.id)
        .maybeSingle()

      if (existingCard?.share_token) {
        shareToken = existingCard.share_token
      } else {
        // Generate a short opaque token from a UUID
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
    }

    return NextResponse.json({ ok: true, saved: true, shareToken })
  } catch {
    return NextResponse.json({ ok: true, saved: false })
  }
}
