// Picking the right picture for a poster. Pure, so it can be tested without a browser.
//
// Most film images are YouTube thumbnails, which come in sizes:
//   mqdefault     320 x 180   16:9, no bars          about 8 to 16 KB
//   hqdefault     480 x 360    4:3, black bars       about 25 to 35 KB
//   sddefault     640 x 480    4:3, black bars       about 50 to 100 KB
//   maxresdefault 1280 x 720  16:9, no bars          about 130 to 330 KB
// A 4:3 one has black bars above and below the 16:9 picture. A card that shows one zooms in just enough to lose them.

const YT = /^(https:\/\/(?:img\.youtube\.com|i\.ytimg\.com)\/vi\/[A-Za-z0-9_-]{11}\/)([a-z0-9]+)\.jpg$/

/** Names with black bars. mqdefault and maxresdefault do not have them. */
const BARRED = new Set(['default', 'hqdefault', 'sddefault'])

/** The zoom that hides the bars: 360 over 270 pixels of the 4:3 image. */
export const BARS_ZOOM = 1.34

export const thumbnailHasBars = (url: string): boolean => {
  const m = YT.exec(url)
  return !!m && BARRED.has(m[2])
}

/** The biggest YouTube thumbnail is far more picture than a card behind the top one needs. */
export const lighterThumb = (url: string, depth: number): string =>
  depth > 0 ? url.replace(/\/maxresdefault\.jpg$/, '/sddefault.jpg') : url

// ---- by size on screen ---------------------------------------------------------------------------------------------

/** tiny: a thumbnail up to about 100 px wide. card: a poster card up to about 260 px wide. large: anything bigger. */
export type PosterRole = 'tiny' | 'card' | 'large'

export interface PosterSources {
  poster_url?: string | null
  /** The 240 wide and 960 wide copies a poster upload makes. Only films with an upload have them. */
  poster_sm_url?: string | null
  poster_lg_url?: string | null
}

export interface PosterPick {
  src: string
  /** For an uploaded poster: copies at 240, 480 and 960 pixels wide, so a phone takes the small one. */
  srcSet?: string
  /** 1, or BARS_ZOOM when the picture has black bars to crop away. */
  zoom: number
}

// Larger numbers are bigger files. A role never picks a size above its own, and never above what the film already has,
// because a bigger YouTube size is not guaranteed to exist for every video.
const RANK: Record<string, number> = { default: 0, mqdefault: 1, hqdefault: 2, sddefault: 3, hq720: 4, maxresdefault: 4 }
const LIMIT: Record<PosterRole, number> = { tiny: 1, card: 2, large: 3 }
const BY_RANK = ['default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault']

/**
 * The picture to use for a film's poster at this size. An uploaded poster gives its own small, medium and large copies.
 * A YouTube thumbnail is cut down to a size that suits the box: a 56 pixel thumbnail has no use for 326 KB.
 * Anything else (another site, an older upload) is used as it is.
 */
export function pickPoster(film: PosterSources, role: PosterRole): PosterPick | null {
  const url = film.poster_url?.trim()
  if (!url) return null

  const sm = film.poster_sm_url?.trim()
  if (sm) {
    if (role === 'tiny') return { src: sm, zoom: 1 }
    if (role === 'card') return { src: url, srcSet: `${sm} 240w, ${url} 480w`, zoom: 1 }
    // The medium copy (480 wide) is sharp enough for a card up to about 380 px on most phones. The large copy is for a hero that spans the page.
    return { src: url, zoom: 1 }
  }

  const m = YT.exec(url)
  if (!m) return { src: url, zoom: 1 }
  const have = RANK[m[2]]
  if (have === undefined) return { src: url, zoom: 1 }
  const use = Math.min(have, LIMIT[role])
  const name = use === have ? m[2] : BY_RANK[use]
  return { src: `${m[1]}${name}.jpg`, zoom: BARRED.has(name) ? BARS_ZOOM : 1 }
}
