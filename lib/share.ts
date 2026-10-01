// What a person chooses to show on a shared take. Stored in share_cards.payload.
// Share cards are public, so these choices are applied where the card is rendered
// (the image and the /take page), never trusted to the browser.

export const SHARE_TEMPLATES = [
  { key: 'poster', label: 'Poster',        hint: 'The film poster beside your take' },
  { key: 'quote',  label: 'Words first',   hint: 'Your words large, no poster' },
] as const
export type ShareTemplate = (typeof SHARE_TEMPLATES)[number]['key']

export interface ShareOptions {
  template: ShareTemplate
  show_name: boolean
  show_rating: boolean
  show_words: boolean
  show_tags: boolean
}

/** A name is only shown when the person turns it on. Everything else starts on. */
export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  template: 'poster',
  show_name: false,
  show_rating: true,
  show_words: true,
  show_tags: true,
}

/** Reads stored or submitted options. Anything missing or unrecognised falls back to the default. */
export function parseShareOptions(raw: unknown): ShareOptions {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const flag = (key: keyof ShareOptions) => (typeof src[key] === 'boolean' ? (src[key] as boolean) : (DEFAULT_SHARE_OPTIONS[key] as boolean))
  return {
    template: SHARE_TEMPLATES.some((t) => t.key === src.template) ? (src.template as ShareTemplate) : DEFAULT_SHARE_OPTIONS.template,
    show_name: flag('show_name'),
    show_rating: flag('show_rating'),
    show_words: flag('show_words'),
    show_tags: flag('show_tags'),
  }
}

export interface TakeFacts {
  reaction: string | null
  rating: number | null
  words: string | null
  tags: string[]
  /** The person's public display name, if they have one. */
  name: string | null
}

/** The parts of a take that may appear on the card, given the person's choices. */
export function visibleTake(options: ShareOptions, facts: TakeFacts): TakeFacts {
  return {
    reaction: facts.reaction,
    rating: options.show_rating ? facts.rating : null,
    words: options.show_words ? facts.words : null,
    tags: options.show_tags ? facts.tags : [],
    name: options.show_name ? facts.name : null,
  }
}

export const SHARE_TOKEN_PATTERN = /^[a-f0-9]{10}$/
