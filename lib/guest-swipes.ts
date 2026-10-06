import type { Parsed } from '@/lib/parsed'

// Picks made in the homepage swipe preview before anyone has an account. They live in the browser only, are never
// sent anywhere until the person signs in, and then they are added to the new account and cleared.

export const GUEST_KEY = 'ms_guest_swipes'
export type GuestAction = 'seen' | 'later'
export interface GuestSwipe { id: string; a: GuestAction; at: number }

const MAX_KEPT = 120
const MAX_IMPORT = 60
const TTL_MS = 30 * 86_400_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Reader = Pick<Storage, 'getItem'>
type Writer = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** What this browser has picked so far. Anything malformed or older than 30 days is ignored. */
export function readGuestSwipes(storage: Reader | null, now = Date.now()): GuestSwipe[] {
  if (!storage) return []
  try {
    const raw = JSON.parse(storage.getItem(GUEST_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    const seen = new Set<string>()
    const out: GuestSwipe[] = []
    for (const r of raw) {
      if (!r || typeof r.id !== 'string' || !UUID.test(r.id) || (r.a !== 'seen' && r.a !== 'later')) continue
      const at = Number(r.at)
      if (!Number.isFinite(at) || now - at > TTL_MS || seen.has(r.id)) continue
      seen.add(r.id)
      out.push({ id: r.id, a: r.a, at })
    }
    return out
  } catch {
    return []
  }
}

/** Remember one pick. Picking the same film again replaces the earlier pick. */
export function writeGuestSwipe(storage: Writer | null, swipe: GuestSwipe, now = Date.now()): void {
  if (!storage) return
  try {
    const kept = readGuestSwipes(storage, now).filter((s) => s.id !== swipe.id)
    kept.push(swipe)
    storage.setItem(GUEST_KEY, JSON.stringify(kept.slice(-MAX_KEPT)))
  } catch {
    // Private windows can refuse to store. The preview still works, it just forgets.
  }
}

export function clearGuestSwipes(storage: Writer | null): void {
  try { storage?.removeItem(GUEST_KEY) } catch { /* nothing to clear */ }
}

/**
 * The films to show next: ones this browser has not picked yet. If that leaves too few to make a deck, start the
 * whole pool again rather than show an empty or one-card preview.
 */
export function pickFresh<T extends { id: string }>(pool: T[], picked: Set<string>, n: number, minimum = 3): T[] {
  const fresh = pool.filter((f) => !picked.has(f.id))
  return (fresh.length >= Math.min(minimum, pool.length) ? fresh : pool).slice(0, n)
}

/** Validates what the browser sends when someone signs in. */
export function parseGuestImport(body: any): Parsed<{ items: GuestSwipe[] }> {
  const raw = Array.isArray(body?.items) ? body.items : null
  if (!raw) return { ok: false, error: 'There is nothing to add.' }
  if (raw.length > MAX_IMPORT) return { ok: false, error: `Add ${MAX_IMPORT} films or fewer at a time.` }
  const seen = new Set<string>()
  const items: GuestSwipe[] = []
  for (const r of raw) {
    if (!r || typeof r.id !== 'string' || !UUID.test(r.id)) return { ok: false, error: 'One of those film ids is not valid.' }
    if (r.a !== 'seen' && r.a !== 'later') return { ok: false, error: 'One of those picks is not valid.' }
    if (seen.has(r.id)) continue
    seen.add(r.id)
    items.push({ id: r.id, a: r.a, at: Number(r.at) || 0 })
  }
  return { ok: true, value: { items } }
}
