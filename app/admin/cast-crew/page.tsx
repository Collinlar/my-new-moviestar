import { requireAdmin } from '@/lib/admin'
import { CastCrewManager } from '@/components/admin/CastCrewManager'

export const dynamic = 'force-dynamic'

export default async function AdminCastCrewPage() {
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
        <h1 className="text-2xl font-bold text-film-cream">Cast &amp; Crew</h1>
        <p className="text-sm text-film-muted mt-1">
          Manage cast and behind-the-camera credits per film.
        </p>
      </div>
      <CastCrewManager movies={movies} />
    </div>
  )
}
