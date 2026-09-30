import { requireAdmin } from '@/lib/admin'
import { MovieForm } from '@/components/admin/MovieForm'
import { notFound } from 'next/navigation'
import { draftsFromRows, type CreditRow } from '@/lib/credits'
import type { Movie } from '@/lib/queries'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditMoviePage({ params }: Props) {
  const { id } = await params
  const { supabase } = await requireAdmin()

  const [{ data }, { data: creditRows }] = await Promise.all([
    supabase.from('movies').select('*').eq('id', id).single(),
    (supabase as any)
      .from('movie_people')
      .select('id, role, character_name, billing_order, person:people(id, slug, full_name, profile_image, country)')
      .eq('movie_id', id),
  ])

  if (!data) notFound()

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Movies</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Edit: <span className="text-film-gold">{(data as Movie).title}</span>
        </h1>
      </div>
      <MovieForm movie={data as Movie} initialCredits={draftsFromRows((creditRows as CreditRow[]) || [])} />
    </div>
  )
}
