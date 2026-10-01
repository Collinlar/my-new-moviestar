// Parts of the decks model that carry no server code, so client components can import them.

/** A curated deck with fewer listed films than this is not shown publicly. */
export const MIN_DECK_FILMS = 3

/** Wording used everywhere a sponsored deck appears. */
export const sponsorLabel = (d: { sponsor_name: string | null }) => (d.sponsor_name ? `Sponsored by ${d.sponsor_name}` : null)
