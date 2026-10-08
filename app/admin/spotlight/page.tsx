import { requireAdmin } from '@/lib/admin'
import { SpotlightManager, type AdminFilm, type LogItem, type SpotlightItem } from '@/components/admin/SpotlightManager'
import type { SpotlightRow } from '@/lib/spotlight'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Spotlight | Admin' }

const ROW = 'id, movie_id, headline, line, cta_kind, audience, starts_at, ends_at, priority, status'
const FILM_BASE = 'id, title, release_year, country, genre, poster_url, listing_status'
const FILM_IMAGES = ', poster_focus_x, poster_focus_y, poster_color, banner_url, banner_focus_x, banner_focus_y, banner_color'

export default async function AdminSpotlightPage() {
  const { supabase, user } = await requireAdmin()
  const db = supabase as any
  const now = Date.now()

  const { data: rows, error } = await db.from('spotlights').select(ROW).order('starts_at', { ascending: false }).limit(200)
  const ready = !error

  let items: SpotlightItem[] = []
  let log: LogItem[] = []
  if (ready && rows?.length) {
    const ids = [...new Set((rows as SpotlightRow[]).map((r) => r.movie_id))]
    let { data: films, error: fe } = await db.from('movies').select(FILM_BASE + FILM_IMAGES).in('id', ids)
    if (fe) ({ data: films } = await db.from('movies').select(FILM_BASE).in('id', ids))
    const byId = new Map<string, AdminFilm>((films ?? []).map((m: any) => [m.id, {
      id: m.id, title: m.title, year: m.release_year ?? null, country: m.country ?? null, genre: m.genre ?? null, listed: m.listing_status === 'approved',
      posterUrl: m.poster_url ?? null, posterFocus: { x: m.poster_focus_x ?? null, y: m.poster_focus_y ?? null }, posterColor: m.poster_color ?? null,
      bannerUrl: m.banner_url ?? null, bannerFocus: { x: m.banner_focus_x ?? null, y: m.banner_focus_y ?? null }, bannerColor: m.banner_color ?? null,
    }]))

    const { data: daily } = await db.from('spotlight_daily').select('spotlight_id, day, views, taps').in('spotlight_id', (rows as SpotlightRow[]).map((r) => r.id))
    const cutoff = new Date(now - 7 * 86_400_000).toISOString().slice(0, 10)
    const totals = new Map<string, { views: number; taps: number; views7: number; taps7: number }>()
    for (const d of daily ?? []) {
      const t = totals.get(d.spotlight_id) ?? { views: 0, taps: 0, views7: 0, taps7: 0 }
      t.views += d.views; t.taps += d.taps
      if (d.day >= cutoff) { t.views7 += d.views; t.taps7 += d.taps }
      totals.set(d.spotlight_id, t)
    }
    items = (rows as SpotlightRow[]).map((row) => ({ row, film: byId.get(row.movie_id) ?? null, ...(totals.get(row.id) ?? { views: 0, taps: 0, views7: 0, taps7: 0 }) }))
  }
  if (ready) {
    const { data } = await db.from('spotlight_log').select('id, action, headline, changes, actor, at').order('id', { ascending: false }).limit(30)
    log = (data ?? []) as LogItem[]
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Spotlight</h1>
        <p className="mt-2 text-sm text-film-muted max-w-2xl">
          One listed film, put at the top of the homepage for a set time, with your headline and a button. Spotlights are editorial: there is no sponsor and no
          paid placement, and that is what makes it worth tapping. When none is live, the homepage shows no Spotlight at all.
        </p>
      </div>
      <SpotlightManager items={items} log={log} adminId={user.id} ready={ready} now={now} />
    </div>
  )
}
