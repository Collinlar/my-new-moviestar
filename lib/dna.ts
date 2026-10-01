// Movie DNA: a short portrait of someone's taste, built only from their own takes.
// This file is pure (no database, no framework) so the same numbers drive the page,
// the share card and the tests.

/** Takes needed before a portrait is shown. Below this it would be a guess. */
export const DNA_MIN_TAKES = 5

export interface DnaTake {
  reaction: string | null
  rating: number | null
  genre: string | null
  industry: string | null
  country: string | null
  release_year: number | null
  /** The community's average for the film, and how many ratings that rests on. */
  community_avg: number | null
  community_count: number | null
  tags: Array<{ slug: string; label: string }>
}

export interface DnaItem {
  label: string
  count: number
  /** The person's average score for films in this group, out of 5. */
  avg: number
}

export interface Dna {
  takes: number
  unlocked: boolean
  /** Takes still needed to unlock. Zero once unlocked. */
  remaining: number
  headline: string | null
  lean: { genres: DnaItem[]; industries: DnaItem[]; decades: DnaItem[] }
  tags: Array<{ slug: string; label: string; count: number }>
  /** How the person's stars compare with everyone else's on the same films. Null when too little to say. */
  harshness: { delta: number; films: number; verdict: 'tougher' | 'kinder' | 'in step' } | null
  /** Genre mix for the bars on the card, largest first. */
  mix: Array<{ label: string; count: number; share: number }>
  average: number | null
}

// What a reaction is worth when there is no star rating.
const REACTION_SCORE: Record<string, number> = { loved: 5, liked: 4, okay: 3, not_for_me: 1.5 }

/** A group must be liked at least this much to count as a lean, however low the person's own average is. */
const LIKED_AT_LEAST = 3.5
/** Community figures rest on too little below this many ratings. */
const MIN_COMMUNITY_COUNT = 3
/** Films needed before the harshness line is shown. */
const MIN_HARSHNESS_FILMS = 3
/** A gap smaller than this is not worth calling. */
const HARSHNESS_BAND = 0.3

const IGNORED = new Set(['other', 'unknown', ''])

const scoreOf = (t: DnaTake): number | null => {
  if (t.rating && t.rating >= 1 && t.rating <= 5) return t.rating
  if (t.reaction && t.reaction in REACTION_SCORE) return REACTION_SCORE[t.reaction]
  return null
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** "2014" becomes "2010s". */
export const decadeOf = (year: number | null): string | null =>
  year && year >= 1900 && year <= 2100 ? `${Math.floor(year / 10) * 10}s` : null

function lean(rows: Array<{ key: string | null; score: number }>, overall: number, top = 2): DnaItem[] {
  const groups = new Map<string, number[]>()
  for (const r of rows) {
    if (!r.key || IGNORED.has(r.key.trim().toLowerCase())) continue
    groups.set(r.key, [...(groups.get(r.key) ?? []), r.score])
  }
  return [...groups.entries()]
    .map(([label, scores]) => ({ label, count: scores.length, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
    // One film is a coincidence, two is a habit.
    .filter((g) => g.count >= 2 && g.avg >= overall && g.avg >= LIKED_AT_LEAST)
    .sort((a, b) => (b.avg - overall) * Math.sqrt(b.count) - (a.avg - overall) * Math.sqrt(a.count) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, top)
    .map((g) => ({ ...g, avg: round1(g.avg) }))
}

const genreWord = (genre: string) => genre.toLowerCase()

/** "Nollywood thriller films from the 2010s", built from whatever the person actually leans towards. */
function headlineOf(l: Dna['lean']): string | null {
  const industry = l.industries[0]?.label
  const genre = l.genres[0]?.label
  const decade = l.decades[0]?.label
  if (!industry && !genre && !decade) return null
  const noun = [industry, genre ? genreWord(genre) : null, 'films'].filter(Boolean).join(' ')
  const line = decade ? `${noun} from the ${decade}` : noun
  return line.charAt(0).toUpperCase() + line.slice(1)
}

export function computeDna(takes: DnaTake[]): Dna {
  const scored = takes.map((t) => ({ t, score: scoreOf(t) })).filter((x): x is { t: DnaTake; score: number } => x.score !== null)
  const total = takes.length
  const unlocked = total >= DNA_MIN_TAKES
  const empty: Dna = {
    takes: total, unlocked, remaining: Math.max(0, DNA_MIN_TAKES - total), headline: null,
    lean: { genres: [], industries: [], decades: [] }, tags: [], harshness: null, mix: [], average: null,
  }
  if (!unlocked || scored.length === 0) return empty

  const overall = scored.reduce((a, x) => a + x.score, 0) / scored.length

  const leanSet: Dna['lean'] = {
    genres: lean(scored.map((x) => ({ key: x.t.genre, score: x.score })), overall),
    industries: lean(scored.map((x) => ({ key: x.t.industry, score: x.score })), overall),
    decades: lean(scored.map((x) => ({ key: decadeOf(x.t.release_year), score: x.score })), overall, 1),
  }

  // Standout tags, most used first.
  const tagCount = new Map<string, { slug: string; label: string; count: number }>()
  for (const t of takes) {
    for (const tag of t.tags) {
      const cur = tagCount.get(tag.slug)
      tagCount.set(tag.slug, { slug: tag.slug, label: tag.label, count: (cur?.count ?? 0) + 1 })
    }
  }
  const tags = [...tagCount.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)).slice(0, 3)

  // Harshness: only stars the person gave, only films with enough other ratings to compare with.
  const comparable = takes.filter(
    (t) => t.rating && t.community_avg !== null && (t.community_count ?? 0) >= MIN_COMMUNITY_COUNT,
  )
  let harshness: Dna['harshness'] = null
  if (comparable.length >= MIN_HARSHNESS_FILMS) {
    const delta = comparable.reduce((a, t) => a + ((t.rating as number) - (t.community_avg as number)), 0) / comparable.length
    harshness = {
      delta: round1(delta),
      films: comparable.length,
      verdict: delta <= -HARSHNESS_BAND ? 'tougher' : delta >= HARSHNESS_BAND ? 'kinder' : 'in step',
    }
  }

  // Genre mix for the bars: how the person's takes divide up.
  const genreCount = new Map<string, number>()
  for (const x of scored) {
    const g = x.t.genre
    if (g && !IGNORED.has(g.trim().toLowerCase())) genreCount.set(g, (genreCount.get(g) ?? 0) + 1)
  }
  const mix = [...genreCount.entries()]
    .map(([label, count]) => ({ label, count, share: count / scored.length }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5)

  return {
    takes: total, unlocked, remaining: 0,
    headline: headlineOf(leanSet),
    lean: leanSet, tags, harshness, mix,
    average: round1(overall),
  }
}

/** A sentence for the harshness line. */
export function harshnessLine(h: NonNullable<Dna['harshness']>): string {
  if (h.verdict === 'in step') return 'Your stars land close to everyone else\'s.'
  const gap = Math.abs(h.delta).toFixed(1)
  return h.verdict === 'tougher'
    ? `You rate ${gap} stars tougher than most.`
    : `You rate ${gap} stars kinder than most.`
}
