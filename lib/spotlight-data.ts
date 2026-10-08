import { onlyListed } from '@/lib/listing'
import { sortLive, type SpotlightRow } from '@/lib/spotlight'
import type { BandFilm } from '@/components/SpotlightBand'

export interface LiveSpotlight { spotlight: SpotlightRow; film: BandFilm & { id: string } }

const ROW = 'id, movie_id, headline, line, cta_kind, audience, starts_at, ends_at, priority, status'
const FILM_BASE = 'id, title, release_year, country, genre, poster_url'
const FILM_IMAGES = ', poster_focus_x, poster_focus_y, poster_color, banner_url, banner_focus_x, banner_focus_y, banner_color'

/**
 * Every published Spotlight that has not ended yet, with its film, so the page can decide which one is live at the moment
 * of each visit. Fetching candidates and choosing are separate on purpose: the candidates are the same for everyone and can
 * be cached for a minute, while "live right now" has to be exact, so it is worked out on every visit.
 * If the tables are not set up yet, or anything fails, the answer is none: a Spotlight must never break the homepage.
 */
export async function loadSpotlightCandidates(supabase: any, now: number = Date.now()): Promise<LiveSpotlight[]> {
  try {
    const stamp = new Date(now).toISOString()
    const { data, error } = await supabase.from('spotlights').select(ROW).eq('status', 'published').gt('ends_at', stamp)
    if (error || !data?.length) return []
    const rows = data as SpotlightRow[]
    const ids = [...new Set(rows.map((r) => r.movie_id))]
    let { data: films, error: fe } = await onlyListed(supabase.from('movies').select(FILM_BASE + FILM_IMAGES)).in('id', ids)
    // The picture columns come from the poster upload migration. Without them the band still works, on the poster.
    if (fe) ({ data: films } = await onlyListed(supabase.from('movies').select('id, title, release_year, country, genre, poster_url')).in('id', ids))
    const byId = new Map<string, any>((films ?? []).map((f: any) => [f.id, f]))
    const out: LiveSpotlight[] = []
    for (const row of rows) {
      const film = byId.get(row.movie_id)
      if (!film) continue   // not listed, so it is not shown
      out.push({
        spotlight: row,
        film: {
          id: film.id, title: film.title, year: film.release_year ?? null, country: film.country ?? null, genre: film.genre ?? null,
          posterUrl: film.poster_url ?? null, posterFocus: { x: film.poster_focus_x ?? null, y: film.poster_focus_y ?? null }, posterColor: film.poster_color ?? null,
          bannerUrl: film.banner_url ?? null, bannerFocus: { x: film.banner_focus_x ?? null, y: film.banner_focus_y ?? null }, bannerColor: film.banner_color ?? null,
        },
      })
    }
    return out
  } catch (e) {
    console.error('[spotlight] could not load:', e)
    return []
  }
}

/** The Spotlight to show this visitor right now: the first live one for their audience (higher priority, then the later start). */
export function chooseSpotlight(candidates: LiveSpotlight[], signedIn: boolean, now: number = Date.now()): LiveSpotlight | null {
  const first = sortLive(candidates.map((c) => c.spotlight), signedIn, now)[0]
  return first ? candidates.find((c) => c.spotlight.id === first.id) ?? null : null
}

/** Load and choose in one go, for a page that does not cache. */
export async function getLiveSpotlight(supabase: any, signedIn: boolean, now: number = Date.now()): Promise<LiveSpotlight | null> {
  return chooseSpotlight(await loadSpotlightCandidates(supabase, now), signedIn, now)
}
