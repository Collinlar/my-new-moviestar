// How each platform is marked on a card. Only a colour we are sure of is used. A platform with no colour here gets the
// MuvieStars gold, which is plainer than a guess. These are names and colours, not logos: a logo on our cards could
// read as a partnership we do not have, and several platforms set rules for how theirs may be shown.

export interface Brand { color: string | null }

const BRANDS: Record<string, Brand> = {
  'netflix': { color: '#E50914' },
  'youtube': { color: '#FF0000' },
  'amazon prime video': { color: '#00A8E1' },
  'disney+': { color: '#113CCF' },
  'apple tv+': { color: '#F5F5F7' },
}

export const brandFor = (platform: string): Brand => BRANDS[platform.trim().toLowerCase()] ?? { color: null }
