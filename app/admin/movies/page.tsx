import { requireAdmin } from '@/lib/admin'
import Link from 'next/link'
import { MovieTable } from '@/components/admin/MovieTable'
import { Plus } from 'lucide-react'
import type { Movie } from '@/lib/queries'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function AdminMoviesPage({ searchParams }: PageProps) {
  const { supabase } = await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page || 1))
  const perPage = 50
  const offset = (page - 1) * perPage

  let query = supabase
    .from('movies')
    .select('id, title, genre, language, release_year, country, director, featured, is_canon, average_rating, review_count, poster_url, youtube_url, description', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  if (sp.q) {
    query = query.or(`title.ilike.%${sp.q}%,director.ilike.%${sp.q}%`)
  }

  const { data, count } = await query
  const movies = (data as Movie[]) || []
  const total = count ?? 0
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="section-label mb-1">Content</p>
          <h1 className="text-2xl font-bold text-film-cream">
            Movies
            <span className="ml-2 text-base font-normal text-film-muted">({total.toLocaleString()})</span>
          </h1>
        </div>
        <Link href="/admin/movies/add" className="btn-gold">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add movie
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Search by title or director..."
          className="cinema-input max-w-sm"
        />
      </form>

      {/* Table */}
      <div className="cinema-card overflow-hidden">
        <MovieTable movies={movies} />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 text-sm">
          <span className="text-film-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/movies?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page - 1) })}`}
                className="btn-outline py-1.5 px-3 text-xs"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/movies?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), page: String(page + 1) })}`}
                className="btn-outline py-1.5 px-3 text-xs"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
