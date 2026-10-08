import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Adds one view or one tap to a live Spotlight's daily count. It stores nothing about the visitor: the database adds 1 to
 * the day's total, and ignores a Spotlight that is not live right now. It always answers 204, so a count that did not
 * land never looks like an error to the visitor.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const id = typeof body?.id === 'string' ? body.id : ''
    const kind = body?.kind
    if (UUID.test(id) && (kind === 'view' || kind === 'tap')) {
      const supabase = (await createClient()) as any
      await supabase.rpc('spotlight_count', { p_spotlight: id, p_kind: kind })
    }
  } catch (e) {
    console.error('[spotlight] count failed:', e)
  }
  return new NextResponse(null, { status: 204 })
}
