import { requireAdmin } from '@/lib/admin'
import { MovieForm } from '@/components/admin/MovieForm'
import { notFound } from 'next/navigation'
import { draftsFromRows, type CreditRow } from '@/lib/credits'
import type { Movie } from '@/lib/queries'
import { PosterStudio, type StudioImage } from '@/components/admin/PosterStudio'

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
  const movie = data as Movie

  // The latest upload record for each kind holds the original, so the crop can be adjusted without uploading again.
  const { data: imageRows } = await (supabase as any)
    .from('movie_images')
    .select('kind, original_path, crop, quality, bytes, src_width, src_height, removed_at, created_at')
    .eq('movie_id', id)
    .is('removed_at', null)
    .order('created_at', { ascending: false })
  const latest = (kind: 'poster' | 'banner') => (imageRows ?? []).find((r: any) => r.kind === kind)
  const image = (kind: 'poster' | 'banner'): StudioImage => {
    const row = latest(kind)
    const path = kind === 'poster' ? movie.poster_path : movie.banner_path
    const uploaded = !!path && !!row
    return {
      url: kind === 'poster' ? movie.poster_url : movie.banner_url ?? null,
      uploaded,
      color: (kind === 'poster' ? movie.poster_color : movie.banner_color) ?? null,
      focusX: (kind === 'poster' ? movie.poster_focus_x : movie.banner_focus_x) ?? null,
      focusY: (kind === 'poster' ? movie.poster_focus_y : movie.banner_focus_y) ?? null,
      originalPath: uploaded ? row.original_path : null,
      originalUrl: uploaded ? supabase.storage.from('posters').getPublicUrl(row.original_path).data.publicUrl : null,
      crop: uploaded ? row.crop : null,
      quality: uploaded ? row.quality : null,
      bytes: uploaded ? row.bytes : null,
      sourceWidth: uploaded ? row.src_width : null,
      sourceHeight: uploaded ? row.src_height : null,
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Movies</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Edit: <span className="text-film-gold">{(data as Movie).title}</span>
        </h1>
      </div>
      <PosterStudio movieId={movie.id} title={movie.title} poster={image('poster')} banner={image('banner')} />
      <MovieForm movie={movie} initialCredits={draftsFromRows((creditRows as CreditRow[]) || [])} />
    </div>
  )
}
