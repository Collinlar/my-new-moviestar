import { requireAdmin } from '@/lib/admin'
import { CanonManager } from '@/components/admin/CanonManager'

export const dynamic = 'force-dynamic'

export default async function AdminCanonPage() {
  const { supabase } = await requireAdmin()

  const [canonResult, moviesResult] = await Promise.all([
    supabase
      .from('movies')
      .select('id, title, release_year, poster_url, is_canon, canon_essay, canon_essay_author, director')
      .eq('is_canon', true)
      .order('title', { ascending: true }),
    supabase
      .from('movies')
      .select('id, title, release_year, poster_url, director')
      .order('title', { ascending: true }),
  ])

  const films     = (canonResult.data as any[]) || []
  const allMovies = (moviesResult.data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Canon</h1>
        <p className="text-sm text-film-muted mt-1">
          The definitive collection of landmark African films. Add films, write editorial essays, and manage the canon list.
        </p>
      </div>
      <CanonManager films={films} allMovies={allMovies} />
    </div>
  )
}
