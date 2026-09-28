import { requireAdmin } from '@/lib/admin'
import { ClubCyclesManager } from '@/components/admin/ClubCyclesManager'

export const dynamic = 'force-dynamic'

export default async function AdminClubPage() {
  const { supabase } = await requireAdmin()

  const { data: cycles } = await (supabase as any)
    .from('club_cycles')
    .select('id, cycle_number, title_override, starts_at, ends_at, status, movie:movies(id, title, poster_url, release_year)')
    .order('cycle_number', { ascending: false })

  const { data: movies } = await (supabase as any)
    .from('movies')
    .select('id, title, release_year, poster_url')
    .order('title', { ascending: true })
    .limit(500)

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Club</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Club Cycles
          <span className="ml-2 text-base font-normal text-film-muted">
            ({(cycles ?? []).length})
          </span>
        </h1>
      </div>

      <ClubCyclesManager
        cycles={(cycles as any[]) ?? []}
        movieOptions={(movies as any[]) ?? []}
      />
    </div>
  )
}
