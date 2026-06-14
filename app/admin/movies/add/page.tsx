import { requireAdmin } from '@/lib/admin'
import { MovieForm } from '@/components/admin/MovieForm'

export const metadata = { title: 'Add Movie — Admin' }

export default async function AddMoviePage() {
  await requireAdmin()
  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Movies</p>
        <h1 className="text-2xl font-bold text-film-cream">Add a movie</h1>
      </div>
      <MovieForm />
    </div>
  )
}
