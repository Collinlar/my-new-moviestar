import { requireAdmin } from '@/lib/admin'
import { AwardsManager } from '@/components/admin/AwardsManager'

export const dynamic = 'force-dynamic'

export default async function AdminAwardsPage() {
  const { supabase } = await requireAdmin()

  const [moviesResult, festivalsResult] = await Promise.all([
    supabase
      .from('movies')
      .select('id, title, release_year')
      .order('title', { ascending: true }),
    supabase
      .from('festivals')
      .select('id, name, short_name')
      .order('name', { ascending: true }),
  ])

  const movies   = (moviesResult.data as any[]) || []
  const festivals = (festivalsResult.data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Awards</h1>
        <p className="text-sm text-film-muted mt-1">
          Track festival selections, nominations and wins per film.
        </p>
      </div>
      <AwardsManager movies={movies} festivals={festivals} />
    </div>
  )
}
