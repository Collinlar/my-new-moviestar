import { onlyListed } from '@/lib/listing'
import { sortLive, type SpotlightRow } from '@/lib/spotlight'
import type { BandFilm } from '@/components/SpotlightBand'

export interface LiveSpotlight { spotlight: SpotlightRow; film: BandFilm & { id: string } }

const ROW = 'id, movie_id, headline, line, cta_kind, audience, starts_at, ends_at, priority, status'
const FILM_BASE = 'id, title, release_year, country, genre, poster_url'
const FILM_IMAGES = ', poster_focus_x, poster_focus_y, poster_color, banner_url, banner_focus_x, banner_focus_y, banner_color'

/**
 * The Spotlight to show this visitor right now, or null. It is the first live one for their audience (higher priority,
 * then the later start) whose film is still listed. If the Spotlight tables are not set up yet, or anything fails, the
 * answer is null and the homepage simply has no Spotlight. A Spotlight must never be able to break the homepage.
 */
export async function getLiveSpotlight(supabase: any, signedIn: boolean, now: number = Date.now()): Promise<LiveSpotlight | null> {
  try {
    const stamp = new Date(now).toISOString()
    const { data, error } = await supabase.from('spotlights').select(ROW).eq('status', 'published').lte('starts_at', stamp).gt('ends_at', stamp)
    if (error || !data?.length) return null
    for (const row of sortLive(data as SpotlightRow[], signedIn, now)) {
      let { data: film, error: fe } = await onlyListed(supabase.from('movies').select(FILM_BASE + FILM_IMAGES)).eq('id', row.movie_id).maybeSingle()
      // The picture columns come from the poster upload migration. Without them the band still works, on the poster.
      if (fe) ({ data: film } = await onlyListed(supabase.from('movies').select(FILM_BASE)).eq('id', row.movie_id).maybeSingle())
      if (!film) continue
      return {
        spotlight: row,
        film: {
          id: film.id, title: film.title, year: film.release_year ?? null, country: film.country ?? null, genre: film.genre ?? null,
          posterUrl: film.poster_url ?? null, posterFocus: { x: film.poster_focus_x ?? null, y: film.poster_focus_y ?? null }, posterColor: film.poster_color ?? null,
          bannerUrl: film.banner_url ?? null, bannerFocus: { x: film.banner_focus_x ?? null, y: film.banner_focus_y ?? null }, bannerColor: film.banner_color ?? null,
        },
      }
    }
    return null
  } catch (e) {
    console.error('[spotlight] could not load:', e)
    return null
  }
}
