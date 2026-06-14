'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, X, Star } from 'lucide-react'
import { toast } from 'sonner'

interface ReviewRow {
  id: string
  rating: number
  content: string
  created_at: string
  status: string
  movie: { title: string } | null
  profile: { display_name?: string; username?: string } | null
}

interface Props {
  reviews: ReviewRow[]
}

export function ModerationQueue({ reviews: initial }: Props) {
  const [reviews, setReviews] = useState(initial)
  const [acting, setActing] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient() as any

  const act = async (id: string, status: 'approved' | 'rejected') => {
    setActing(id)
    const { error } = await supabase
      .from('reviews')
      .update({ status, moderated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      toast.error('Could not update review')
      setActing(null)
      return
    }

    setReviews(prev => prev.filter(r => r.id !== id))
    toast.success(status === 'approved' ? 'Review approved' : 'Review rejected')
    setActing(null)
    router.refresh()
  }

  if (!reviews.length) {
    return (
      <div className="text-center py-20">
        <Check className="w-8 h-8 text-film-muted mx-auto mb-3" aria-hidden="true" />
        <p className="text-film-muted text-sm">No reviews waiting for approval.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-cinema-border">
      {reviews.map(review => (
        <div key={review.id} className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-medium text-film-cream text-sm">
                  {review.profile?.display_name || review.profile?.username || 'Anonymous'}
                </span>
                <span className="text-film-subtle text-xs">on</span>
                <span className="text-film-gold text-sm font-medium">{review.movie?.title ?? 'Unknown film'}</span>
                <span className="flex items-center gap-0.5 text-film-amber text-xs font-semibold ml-1">
                  <Star className="w-3 h-3" fill="currentColor" aria-hidden="true" />
                  {review.rating}/5
                </span>
              </div>
              <p className="text-film-muted text-sm leading-relaxed line-clamp-3">{review.content}</p>
              <p className="text-film-subtle text-xs mt-2">
                {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => act(review.id, 'approved')}
                disabled={acting === review.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-40"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                Approve
              </button>
              <button
                onClick={() => act(review.id, 'rejected')}
                disabled={acting === review.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
                Reject
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
