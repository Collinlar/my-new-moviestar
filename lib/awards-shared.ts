// Parts of the awards model with no server code, so client components can import them.

export const CYCLE_STAGES = [
  'draft', 'qualification', 'shortlist_review', 'shortlist_published', 'voting_open',
  'voting_closed', 'jury_review', 'results_locked', 'published', 'archived',
] as const
export type CycleStage = (typeof CYCLE_STAGES)[number]

export const STAGE_LABELS: Record<CycleStage, string> = {
  draft: 'Draft',
  qualification: 'Qualification',
  shortlist_review: 'Shortlist review',
  shortlist_published: 'Shortlist published',
  voting_open: 'Voting open',
  voting_closed: 'Voting closed',
  jury_review: 'Jury review',
  results_locked: 'Results locked',
  published: 'Published',
  archived: 'Archived',
}

export type NomineeStatus = 'proposed' | 'approved' | 'withdrawn' | 'disqualified' | 'winner' | 'runner_up'

/** Stages from which a cycle's shortlist can still be edited. */
export const EDITABLE_STAGES: readonly CycleStage[] = ['qualification', 'shortlist_review']

/** The public wording when a category does not have enough competition. Fixed by the Awards spec. */
export const NOT_AWARDED_COPY = 'No award was issued in this category this cycle.'

export const MIN_REASON_LENGTH = 10

/** "2026-10" becomes "October 2026". */
export function monthLabel(slug: string): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(slug)) return slug
  const [y, m] = slug.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** "21 Oct 2026, 00:00 UTC" for the calendar on the workbench. */
export function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
}

/** "21 Oct 2026" for public pages. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** Stages in which a cycle is visible to the public. Mirrors the database policy. */
export const PUBLIC_STAGES: readonly CycleStage[] = [
  'shortlist_published', 'voting_open', 'voting_closed', 'jury_review', 'results_locked', 'published', 'archived',
]

/** "2026-11" becomes /awards/2026/11, and with a category slug /awards/2026/11/audience-choice. */
export function cycleHref(cycleSlug: string, categorySlug?: string): string {
  const [y, m] = cycleSlug.split('-')
  return `/awards/${y}/${m}${categorySlug ? `/${categorySlug}` : ''}`
}

const WEIGHT_LABELS: Record<string, string> = {
  audience_reception: 'audience reception',
  review_confidence: 'how many different people reviewed it',
  review_quality: 'review quality',
  organic_engagement: 'organic engagement',
  jury_editorial: 'jury and editorial judgement',
  community_performance: 'performances the audience picked',
  review_text_signal: 'what reviews say about the performance',
  jury: 'jury judgement',
  community_direction: 'direction the audience picked',
  film_reception: 'how the film was received',
  community_vote: 'audience votes',
}

export interface MethodCategory {
  method_type: string
  min_nominees: number
  max_nominees: number
  eligibility_config?: Record<string, any> | null
  scoring_config?: Record<string, any> | null
}

/** The rules of a category in plain words. Voting rules are public (Awards spec section 3). */
export function describeMethod(cat: MethodCategory): string[] {
  const el = cat.eligibility_config ?? {}
  const sc = cat.scoring_config ?? {}
  const lines: string[] = []

  if (cat.method_type === 'community') {
    lines.push('Decided entirely by qualified votes from the audience, after an editor-reviewed shortlist.')
  } else if (cat.method_type === 'hybrid') {
    const parts = Object.entries(sc)
      .filter(([, w]) => typeof w === 'number' && (w as number) > 0)
      .map(([k, w]) => `${w}% ${WEIGHT_LABELS[k] ?? k.replace(/_/g, ' ')}`)
    lines.push(`Part audience, part judges. The score is ${parts.join(', ')}.`)
  } else if (cat.method_type === 'jury') {
    lines.push('Decided by a panel of judges.')
  } else {
    lines.push('Chosen by the MuvieStars editors.')
  }

  const reviewers = el.min_unique_reviewers ?? el.min_film_unique_reviewers
  if (reviewers) lines.push(`A film needs at least ${reviewers} different reviewers during the month to qualify.`)
  if (el.min_standout_picks) lines.push(`A person needs at least ${el.min_standout_picks} audience picks for the performance or direction.`)
  if (el.min_listing_age_days) lines.push(`The film must have been listed at least ${el.min_listing_age_days} days before the month's qualification closes.`)
  lines.push(`Only takes with a star rating count, from accounts at least ${el.min_account_age_days ?? 7} days old.`)
  lines.push(`The shortlist has ${cat.min_nominees} to ${cat.max_nominees} nominees. If fewer than ${cat.min_nominees} qualify, no award is given.`)

  if (cat.method_type === 'community') {
    lines.push(`One vote per person. To vote you need an account at least ${el.min_voter_account_age_days ?? 7} days old and a take on the film. You can change your vote until voting closes, and results are never shown while voting is open.`)
  }
  return lines
}
