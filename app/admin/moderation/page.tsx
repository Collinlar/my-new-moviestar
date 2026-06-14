import { requireAdmin } from '@/lib/admin'
import { ModerationQueue } from '@/components/admin/ModerationQueue'

export const dynamic = 'force-dynamic'

export default async function ModerationPage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('reviews')
    .select('id, rating, content, created_at, status, movie:movies(title), profile:profiles(display_name, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  const reviews = (data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Content</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Moderation
          {reviews.length > 0 && (
            <span className="ml-2 text-base font-normal text-film-muted">({reviews.length} pending)</span>
          )}
        </h1>
      </div>

      <div className="cinema-card overflow-hidden">
        <ModerationQueue reviews={reviews} />
      </div>
    </div>
  )
}
