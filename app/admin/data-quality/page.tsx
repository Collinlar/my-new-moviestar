import { requireAdmin } from '@/lib/admin'
import { cleanTitle, findDuplicateGroups, guessCountry, isCleanTitle, suggestYear, yearOk } from '@/lib/data-quality'
import {
  DataQualityDesk, type BatchRow, type CountryRow, type DupGroup, type IndustryRow, type PosterRow, type TabKey, type TitleRow, type YearRow,
} from '@/components/admin/DataQualityDesk'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Data quality | Admin' }

const TABS: TabKey[] = ['country', 'industry', 'title', 'year', 'duplicates', 'posters']
const SHOW_MAX = 300

interface Film {
  id: string; title: string; release_year: number | null; country: string | null; language: string | null
  industry: string | null; listing_status: string; created_at: string
  poster_url?: string | null; poster_path?: string | null
}

/**
 * Every film, a thousand at a time (the database caps a single answer). `postersReady` is false when the poster upload
 * migration has not been run, in which case the poster columns are left out so the other tabs still work.
 */
async function loadFilms(db: any, withPosters: boolean): Promise<Film[]> {
  const out: Film[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('movies')
      .select('id, title, release_year, country, language, industry, listing_status, created_at' + (withPosters ? ', poster_url, poster_path' : ''))
      .order('created_at', { ascending: true })
      .range(from, from + 999)
    if (error || !data) break
    out.push(...(data as Film[]))
    if (data.length < 1000) break
  }
  return out
}

interface Props { searchParams: Promise<{ tab?: string }> }

export default async function DataQualityPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase } = await requireAdmin()
  const db = supabase as any
  const tab: TabKey = (TABS as string[]).includes(sp.tab ?? '') ? (sp.tab as TabKey) : 'country'

  // A one-row probe tells us whether the poster columns exist yet.
  const postersReady = !(await db.from('movies').select('poster_path').limit(1)).error
  const films = await loadFilms(db, postersReady)
  const blank = (s: string | null) => !s || !s.trim()

  // ---- countries: films with none, and what their title, language or description says ----
  const noCountry = films.filter((f) => blank(f.country))
  const text = new Map<string, { description: string | null; synopsis: string | null }>()
  if (tab === 'country') {
    for (let i = 0; i < noCountry.length; i += 100) {
      const ids = noCountry.slice(i, i + 100).map((f) => f.id)
      const { data } = await db.from('movies').select('id, description, synopsis').in('id', ids)
      for (const r of (data ?? []) as Array<{ id: string; description: string | null; synopsis: string | null }>) text.set(r.id, r)
    }
  }
  const countryRows: CountryRow[] = tab === 'country'
    ? noCountry.map((f) => ({
        id: f.id, title: f.title, year: f.release_year, status: f.listing_status, language: f.language,
        guess: guessCountry({ title: f.title, language: f.language, ...(text.get(f.id) ?? {}) }),
      })).sort((a, b) => Number(!!b.guess) - Number(!!a.guess) || a.title.localeCompare(b.title))
    : []

  // ---- industries that did not follow the country. The rule lives in the database (industry_for). ----
  const stuck = films.filter((f) => !blank(f.country) && (!f.industry || f.industry === 'Other'))
  const pairs = [...new Set(stuck.map((f) => `${f.country}\u0000${f.language ?? ''}`))]
  const rule = new Map<string, string>()
  await Promise.all(pairs.map(async (p) => {
    const [country, language] = p.split('\u0000')
    const { data } = await db.rpc('industry_for', { p_country: country, p_language: language || null })
    if (typeof data === 'string') rule.set(p, data)
  }))
  const industryAll = stuck
    .map((f) => ({ f, to: rule.get(`${f.country}\u0000${f.language ?? ''}`) ?? 'Other' }))
    .filter((x) => x.to !== 'Other')
  const industryRows: IndustryRow[] = tab === 'industry'
    ? industryAll.map(({ f, to }) => ({ id: f.id, title: f.title, year: f.release_year, status: f.listing_status, country: f.country ?? '', from: f.industry, to }))
    : []

  // ---- titles ----
  const titleAll = films.map((f) => ({ f, s: cleanTitle(f.title) })).filter((x) => x.s.changed || !isCleanTitle(x.f.title))
  const titleRows: TitleRow[] = tab === 'title'
    ? titleAll
        .filter((x) => x.s.changed)
        .map(({ f, s }) => ({
          id: f.id, title: f.title, year: f.release_year, status: f.listing_status,
          to: s.title, confidence: s.confidence, notes: s.notes, trailer: s.trailer,
          yearFrom: yearOk(f.release_year) ? null : s.year,
        }))
        .sort((a, b) => Number(a.confidence === 'review') - Number(b.confidence === 'review') || a.title.localeCompare(b.title))
    : []

  // ---- years ----
  const noYear = films.filter((f) => !yearOk(f.release_year))
  const yearRows: YearRow[] = tab === 'year'
    ? noYear.map((f) => ({ id: f.id, title: f.title, status: f.listing_status, from: f.release_year, to: suggestYear(f.title) }))
        .sort((a, b) => Number(!!b.to) - Number(!!a.to) || a.title.localeCompare(b.title))
    : []

  // ---- duplicates ----
  // A group is settled once every extra copy is already rejected, archived or delisted.
  const SETTLED = ['rejected', 'archived', 'delisted']
  const dupAll = findDuplicateGroups(films).filter((g) => g.extras.some((e) => !SETTLED.includes(e.listing_status)))
  const dupGroups: DupGroup[] = tab === 'duplicates'
    ? dupAll.map((g) => ({
        key: g.key,
        films: [g.keeper, ...g.extras].map((f) => ({ id: f.id, title: f.title, year: f.release_year, status: f.listing_status, created: f.created_at })),
        keeperId: g.keeper.id,
      }))
    : []

  // ---- posters: films with no uploaded poster, listed first, then those with no picture at all ----
  const posterKind = (f: Film): PosterRow['kind'] => !f.poster_url ? 'none' : /img\.youtube\.com\/vi\//.test(f.poster_url) ? 'thumbnail' : 'link'
  const posterAll = postersReady ? films.filter((f) => !f.poster_path) : []
  const posterRows: PosterRow[] = tab === 'posters'
    ? posterAll
        .map((f) => ({ id: f.id, title: f.title, year: f.release_year, status: f.listing_status, url: f.poster_url ?? null, kind: posterKind(f) }))
        .sort((a, b) => Number(b.status === 'approved') - Number(a.status === 'approved') || Number(b.kind === 'none') - Number(a.kind === 'none') || a.title.localeCompare(b.title))
    : []

  // ---- recent batches, for undo ----
  const { data: changeRows, error: changeError } = await db
    .from('movie_data_changes')
    .select('batch_id, field, created_at, reverted_at, seq')
    .order('seq', { ascending: false })
    .limit(600)
  const byBatch = new Map<string, BatchRow>()
  for (const r of (changeRows ?? []) as Array<{ batch_id: string; field: string; created_at: string; reverted_at: string | null }>) {
    const b = byBatch.get(r.batch_id) ?? { id: r.batch_id, at: r.created_at, changes: 0, reverted: 0, fields: [] }
    b.changes += 1
    if (r.reverted_at) b.reverted += 1
    if (!b.fields.includes(r.field)) b.fields.push(r.field)
    byBatch.set(r.batch_id, b)
  }
  const batches = [...byBatch.values()].slice(0, 8)

  const counts = {
    country: noCountry.length,
    countryGuessed: tab === 'country' ? countryRows.filter((r) => r.guess).length : null,
    industry: industryAll.length,
    title: titleAll.filter((x) => x.s.changed).length,
    titleUnclean: films.filter((f) => !isCleanTitle(f.title)).length,
    year: noYear.length,
    duplicates: dupAll.length,
    posters: postersReady ? posterAll.length : null,
    total: films.length,
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Data quality</h1>
        <p className="text-sm text-film-muted mt-1 max-w-2xl">
          Fix what is missing or messy across the whole catalogue at once. Each tab suggests changes. You read them, untick the wrong ones, and apply the rest.
          Every batch is logged and can be undone.
        </p>
      </div>
      <DataQualityDesk
        tab={tab}
        counts={counts}
        showMax={SHOW_MAX}
        countryRows={countryRows}
        industryRows={industryRows}
        titleRows={titleRows}
        yearRows={yearRows}
        dupGroups={dupGroups}
        posterRows={posterRows}
        batches={batches}
        logReady={!changeError}
      />
    </div>
  )
}
