import { requireAdmin } from '@/lib/admin'
import { ListingTriage } from '@/components/admin/ListingTriage'
import {
  LISTING_STATUSES, QUEUE_COLUMNS, QUEUE_TABS, TRANSITION_MIN_POOL,
  type ListingStatus, type QueueRow, type QueueTabKey, type SortKey,
} from '@/lib/listing'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Listing queue | Admin' }

const PAGE_SIZE = 50

const SORTS: Record<SortKey, (q: any) => any> = {
  complete: (q) => q.order('completeness', { ascending: false }).order('title', { ascending: true }),
  az:       (q) => q.order('title', { ascending: true }),
  newest:   (q) => q.order('created_at', { ascending: false }),
  year:     (q) => q.order('release_year', { ascending: false, nullsFirst: false }).order('title', { ascending: true }),
}

// Keep user text from becoming filter syntax or LIKE wildcards.
const plain = (s: string) => s.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)

interface Props {
  searchParams: Promise<{ tab?: string; q?: string; industry?: string; ready?: string; missing?: string; sort?: string; page?: string }>
}

export default async function AdminListingPage({ searchParams }: Props) {
  const sp = await searchParams
  const { supabase, user } = await requireAdmin()

  const tabKey = (QUEUE_TABS.find(t => t.key === sp.tab)?.key ?? 'todo') as QueueTabKey
  const tab = QUEUE_TABS.find(t => t.key === tabKey)!
  const sort: SortKey = (sp.sort && sp.sort in SORTS ? sp.sort : 'complete') as SortKey
  const search = plain(sp.q ?? '')
  const industry = sp.industry ?? ''
  const ready = sp.ready === '1'
  const missingCountry = sp.missing === 'country'
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('movie_listing_queue_scored')
    .select(QUEUE_COLUMNS, { count: 'exact' })
    .in('listing_status', [...tab.statuses])
  if (search) query = query.ilike('title', `%${search}%`)
  if (industry) query = query.eq('industry', industry)
  if (ready) query = query.eq('hard_ready', true)
  if (missingCountry) query = query.eq('ok_country', false)
  query = SORTS[sort](query).range(from, from + PAGE_SIZE - 1)

  const [{ data, count, error }, ...statusCounts] = await Promise.all([
    query,
    ...LISTING_STATUSES.map(s =>
      supabase.from('movies').select('id', { count: 'exact', head: true }).eq('listing_status', s),
    ),
  ])

  const counts = Object.fromEntries(
    LISTING_STATUSES.map((s, i) => [s, (statusCounts[i] as any).count ?? 0]),
  ) as Record<ListingStatus, number>

  return (
    <div className="p-8">
      <div className="mb-6">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Listing queue</h1>
        <p className="text-sm text-film-muted mt-1 max-w-2xl">
          Decide which films are listed on MuvieStars. Listed films appear in Swipe and curated discovery.
          Every other film keeps its page but stays out of discovery.
        </p>
      </div>

      {error ? (
        <div className="cinema-card p-6 text-sm text-film-muted">
          The queue could not load. The listing migration may not have been run on this database yet.
          Run <code className="text-film-gold">20260930000002_catalogue_listing.sql</code> in the Supabase SQL editor, then reload.
        </div>
      ) : (
        <ListingTriage
          key={`${tabKey}|${search}|${industry}|${ready}|${missingCountry}|${sort}|${page}`}
          rows={(data ?? []) as unknown as QueueRow[]}
          counts={counts}
          total={count ?? 0}
          tab={tabKey}
          page={page}
          pageSize={PAGE_SIZE}
          filters={{ q: search, industry, ready, missingCountry, sort }}
          adminId={user.id}
          transitionMinPool={TRANSITION_MIN_POOL}
        />
      )}
    </div>
  )
}
