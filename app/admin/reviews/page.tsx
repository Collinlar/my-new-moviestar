import { requireAdmin } from '@/lib/admin'
import { AllReviewsTable } from '@/components/admin/AllReviewsTable'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

const TABS = [
  { value: 'all',      label: 'All'      },
  { value: 'pending',  label: 'Pending'  },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
]

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin()
  const sp = await searchParams
  const status = sp.status || 'all'
  const page = Math.max(1, Number(sp.page || 1))
  const perPage = 40
  const offset = (page - 1) * perPage

  let query = supabase
    .from('reviews')
    .select('id, rating, content, created_at, status, movie:movies(id, title), profile:profiles(display_name, username)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (status !== 'all') query = query.eq('status', status)

  const { data, count } = await query
  const reviews = (data as any[]) || []
  const total = count ?? 0
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Community</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Reviews
          <span className="ml-2 text-base font-normal text-film-muted">({total.toLocaleString()})</span>
        </h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-cinema-border">
        {TABS.map(tab => (
          <Link
            key={tab.value}
            href={`/admin/reviews?status=${tab.value}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              status === tab.value
                ? 'border-film-gold text-film-gold'
                : 'border-transparent text-film-muted hover:text-film-cream'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <AllReviewsTable reviews={reviews} statusFilter={status} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm">
          <span className="text-film-muted">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/reviews?status=${status}&page=${page - 1}`} className="btn-outline py-1.5 px-3 text-xs">
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/admin/reviews?status=${status}&page=${page + 1}`} className="btn-outline py-1.5 px-3 text-xs">
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
