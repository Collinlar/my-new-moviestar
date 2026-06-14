'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Star, Check, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type Status = 'pending' | 'approved' | 'rejected'

interface ReviewRow {
  id: string
  rating: number
  content: string
  created_at: string
  status: Status
  movie: { id: string; title: string } | null
  profile: { display_name?: string; username?: string } | null
}

const STATUS_UI: Record<Status, { label: string; cls: string }> = {
  pending:  { label: 'Pending',  cls: 'bg-film-gold/10 text-film-gold'   },
  approved: { label: 'Approved', cls: 'bg-green-500/10 text-green-400'   },
  rejected: { label: 'Rejected', cls: 'bg-red-500/10  text-red-400'      },
}

interface Props {
  reviews: ReviewRow[]
  statusFilter: string
}

export function AllReviewsTable({ reviews: initial, statusFilter }: Props) {
  const [reviews, setReviews] = useState(initial)
  const [acting, setActing]   = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient() as any

  const setStatus = async (id: string, status: Status) => {
    setActing(id)
    const { error } = await supabase.from('reviews')
      .update({ status, moderated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) { toast.error('Could not update review'); setActing(null); return }
    setReviews(p => p.map(r => r.id === id ? { ...r, status } : r))
    toast.success(`Review ${status}`)
    setActing(null)
    router.refresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this review? This cannot be undone.')) return
    setActing(id)
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) { toast.error('Could not delete'); setActing(null); return }
    setReviews(p => p.filter(r => r.id !== id))
    toast.success('Review deleted')
    setActing(null)
    router.refresh()
  }

  if (!reviews.length) {
    return (
      <div className="cinema-card p-12 text-center text-film-muted text-sm">
        No {statusFilter !== 'all' ? statusFilter : ''} reviews found.
      </div>
    )
  }

  return (
    <div className="cinema-card overflow-hidden divide-y divide-cinema-border">
      {reviews.map(review => {
        const ui = STATUS_UI[review.status] ?? STATUS_UI.pending
        return (
          <div key={review.id} className="p-5 hover:bg-cinema-surface/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-medium text-film-cream text-sm">
                    {review.profile?.display_name || review.profile?.username || 'Anonymous'}
                  </span>
                  <span className="text-film-subtle text-xs">on</span>
                  <span className="text-film-gold text-sm">{review.movie?.title ?? '—'}</span>
                  <span className="flex items-center gap-0.5 text-film-amber text-xs font-semibold">
                    <Star className="w-3 h-3" fill="currentColor" />
                    {review.rating}/5
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ui.cls}`}>
                    {ui.label}
                  </span>
                </div>

                <p className="text-film-muted text-sm leading-relaxed line-clamp-2">{review.content}</p>

                <p className="text-film-subtle text-xs mt-1.5">
                  {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {review.status !== 'approved' && (
                  <button onClick={() => setStatus(review.id, 'approved')} disabled={acting === review.id}
                    title="Approve"
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-green-400 hover:bg-green-400/10 transition-colors disabled:opacity-40">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
                {review.status !== 'rejected' && (
                  <button onClick={() => setStatus(review.id, 'rejected')} disabled={acting === review.id}
                    title="Reject"
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => remove(review.id)} disabled={acting === review.id}
                  title="Delete"
                  className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
