import { requireAdmin } from '@/lib/admin'
import { SelectionsManager } from '@/components/admin/SelectionsManager'

export const dynamic = 'force-dynamic'

export default async function AdminSelectionsPage() {
  const { supabase } = await requireAdmin()

  const { data: selections } = await (supabase as any)
    .from('selections')
    .select('id, slug, title, label, period, status, selection_items(count)')
    .order('period', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Selections
          <span className="ml-2 text-base font-normal text-film-muted">({(selections ?? []).length})</span>
        </h1>
        <p className="mt-2 text-sm text-film-muted max-w-xl">
          A Selection is an editorial recommendation: a short set of listed films, each with a line on why it is there. It sits above Listed on the prestige ladder, and it is not an award. Only listed films can be added, and nothing can be paid for.
        </p>
      </div>
      <SelectionsManager selections={(selections as any[]) ?? []} />
    </div>
  )
}
