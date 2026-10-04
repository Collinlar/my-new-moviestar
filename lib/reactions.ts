// The vocabulary of a take, shared by the swipe sheet, the film page form and the share cards.

export const REACTIONS = [
  { key: 'loved',      emoji: '❤️', label: 'Loved it'    },
  { key: 'liked',      emoji: '👍', label: 'Liked it'    },
  { key: 'okay',       emoji: '😐', label: 'It was okay' },
  { key: 'not_for_me', emoji: '👎', label: 'Not for me'  },
] as const
export type ReactionKey = (typeof REACTIONS)[number]['key']

export const REACTION_LABEL: Record<string, string> = Object.fromEntries(REACTIONS.map((r) => [r.key, r.label]))

export const TAGS = [
  { slug: 'story',     label: 'Story'     },
  { slug: 'acting',    label: 'Acting'    },
  { slug: 'chemistry', label: 'Chemistry' },
  { slug: 'visuals',   label: 'Visuals'   },
  { slug: 'music',     label: 'Music'     },
  { slug: 'culture',   label: 'Culture'   },
  { slug: 'dialogue',  label: 'Dialogue'  },
  { slug: 'pacing',    label: 'Pacing'    },
  { slug: 'direction', label: 'Direction' },
  { slug: 'ending',    label: 'Ending'    },
] as const

export const TAG_SLUGS: readonly string[] = TAGS.map((t) => t.slug)
export const MAX_TAGS = 3
export const QUICK_TAKE_MAX = 180
export const FULL_REVIEW_MAX = 3000

export interface TakeInput {
  reaction: ReactionKey
  rating: number | null
  tags: string[]
  one_liner: string | null
  review_text: string | null
}

import type { Parsed } from '@/lib/parsed'
export type { Parsed } from '@/lib/parsed'

/** Cleans a take submitted from either form. Anything unknown is dropped rather than trusted. */
export function parseTake(body: any): Parsed<TakeInput> {
  if (!REACTIONS.some((r) => r.key === body?.reaction)) return { ok: false, error: 'Pick how the film left you feeling.' }

  const r = Number(body?.rating)
  const rating = Number.isInteger(r) && r >= 1 && r <= 5 ? r : null

  const tags = Array.isArray(body?.tags)
    ? [...new Set((body.tags as unknown[]).filter((t): t is string => typeof t === 'string' && TAG_SLUGS.includes(t)))].slice(0, MAX_TAGS)
    : []

  const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
  const one_liner = text(body?.one_liner, QUICK_TAKE_MAX)
  const review_text = text(body?.review_text, FULL_REVIEW_MAX)

  if (review_text && !rating) return { ok: false, error: 'Add a star rating to go with your longer review.' }

  return { ok: true, value: { reaction: body.reaction, rating, tags, one_liner, review_text } }
}

export type StandoutKind = 'performance' | 'direction'
export const STANDOUT_KINDS: readonly StandoutKind[] = ['performance', 'direction']

const PERSON_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * "Which performance stood out?" and "Was the direction a standout?".
 * For each kind: a person id picks them, null clears an earlier pick, and leaving the kind out
 * changes nothing. Anything else is ignored rather than trusted.
 */
export function parseStandouts(raw: unknown): Partial<Record<StandoutKind, string | null>> {
  const out: Partial<Record<StandoutKind, string | null>> = {}
  if (!raw || typeof raw !== 'object') return out
  for (const kind of STANDOUT_KINDS) {
    const v = (raw as Record<string, unknown>)[kind]
    if (v === null) out[kind] = null
    else if (typeof v === 'string' && PERSON_ID.test(v)) out[kind] = v
  }
  return out
}
