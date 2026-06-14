import { requireAdmin } from '@/lib/admin'
import { AwardsManager } from '@/components/admin/AwardsManager'

export const dynamic = 'force-dynamic'

export default async function AdminAwardsPage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('movies')
    .select('id, title, release_year')
    .order('title', { ascending: true })

  const movies = (data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Awards</h1>
        <p className="text-sm text-film-muted mt-1">
          Track festival selections, nominations and wins per film.
        </p>
      </div>
      <AwardsManager movies={movies} />
    </div>
  )
}
