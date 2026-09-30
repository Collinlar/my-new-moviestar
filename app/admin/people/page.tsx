import { requireAdmin } from '@/lib/admin'
import { PeopleManager, type AdminPerson } from '@/components/admin/PeopleManager'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ add?: string }>
}

export default async function AdminPeoplePage({ searchParams }: Props) {
  const { add } = await searchParams
  const { supabase } = await requireAdmin()

  const { data } = await (supabase as any)
    .from('people')
    .select(
      'id, slug, full_name, country, bio, verified, is_featured, profile_image, imdb_id, website, date_of_birth, date_of_death, aliases, socials, credits:movie_people(count)',
    )
    .order('full_name', { ascending: true })
    .limit(2000)

  const people: AdminPerson[] = ((data as any[]) || []).map(({ credits, ...p }) => ({
    ...p,
    aliases: p.aliases ?? [],
    socials: p.socials ?? {},
    credit_count: credits?.[0]?.count ?? 0,
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Talent</p>
        <h1 className="text-2xl font-bold text-film-cream">People</h1>
        <p className="text-sm text-film-muted mt-1">
          Every director, actor and crew member has one profile here. Films link to these profiles,
          and each profile gets its own page at /person/name.
        </p>
      </div>
      <PeopleManager people={people} initialAdd={add?.slice(0, 120)} />
    </div>
  )
}
