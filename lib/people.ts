// Shared by public profile pages and the admin credit editor. No server-only imports.

export const ROLE_LABELS: Record<string, string> = {
  actor:               'Actor',
  director:            'Director',
  writer:              'Writer',
  producer:            'Producer',
  cinematographer:     'Cinematographer',
  editor:              'Editor',
  composer:            'Composer',
  costume_designer:    'Costume Designer',
  production_designer: 'Production Designer',
}

export const ROLE_DEPARTMENT: Record<string, string> = {
  actor:               'Acting',
  director:            'Direction',
  writer:              'Writing',
  producer:            'Production',
  cinematographer:     'Camera',
  editor:              'Editing',
  composer:            'Music',
  costume_designer:    'Costume',
  production_designer: 'Art',
}

export const CREW_ROLES = [
  'writer', 'producer', 'cinematographer', 'editor', 'composer', 'costume_designer', 'production_designer',
] as const

// Order sections appear on a profile.
export const ROLE_GROUPS: Array<{ key: string; heading: string; roles: string[] }> = [
  { key: 'acting',    heading: 'Acting',    roles: ['actor'] },
  { key: 'directing', heading: 'Directing', roles: ['director'] },
  { key: 'writing',   heading: 'Writing',   roles: ['writer'] },
  { key: 'producing', heading: 'Producing', roles: ['producer'] },
  { key: 'crew',      heading: 'Crew',      roles: ['cinematographer', 'editor', 'composer', 'costume_designer', 'production_designer'] },
]

export const SOCIAL_KEYS = ['instagram', 'x', 'facebook', 'youtube', 'tiktok'] as const
export type SocialKey = (typeof SOCIAL_KEYS)[number]
export type Socials = Partial<Record<SocialKey, string>>

export const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: 'Instagram',
  x:         'X',
  facebook:  'Facebook',
  youtube:   'YouTube',
  tiktok:    'TikTok',
}

export interface PersonLite {
  id: string
  slug: string
  full_name: string
  profile_image: string | null
  country: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string) => UUID_RE.test(s)

/** "Director and Actor", most credits first. */
export function describeRoles(roles: string[]): string {
  const counts: Record<string, number> = {}
  for (const r of roles) counts[r] = (counts[r] ?? 0) + 1
  const labels = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([r]) => ROLE_LABELS[r] ?? r)
  if (labels.length === 0) return 'Film professional'
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels[0]}, ${labels[1]} and more`
}

/** Lowercase and strip accents to match the people.search_text column. */
export function foldForSearch(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Safe to drop inside a PostgREST or() filter: no commas, parens, wildcards or quotes. */
export function cleanSearchTerm(term: string): string {
  return foldForSearch(term).replace(/[,()*%\\"'`:]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function birthYear(dob?: string | null): number | undefined {
  if (!dob) return undefined
  const y = Number(dob.slice(0, 4))
  return Number.isFinite(y) && y > 0 ? y : undefined
}
