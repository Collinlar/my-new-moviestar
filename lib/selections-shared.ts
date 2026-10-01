// Parts of the Selections model with no server code, so client components can import them.

export const SELECTION_LABELS = ['MuvieStars Selection', "Editor's Selection", "This Month's Selection"] as const
export type SelectionLabel = (typeof SELECTION_LABELS)[number]

/** A Selection with fewer listed films than this is not shown publicly. */
export const MIN_SELECTION_FILMS = 3

/** "2026-10" becomes "October 2026". */
export function periodLabel(period: string | null): string | null {
  if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return null
  const [y, m] = period.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
