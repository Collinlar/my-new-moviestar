import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()

    const body = await req.json()
    const { movie_id, reaction, tags, one_liner } = body

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

    return NextResponse.json({ ok: true, saved: true })
  } catch {
    return NextResponse.json({ ok: true, saved: false })
  }
}
