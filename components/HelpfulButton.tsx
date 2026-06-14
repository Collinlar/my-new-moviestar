'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  reviewId: string
  initialCount: number
}

export function HelpfulButton({ reviewId, initialCount }: Props) {
  const [count, setCount]   = useState(initialCount)
  const [voted, setVoted]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady]   = useState(false)

  const supabase = createClient() as any

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setReady(true); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle()
      setVoted(!!data)
      setReady(true)
    }
    init()
  }, [reviewId])

  const toggle = async () => {
    if (!userId) {
      window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`
      return
    }
    if (loading) return
    setLoading(true)

    if (voted) {
      const { error } = await supabase
        .from('helpful_votes')
        .delete()
        .eq('review_id', reviewId)
        .eq('user_id', userId)
      if (!error) {
        setVoted(false)
        setCount((c) => Math.max(0, c - 1))
      }
    } else {
      const { error } = await supabase
        .from('helpful_votes')
        .insert({ review_id: reviewId, user_id: userId })
      if (!error) {
        setVoted(true)
        setCount((c) => c + 1)
      } else {
        toast.error('Could not record your vote. Try again.')
      }
    }
    setLoading(false)
  }

  if (!ready) return null

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50 ${
        voted
          ? 'text-film-gold'
          : 'text-film-subtle hover:text-film-muted'
      }`}
      aria-pressed={voted}
      aria-label={voted ? 'Remove helpful vote' : 'Mark this review as helpful'}
    >
      <ThumbsUp
        className={`w-3.5 h-3.5 ${voted ? 'fill-current' : ''}`}
        aria-hidden="true"
      />
      {count > 0 && <span>{count}</span>}
      <span>{voted ? 'Helpful' : 'Helpful?'}</span>
    </button>
  )
}
