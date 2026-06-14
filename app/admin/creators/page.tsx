import { requireAdmin } from '@/lib/admin'
import { CreatorsManager } from '@/components/admin/CreatorsManager'

export const dynamic = 'force-dynamic'

export default async function AdminCreatorsPage() {
  const { supabase } = await requireAdmin()

  const { data: creators } = await supabase
    .from('creators')
    .select('id, name, bio, image_url')
    .order('name', { ascending: true })

  // Attach movie counts
  const withCounts = await Promise.all(
    ((creators as any[]) || []).map(async (c: any) => {
      const { count } = await supabase
        .from('movies')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', c.id)
      return { ...c, movie_count: count ?? 0 }
    })
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Talent</p>
        <h1 className="text-2xl font-bold text-film-cream">Creators</h1>
        <p className="text-sm text-film-muted mt-1">
          Filmmakers linked to movies via the creator_id field.
        </p>
      </div>
      <CreatorsManager creators={withCounts} />
    </div>
  )
}
