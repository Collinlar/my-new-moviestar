'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface ExistingReview {
  id: string
  rating: number
  content: string
  status: string
}

interface Props {
  movieId: string
}

export function ReviewForm({ movieId }: Props) {
  const [userId, setUserId]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)
  const [existing, setExisting]   = useState<ExistingReview | null>(null)
  const [rating, setRating]       = useState(0)
  const [hovered, setHovered]     = useState(0)
  const [content, setContent]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]           = useState(false)

  const supabase = createClient() as any

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase
        .from('reviews')
        .select('id, rating, content, status')
        .eq('movie_id', movieId)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          if (data) {
            setExisting(data)
            setRating(data.rating)
            setContent(data.content || '')
          }
          setLoading(false)
        })
    })
  }, [movieId])

  const submit = async () => {
    if (!rating) { toast.error('Pick a star rating first'); return }
    setSubmitting(true)

    if (existing) {
      const { error } = await supabase
        .from('reviews')
        .update({ rating, content: content.trim(), status: 'pending' })
        .eq('id', existing.id)
      if (error) { toast.error('Could not save your review'); setSubmitting(false); return }
      toast.success('Review updated. It will appear after approval.')
    } else {
      const { error } = await supabase
        .from('reviews')
        .insert({ movie_id: movieId, user_id: userId, rating, content: content.trim(), status: 'pending' })
      if (error) { toast.error('Could not submit your review'); setSubmitting(false); return }
      toast.success('Review submitted. It will appear after approval.')
    }

    setSubmitting(false)
    setDone(true)
  }

  if (loading) return null

  if (!userId) {
    return (
      <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-film-muted">Sign in to share your thoughts on this film.</p>
        <Link href={`/auth?next=/movie/${movieId}`} className="btn-gold text-sm flex-shrink-0">
          Sign in to review
        </Link>
      </div>
    )
  }

  if (done || (existing && existing.status === 'pending')) {
    return (
      <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6">
        <p className="text-sm text-film-muted">
          {done
            ? 'Your review has been submitted and is awaiting approval.'
            : 'Your review is awaiting approval.'}
        </p>
      </div>
    )
  }

  if (existing && existing.status === 'approved') {
    return (
      <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6">
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`w-4 h-4 ${n <= existing.rating ? 'text-film-amber fill-current' : 'text-cinema-border'}`}
              aria-hidden="true"
            />
          ))}
          <span className="ml-2 text-xs text-film-muted">Your review</span>
        </div>
        {existing.content && (
          <p className="text-sm text-film-muted">{existing.content}</p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-film-cream mb-4">
        {existing ? 'Edit your review' : 'Write your review'}
      </h3>

      <div className="flex gap-1 mb-4" role="group" aria-label="Star rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            className="focus:outline-none"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                n <= (hovered || rating)
                  ? 'text-film-amber fill-current'
                  : 'text-cinema-border hover:text-film-amber/50'
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-film-muted self-center">{rating}/5</span>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What did you think of this film?"
        rows={3}
        className="cinema-input w-full resize-none text-sm mb-4"
      />

      <button
        onClick={submit}
        disabled={submitting || !rating}
        className="btn-gold text-sm disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : existing ? 'Update review' : 'Submit review'}
      </button>
    </div>
  )
}
