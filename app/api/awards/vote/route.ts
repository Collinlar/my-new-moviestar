import { createHmac } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FAILED = { ok: false, reason: 'failed', error: 'Your vote did not go through. Check your connection and tap again.' }

/**
 * A salted hash of the connection address, used only to spot coordinated voting. The address itself is
 * never stored, and the database clears the hash after 90 days. Without a secret configured, nothing is stored.
 */
function connectionHash(req: NextRequest): string | null {
  const secret = process.env.AWARDS_IP_HASH_SECRET
  if (!secret) return null
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
  if (!ip) return null
  return createHmac('sha256', secret).update(ip).digest('hex').slice(0, 32)
}

// Casts or changes a vote in a community category. Every rule is enforced by the database function.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient() as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'auth', error: 'Sign in to vote.' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const nominee = typeof body?.nominee_id === 'string' ? body.nominee_id : ''
    if (!UUID.test(nominee)) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'That film link is not valid.' }, { status: 400 })
    }

    const { data, error } = await supabase.rpc('award_cast_vote', { p_nominee: nominee, p_ip_hash: connectionHash(req) })
    if (error) {
      // The database words its refusals for the voter ("Review this movie to make your vote count.").
      if (error.code === '23514') return NextResponse.json({ ok: false, reason: 'blocked', error: error.message }, { status: 409 })
      return NextResponse.json(FAILED, { status: 500 })
    }
    return NextResponse.json({ ok: true, nomineeId: data?.nominee_id ?? nominee, changed: !!data?.changed })
  } catch {
    return NextResponse.json(FAILED, { status: 500 })
  }
}
