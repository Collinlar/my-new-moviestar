// Pages that live inside the Discover section, so the Discover tab stays lit while you are on them.
export const DISCOVER_PATHS = [
  '/discover', '/browse', '/canon', '/people', '/person', '/festivals', '/festival',
  '/trending', '/featured', '/search', '/creators', '/creator', '/all-reviews', '/how-listing-works', '/decks',
]

export function isActivePath(pathname: string | null, href: string, exact?: boolean): boolean {
  if (!pathname) return false
  if (exact) return pathname === href
  if (href === '/discover') return DISCOVER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  return pathname === href || pathname.startsWith(`${href}/`)
}
