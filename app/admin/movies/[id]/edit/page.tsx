import { requireAdmin } from '@/lib/admin'
import { MovieForm } from '@/components/admin/MovieForm'
import { notFound } from 'next/navigation'
import type { Movie } from '@/lib/queries'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditMoviePage({ params }: Props) {
  const { id } = await params
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('movies')
    .select('*')
    .eq('id', id)
    .single()

  if (!data) notFound()

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Movies</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Edit: <span className="text-film-gold">{(data as Movie).title}</span>
        </h1>
      </div>
      <MovieForm movie={data as Movie} />
    </div>
  )
}
