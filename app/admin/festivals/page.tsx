import { requireAdmin } from '@/lib/admin'
import { FestivalsManager } from '@/components/admin/FestivalsManager'

export const dynamic = 'force-dynamic'

export default async function AdminFestivalsPage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('festivals')
    .select('*')
    .order('founded', { ascending: true, nullsFirst: false })

  const festivals = (data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">Festivals</h1>
        <p className="text-sm text-film-muted mt-1">
          Manage the African film festivals directory. Festivals listed here power the public festivals page and link to award entries.
        </p>
      </div>
      <FestivalsManager festivals={festivals} />
    </div>
  )
}
