import type { Parsed } from '@/lib/parsed'

// The Spotlight: one listed film put at the top of the homepage for a set time. Editorial only, so there is no sponsor or
// price here. Pure rules, shared by the admin screen, the homepage and the tests.

export type Audience = 'everyone' | 'signed_out' | 'signed_in'
export type CtaKind = 'film' | 'watch'
export type SpotlightStatus = 'draft' | 'published'
export type SpotlightState = 'draft' | 'scheduled' | 'live' | 'ended'

export interface SpotlightRow {
  id: string
  movie_id: string
  headline: string
  line: string | null
  cta_kind: CtaKind
  audience: Audience
  starts_at: string
  ends_at: string
  priority: number
  status: SpotlightStatus
}

export const LIMITS = { headline: 80, headlineMin: 3, line: 160, maxDays: 60, maxPriority: 10 }

export const AUDIENCES: Array<{ value: Audience; label: string; help: string }> = [
  { value: 'everyone', label: 'Everyone', help: 'Visitors and signed-in members' },
  { value: 'signed_out', label: 'Visitors only', help: 'People who are not signed in. A good place to introduce the platform.' },
  { value: 'signed_in', label: 'Members only', help: 'People who are signed in' },
]

export const CTAS: Array<{ value: CtaKind; label: string; help: string }> = [
  { value: 'film', label: 'See the film', help: 'Opens the film page' },
  { value: 'watch', label: 'Where to watch', help: 'Opens the film page at where to watch it' },
]

export const ctaLabel = (kind: CtaKind): string => CTAS.find((c) => c.value === kind)?.label ?? 'See the film'
export const ctaHref = (kind: CtaKind, movieId: string): string => (kind === 'watch' ? `/movie/${movieId}#where-to-watch` : `/movie/${movieId}`)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DAY_MS = 86_400_000

export interface SpotlightInput {
  movie_id: string
  headline: string
  line: string | null
  cta_kind: CtaKind
  audience: Audience
  starts_at: string
  ends_at: string
  priority: number
}

/** Checks what the admin typed, with a message that says what to fix. Dates come in as ISO strings. */
export function parseSpotlight(raw: any): Parsed<SpotlightInput> {
  const movie_id = typeof raw?.movie_id === 'string' ? raw.movie_id : ''
  if (!UUID.test(movie_id)) return { ok: false, error: 'Pick the film this Spotlight is for.' }
  const headline = String(raw?.headline ?? '').replace(/\s+/g, ' ').trim()
  if (headline.length < LIMITS.headlineMin) return { ok: false, error: 'Write a headline. A few words is enough.' }
  if (headline.length > LIMITS.headline) return { ok: false, error: `The headline is ${headline.length} characters. Keep it to ${LIMITS.headline} or fewer.` }
  const line = String(raw?.line ?? '').replace(/\s+/g, ' ').trim()
  if (line.length > LIMITS.line) return { ok: false, error: `The line under it is ${line.length} characters. Keep it to ${LIMITS.line} or fewer.` }
  const cta_kind = raw?.cta_kind
  if (cta_kind !== 'film' && cta_kind !== 'watch') return { ok: false, error: 'Choose where the button goes.' }
  const audience = raw?.audience
  if (audience !== 'everyone' && audience !== 'signed_out' && audience !== 'signed_in') return { ok: false, error: 'Choose who sees it.' }
  const s = Date.parse(raw?.starts_at), e = Date.parse(raw?.ends_at)
  if (Number.isNaN(s)) return { ok: false, error: 'Set when it starts.' }
  if (Number.isNaN(e)) return { ok: false, error: 'Set when it ends.' }
  if (e <= s) return { ok: false, error: 'It has to end after it starts.' }
  if (e - s > LIMITS.maxDays * DAY_MS) return { ok: false, error: `A Spotlight can run for at most ${LIMITS.maxDays} days. A shorter run keeps it special.` }
  const p = Number(raw?.priority ?? 0)
  const priority = Number.isFinite(p) ? Math.min(LIMITS.maxPriority, Math.max(0, Math.round(p))) : 0
  return { ok: true, value: { movie_id, headline, line: line || null, cta_kind, audience, starts_at: new Date(s).toISOString(), ends_at: new Date(e).toISOString(), priority } }
}

export function stateOf(row: Pick<SpotlightRow, 'status' | 'starts_at' | 'ends_at'>, now: number = Date.now()): SpotlightState {
  if (row.status !== 'published') return 'draft'
  if (now >= Date.parse(row.ends_at)) return 'ended'
  if (now < Date.parse(row.starts_at)) return 'scheduled'
  return 'live'
}

/** Does this Spotlight show to this visitor? */
export const showsTo = (audience: Audience, signedIn: boolean): boolean => audience === 'everyone' || (audience === 'signed_in' ? signedIn : !signedIn)

/** Audiences that can see the same visitor, so two Spotlights that share one can compete. */
export const audiencesCompete = (a: Audience, b: Audience): boolean => a === 'everyone' || b === 'everyone' || a === b

/** The Spotlights live for this visitor, in the order they would be shown: higher priority first, then the one that started later. */
export function sortLive<T extends SpotlightRow>(rows: T[], signedIn: boolean, now: number = Date.now()): T[] {
  const live = rows.filter((r) => stateOf(r, now) === 'live' && showsTo(r.audience, signedIn))
  return live.sort((a, b) => b.priority - a.priority || Date.parse(b.starts_at) - Date.parse(a.starts_at))
}

/** Only one Spotlight shows at a time. */
export const pickLive = <T extends SpotlightRow>(rows: T[], signedIn: boolean, now: number = Date.now()): T | null => sortLive(rows, signedIn, now)[0] ?? null

/** Other published Spotlights that run at the same time for some of the same people. Used to warn, not to block. */
export function overlapping<T extends SpotlightRow>(candidate: Pick<SpotlightRow, 'id' | 'audience' | 'starts_at' | 'ends_at'>, rows: T[]): T[] {
  const s = Date.parse(candidate.starts_at), e = Date.parse(candidate.ends_at)
  return rows.filter((r) => r.id !== candidate.id && r.status === 'published' && audiencesCompete(r.audience, candidate.audience) && Date.parse(r.starts_at) < e && Date.parse(r.ends_at) > s)
}

// ---- Ghana time ----------------------------------------------------------------------------------------------
// Ghana is on UTC all year with no daylight saving, so a time typed in a datetime-local box is read as UTC.

/** ISO string to the "2026-10-08T14:30" a datetime-local box wants. */
export const toLocalInput = (iso: string): string => (Number.isNaN(Date.parse(iso)) ? '' : new Date(iso).toISOString().slice(0, 16))
/** "2026-10-08T14:30" to a full ISO string, read as Ghana time. Empty or broken gives empty. */
export const fromLocalInput = (v: string): string => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) && !Number.isNaN(Date.parse(v + 'Z')) ? new Date(v.slice(0, 16) + ':00Z').toISOString() : '')

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const two = (n: number) => String(n).padStart(2, '0')
/** "8 Oct, 14:30" in Ghana time, with the year only when it is not this year. */
export function formatGhana(iso: string, now: number = Date.now()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getUTCFullYear() === new Date(now).getUTCFullYear() ? '' : ` ${d.getUTCFullYear()}`
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`
}

/** "ends in 2 days", "starts in 5 hours", "ended 3 days ago". */
export function relativeTo(row: Pick<SpotlightRow, 'status' | 'starts_at' | 'ends_at'>, now: number = Date.now()): string {
  const st = stateOf(row, now)
  if (st === 'draft') return 'Not published'
  const span = (ms: number) => {
    const m = Math.max(1, Math.round(ms / 60_000))
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`
    const h = Math.round(m / 60)
    if (h < 48) return `${h} hour${h === 1 ? '' : 's'}`
    const d = Math.round(h / 24)
    return `${d} days`
  }
  if (st === 'live') return `Ends in ${span(Date.parse(row.ends_at) - now)}`
  if (st === 'scheduled') return `Starts in ${span(Date.parse(row.starts_at) - now)}`
  return `Ended ${span(now - Date.parse(row.ends_at))} ago`
}

/** Plain words for one change-log entry. */
export function describeLog(entry: { action: string; headline: string | null; changes: Record<string, { from: unknown; to: unknown }> | null }): string {
  const name = entry.headline ? `"${entry.headline}"` : 'a Spotlight'
  switch (entry.action) {
    case 'created': return `Created ${name}`
    case 'published': return `Published ${name}`
    case 'unpublished': return `Took ${name} back to draft`
    case 'deleted': return `Deleted ${name}`
    default: {
      const fields = Object.keys(entry.changes ?? {}).map((k) => FIELD_WORD[k] ?? k)
      return `Edited ${name}${fields.length ? `: ${fields.join(', ')}` : ''}`
    }
  }
}

const FIELD_WORD: Record<string, string> = {
  movie_id: 'the film', headline: 'the headline', line: 'the line', cta_kind: 'the button', audience: 'who sees it',
  starts_at: 'the start', ends_at: 'the end', priority: 'the priority', status: 'the status',
}
