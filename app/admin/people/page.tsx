import { requireAdmin } from '@/lib/admin'
import { PeopleManager } from '@/components/admin/PeopleManager'

export const dynamic = 'force-dynamic'

export default async function AdminPeoplePage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('people')
    .select('id, full_name, country, bio, verified, profile_image, imdb_id, website')
    .order('full_name', { ascending: true })

  const people = (data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Talent</p>
        <h1 className="text-2xl font-bold text-film-cream">People</h1>
      </div>
      <PeopleManager people={people} />
    </div>
  )
}
