// Catalogue listing rules. Shared by the admin queue, the approval API and discovery queries.
// The eligibility checks themselves are computed in the database (movie_listing_queue_scored),
// so this file only names them and applies decisions. Nothing here re-derives "ready".

export const LISTING_STATUSES = [
  'draft', 'submitted', 'under_review', 'needs_information',
  'approved', 'rejected', 'archived', 'delisted',
] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft:             'Draft',
  submitted:         'Submitted',
  under_review:      'Under review',
  needs_information: 'Needs information',
  approved:          'Listed',
  rejected:          'Rejected',
  archived:          'Archived',
  delisted:          'Delisted',
}

export const QUEUE_TABS = [
  { key: 'todo',     label: 'To decide', statuses: ['draft', 'submitted', 'under_review', 'needs_information'] },
  { key: 'approved', label: 'Listed',    statuses: ['approved'] },
  { key: 'rejected', label: 'Rejected',  statuses: ['rejected'] },
  { key: 'archived', label: 'Archived',  statuses: ['archived'] },
  { key: 'delisted', label: 'Delisted',  statuses: ['delisted'] },
] as const satisfies ReadonlyArray<{ key: string; label: string; statuses: readonly ListingStatus[] }>
export type QueueTabKey = (typeof QUEUE_TABS)[number]['key']

export function tabForStatus(status: ListingStatus): QueueTabKey {
  return (QUEUE_TABS.find(t => (t.statuses as readonly string[]).includes(status))?.key ?? 'todo') as QueueTabKey
}

export const SORT_OPTIONS = [
  { key: 'complete', label: 'Most complete first' },
  { key: 'az',       label: 'A to Z' },
  { key: 'newest',   label: 'Newest added' },
  { key: 'year',     label: 'Release year' },
] as const
export type SortKey = (typeof SORT_OPTIONS)[number]['key']

export const REJECTION_REASONS = [
  { key: 'not_african',       label: 'Not African cinema' },
  { key: 'not_a_film',        label: 'Not a film (clip, trailer or compilation)' },
  { key: 'duplicate',         label: 'Duplicate of another listing' },
  { key: 'insufficient_info', label: 'Too little information to verify' },
  { key: 'rights_concern',    label: 'Rights or identity concern' },
  { key: 'spam',              label: 'Spam or misrepresentation' },
] as const
export const REJECTION_LABELS: Record<string, string> = Object.fromEntries(REJECTION_REASONS.map(r => [r.key, r.label]))

// Statuses an editor can set from the queue. "submitted" only comes from filmmaker submissions.
export const DECISION_STATUSES = [
  'approved', 'needs_information', 'rejected', 'archived', 'delisted', 'under_review', 'draft',
] as const
export type DecisionStatus = (typeof DECISION_STATUSES)[number]

export const HARD_CHECKS = [
  { key: 'ok_title',    label: 'Has a title' },
  { key: 'ok_year',     label: 'Plausible release year' },
  { key: 'ok_country',  label: 'Country of origin' },
  { key: 'ok_synopsis', label: 'Synopsis of at least 80 characters' },
  { key: 'ok_poster',   label: 'Poster image' },
  { key: 'ok_evidence', label: 'Release evidence (video, stream, festival or award)' },
] as const
export const SOFT_CHECKS = [
  { key: 'ok_credits',     label: 'Director or cast credited' },
  { key: 'ok_clean_title', label: 'Clean film title (no "|", 80 characters or fewer)' },
] as const
export type CheckKey = (typeof HARD_CHECKS)[number]['key'] | (typeof SOFT_CHECKS)[number]['key']

export interface QueueRow {
  id: string
  title: string
  release_year: number | null
  country: string | null
  industry: string | null
  genre: string | null
  poster_url: string | null
  has_video: boolean
  listing_status: ListingStatus
  listing_rejection_reason: string | null
  credit_count: number
  completeness: number
  hard_ready: boolean
  created_at: string
  ok_title: boolean
  ok_year: boolean
  ok_country: boolean
  ok_synopsis: boolean
  ok_poster: boolean
  ok_evidence: boolean
  ok_credits: boolean
  ok_clean_title: boolean
}

export const QUEUE_COLUMNS =
  'id, title, release_year, country, industry, genre, poster_url, has_video, listing_status, listing_rejection_reason, ' +
  'credit_count, completeness, hard_ready, created_at, ok_title, ok_year, ok_country, ok_synopsis, ok_poster, ok_evidence, ' +
  'ok_credits, ok_clean_title'

export const missingHard =(row: Pick<QueueRow, CheckKey>): string[] =>
  HARD_CHECKS.filter(c => !row[c.key]).map(c => c.label)
export const missingSoft = (row: Pick<QueueRow, CheckKey>): string[] =>
  SOFT_CHECKS.filter(c => !row[c.key]).map(c => c.label)

/**
 * Swipe and other discovery surfaces draw from approved films only. While fewer than this many
 * are approved, they also draw from drafts so the product is not empty during the first triage.
 * Set to 0 once the catalogue has been reviewed.
 */
export const TRANSITION_MIN_POOL = 120

// Supabase query builders are loosely typed throughout this codebase.
export const onlyListed = (query: any) => query.eq('listing_status', 'approved')

/** The 11-character video id from any common YouTube link, or null (playlists, channels, other sites). */
export function youtubeId(url?: string | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v')
      else id = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/)?.[1] ?? null
    }
    return id && /^[A-Za-z0-9_-]{6,15}$/.test(id) ? id : null
  } catch {
    return null
  }
}

// ---- country suggestion ----------------------------------------------------------------------
// Most films without a country are YouTube imports whose title or description says where they
// are from ("Ghanaian Movie", "Latest Nollywood Movie"). This only ever suggests: an editor still
// chooses, saves, and confirms. A text that names two countries gets no suggestion.

const COUNTRY_TERMS: Array<[RegExp, string]> = [
  [/\bghana(ian)?\b|\bghallywood\b|\baccra\b|\bkumasi\b|\btwi\b|\basante\b|\bakan\b|\bfante\b/i, 'Ghana'],
  [/\bnigeria(n)?\b|\bnollywood\b|\blagos\b|\babuja\b|\byoruba\b|\bigbo\b|\bhausa\b|\bnaija\b|\bport harcourt\b|\benugu\b/i, 'Nigeria'],
  [/\bkenya(n)?\b|\bnairobi\b|\bswahili\b/i, 'Kenya'],
  [/\buganda(n)?\b|\bkampala\b|\bwakaliwood\b|\bluganda\b/i, 'Uganda'],
  [/\bsouth africa(n)?\b|\bjohannesburg\b|\bcape town\b|\bzulu\b|\bxhosa\b|\bafrikaans\b/i, 'South Africa'],
  [/\btanzania(n)?\b|\bdar es salaam\b/i, 'Tanzania'],
  [/\bethiopia(n)?\b|\baddis\b|\bamharic\b/i, 'Ethiopia'],
  [/\bsenegal(ese)?\b|\bdakar\b|\bwolof\b/i, 'Senegal'],
  [/\bcameroon(ian)?\b/i, 'Cameroon'],
  [/\bzimbabwe(an)?\b/i, 'Zimbabwe'],
  [/\bzambia(n)?\b/i, 'Zambia'],
  [/\brwanda(n)?\b/i, 'Rwanda'],
  [/\begypt(ian)?\b/i, 'Egypt'],
  [/\bmorocc(o|an)\b/i, 'Morocco'],
]

export interface CountrySuggestion { country: string; from: 'title' | 'description' }

export function suggestCountry(f: { title?: string | null; description?: string | null; synopsis?: string | null }): CountrySuggestion | null {
  const scopes: Array<[string, CountrySuggestion['from']]> = [
    [f.title ?? '', 'title'],
    [`${f.description ?? ''} ${f.synopsis ?? ''}`, 'description'],
  ]
  for (const [text, from] of scopes) {
    const hits = [...new Set(COUNTRY_TERMS.filter(([re]) => re.test(text)).map(([, c]) => c))]
    if (hits.length === 1) return { country: hits[0], from }
    if (hits.length > 1) return null
  }
  return null
}

// ---- request validation for /api/admin/listing ------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_BULK = 200

export interface Decision {
  ids: string[]
  status: DecisionStatus
  reason: string | null
  note: string | null
  whyListed: string | null
}
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null

export function parseDecision(body: any): Parsed<Decision> {
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids as unknown[])] : []
  if (ids.length === 0) return { ok: false, error: 'Pick at least one film.' }
  if (ids.length > MAX_BULK) return { ok: false, error: `Decide on ${MAX_BULK} films or fewer at a time.` }
  if (!ids.every(id => typeof id === 'string' && UUID.test(id))) return { ok: false, error: 'One of those film ids is not valid.' }

  const status = body?.status as DecisionStatus
  if (!(DECISION_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'That is not a status you can set here.' }

  const note = str(body?.note, 500)
  const reason = str(body?.reason, 60)
  const whyListed = str(body?.why_listed, 300)

  if (status === 'approved' && body?.confirmed !== true) {
    return { ok: false, error: 'Tick the box to confirm these are African films, real productions, with no rights concerns.' }
  }
  if (status === 'rejected' && !(reason && reason in REJECTION_LABELS)) {
    return { ok: false, error: 'Choose a reason for rejecting.' }
  }
  if ((status === 'needs_information' || status === 'delisted') && (!note || note.length < 3)) {
    return { ok: false, error: status === 'delisted' ? 'Say why this film is being delisted.' : 'Say what information is missing.' }
  }

  return {
    ok: true,
    value: {
      ids: ids as string[],
      status,
      reason: status === 'rejected' ? reason : null,
      note,
      // A "Why it's on MuvieStars" line belongs to one film, so it is ignored for bulk approvals.
      whyListed: status === 'approved' && ids.length === 1 ? whyListed : null,
    },
  }
}

export interface CountryFill { ids: string[]; country: string }

/** Fills a country on films that have none. It never overwrites a country that is already set. */
export function parseCountryFill(body: any): Parsed<CountryFill> {
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids as unknown[])] : []
  if (ids.length === 0) return { ok: false, error: "Pick at least one film." }
  if (ids.length > MAX_BULK) return { ok: false, error: `Fill ${MAX_BULK} films or fewer at a time.` }
  if (!ids.every(id => typeof id === "string" && UUID.test(id))) return { ok: false, error: "One of those film ids is not valid." }
  const country = str(body?.country, 60)
  if (!country) return { ok: false, error: "Say which country." }
  return { ok: true, value: { ids: ids as string[], country } }
}

export interface FieldUpdate { id: string; patch: { title?: string; country?: string; release_year?: number } }

export function parseFieldUpdate(body: any): Parsed<FieldUpdate> {
  if (typeof body?.id !== 'string' || !UUID.test(body.id)) return { ok: false, error: 'That film id is not valid.' }
  const patch: FieldUpdate['patch'] = {}

  if (body.title !== undefined) {
    const t = str(body.title, 200)
    if (!t) return { ok: false, error: 'A title cannot be empty.' }
    patch.title = t
  }
  if (body.country !== undefined) {
    const c = str(body.country, 60)
    if (!c) return { ok: false, error: 'Country cannot be empty.' }
    patch.country = c
  }
  if (body.release_year !== undefined) {
    const y = Number(body.release_year)
    const max = new Date().getFullYear() + 2
    if (!Number.isInteger(y) || y < 1900 || y > max) return { ok: false, error: `Release year must be between 1900 and ${max}.` }
    patch.release_year = y
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: 'There is nothing to change.' }
  return { ok: true, value: { id: body.id, patch } }
}
