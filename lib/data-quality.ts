// Catalogue data cleanup: suggestions only. Nothing here writes to the database. The admin reads each
// suggestion, ticks the ones that are right, and applies them through data_quality_apply, which logs
// every change so a batch can be undone.
import { suggestCountry } from './listing'

const MAX_YEAR_AHEAD = 2

// ---- titles -------------------------------------------------------------------------------------
// Most messy titles are YouTube upload titles: "Mercy Johnson 2023 Latest Nigerian Movie | Blood Sisters - Full Movie".
// The film's name is in there somewhere, wrapped in marketing. These rules pull it out conservatively and say what
// they removed, so an editor can tell at a glance whether to trust the result.

const MOVIE_WORD = /\b(movie|movies|film|films|series|nollywood|ghallywood|kumawood|wakaliwood)\b/i
const QUALIFIER = new RegExp(
  '^(full|latest|new|newest|recent|trending|nigerian|nigeria|ghanaian|ghana|african|kenyan|ugandan|yoruba|igbo|hausa|swahili|twi|' +
  'nollywood|ghallywood|kumawood|wakaliwood|epic|hd|4k|2160p|1080p|720p|subtitled|subtitles|english|premiere|official|exclusive|' +
  'blockbuster|free|watch|movie|movies|film|films|series|and|in|of|the|a|\\d{4})$', 'i')
const TRAILER = /\b(trailer|teaser)\b/i
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs'])

function isNoise(segment: string): boolean {
  const t = segment.trim()
  if (!t) return true
  if (/^(official\s+)?(full\s+)?(trailer|teaser|movie|film|video)$/i.test(t)) return true
  const words = t.split(/\s+/)
  const noisy = words.filter((w) => QUALIFIER.test(w.replace(/[^A-Za-z0-9]/g, ''))).length
  return MOVIE_WORD.test(t) && noisy / words.length >= 0.6
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+)/)
    .map((w, i, all) => {
      if (/^\s+$/.test(w)) return w
      const first = all.findIndex((x) => !/^\s+$/.test(x)) === i
      return !first && SMALL_WORDS.has(w) ? w : w.replace(/^([("'‘“]*)([a-z])/, (_m, p, c) => p + c.toUpperCase())
    })
    .join('')
}

function validYear(n: number): boolean {
  return Number.isInteger(n) && n >= 1950 && n <= new Date().getFullYear() + MAX_YEAR_AHEAD
}

export interface TitleSuggestion {
  title: string
  year: number | null
  changed: boolean
  /** 'high' when only recognised marketing was removed. 'review' when a person should look closely. */
  confidence: 'high' | 'review'
  notes: string[]
  trailer: boolean
}

export function cleanTitle(original: string): TitleSuggestion {
  const notes: string[] = []
  let year: number | null = null
  const grab = (text: string) => {
    for (const m of text.matchAll(/\b(19[5-9]\d|20[0-3]\d)\b/g)) {
      const n = Number(m[1])
      if (validYear(n)) { year = year ?? n }
    }
  }

  let s = (original ?? '').replace(/\p{Extended_Pictographic}/gu, '').replace(/[​-‍️]/g, '').replace(/\s+/g, ' ').trim()
  const trailer = TRAILER.test(s)

  // 1. Split on pipes and keep the first segment that is not marketing.
  const segments = s.split(/\s*\|{1,2}\s*/).filter((x) => x.length > 0)
  let chosenIndex = 0
  if (segments.length > 1) {
    const idx = segments.findIndex((seg) => !isNoise(seg))
    chosenIndex = idx === -1 ? 0 : idx
    segments.forEach((seg, i) => { if (i !== chosenIndex) { notes.push(`Dropped “${seg}”`); grab(seg) } })
    s = segments[chosenIndex]
  }

  // 2. Bracketed extras: (2021), [HD], (Full Movie), (Official Trailer). Anything else in brackets stays.
  s = s.replace(/[(\[{]([^)\]}]*)[)\]}]/g, (whole, inner: string) => {
    const t = inner.trim()
    if (/^\d{4}$/.test(t)) { grab(t); notes.push(`Moved (${t}) to the year`); return '' }
    if (isNoise(t) || /\b(full|hd|4k|official|subtitles?|subtitled|trailer|teaser|english|nollywood|ghallywood)\b/i.test(t)) {
      notes.push(`Dropped “${whole}”`); grab(t); return ''
    }
    return whole
  })

  // 3. "Full Movie" and friends anywhere.
  s = s.replace(/\b(full|complete)\s+(movie|film)s?\b/gi, (m) => { notes.push(`Dropped “${m}”`); return '' })

  // 4. Marketing at either edge, after a dash or colon.
  // Split on a dash or colon but keep the separators, so a real "Mission: Impossible" is put back as it was.
  const bits = s.split(/(\s+[-–—]\s+|\s*:\s+)/)
  const drop = (seg: string) => { notes.push(`Dropped “${seg}”`); grab(seg) }
  while (bits.length > 2 && isNoise(bits[bits.length - 1])) { drop(bits[bits.length - 1]); bits.splice(bits.length - 2, 2) }
  while (bits.length > 2 && isNoise(bits[0])) { drop(bits[0]); bits.splice(0, 2) }
  s = bits.join('')

  // 5. Tidy up.
  s = s.replace(/\s{2,}/g, ' ').replace(/^[\s\-–—:|,.;]+|[\s\-–—:|,;]+$/g, '').trim()

  // 6. Titles typed in capitals.
  const letters = s.replace(/[^A-Za-z]/g, '')
  if (letters.length >= 4 && letters === letters.toUpperCase()) {
    const cased = titleCase(s)
    if (cased !== s) { s = cased; notes.push('Capitals changed to title case') }
  }

  const changed = s !== original.trim()
  let confidence: TitleSuggestion['confidence'] = 'high'
  if (chosenIndex !== 0) confidence = 'review'
  if (s.length < 3 || s.length > 80) confidence = 'review'
  if (changed && s.length < Math.min(original.length * 0.25, 12)) confidence = 'review'
  if (changed && notes.length === 0) confidence = 'review'
  if (isNoise(s)) { confidence = 'review'; notes.push('What is left looks like marketing, not a title') }

  return { title: s, year, changed, confidence, notes, trailer }
}

/** True when the title trips the same test the listing queue uses for a clean title. */
export const isCleanTitle = (t: string | null | undefined): boolean => !!t && !t.includes('|') && t.length <= 80

// ---- years --------------------------------------------------------------------------------------

export const yearOk = (y: number | null | undefined): boolean =>
  typeof y === 'number' && y >= 1900 && y <= new Date().getFullYear() + MAX_YEAR_AHEAD

/** A release year guessed from the title when the row has none. Only a four-digit year the title itself carries. */
export function suggestYear(title: string): number | null {
  const fromClean = cleanTitle(title).year
  if (fromClean) return fromClean
  const m = title.match(/\b(19[5-9]\d|20[0-3]\d)\b/)
  return m && validYear(Number(m[1])) ? Number(m[1]) : null
}

// ---- countries ----------------------------------------------------------------------------------

export interface CountryGuess { country: string; from: 'title' | 'language' | 'description' }

/** Where a film is from, going by its title, its language, then its description. Null when it is unclear. */
export function guessCountry(f: { title?: string | null; language?: string | null; description?: string | null; synopsis?: string | null }): CountryGuess | null {
  const t = suggestCountry({ title: f.title })
  if (t) return { country: t.country, from: 'title' }
  const l = f.language ? suggestCountry({ title: f.language }) : null
  if (l) return { country: l.country, from: 'language' }
  const d = suggestCountry({ description: f.description, synopsis: f.synopsis })
  if (d) return { country: d.country, from: 'description' }
  return null
}

// ---- duplicates ---------------------------------------------------------------------------------

export const duplicateKey = (title: string, year: number | null): string => {
  const base = cleanTitle(title).title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '')
  return `${base}|${year ?? ''}`
}

export interface DupRow { id: string; title: string; release_year: number | null; listing_status: string; created_at: string }

/** Films that share a cleaned title and year. The keeper is the one already listed, otherwise the oldest. */
export function findDuplicateGroups<T extends DupRow>(rows: T[]): Array<{ key: string; keeper: T; extras: T[] }> {
  const by = new Map<string, T[]>()
  for (const r of rows) {
    const key = duplicateKey(r.title, r.release_year)
    if (key.startsWith('|')) continue
    by.set(key, [...(by.get(key) ?? []), r])
  }
  const rank = (r: DupRow) => (r.listing_status === 'approved' ? 0 : r.listing_status === 'rejected' || r.listing_status === 'archived' ? 2 : 1)
  return [...by.entries()]
    .filter(([, g]) => g.length > 1)
    .map(([key, g]) => {
      const sorted = [...g].sort((a, b) => rank(a) - rank(b) || a.created_at.localeCompare(b.created_at))
      return { key, keeper: sorted[0], extras: sorted.slice(1) }
    })
    .sort((a, b) => a.keeper.title.localeCompare(b.keeper.title))
}
