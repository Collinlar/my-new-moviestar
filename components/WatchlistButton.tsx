'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  movieId: string
  className?: string
}

export function WatchlistButton({ movieId, className = '' }: Props) {
  const [userId, setUserId]       = useState<string | null>(null)
  const [saved, setSaved]         = useState(false)
  const [loading, setLoading]     = useState(true)
  const [toggling, setToggling]   = useState(false)

  const supabase = createClient() as any

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) { setLoading(false); return }
      setUserId(user.id)
      supabase
        .from('watchlists')
        .select('id')
        .eq('movie_id', movieId)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }: any) => {
          setSaved(!!data)
          setLoading(false)
        })
    })
  }, [movieId])

  const toggle = async () => {
    if (!userId) return
    setToggling(true)
    if (saved) {
      const { error } = await supabase
        .from('watchlists')
        .delete()
        .eq('movie_id', movieId)
        .eq('user_id', userId)
      if (error) { toast.error('Could not remove from watchlist'); setToggling(false); return }
      setSaved(false)
      toast.success('Removed from watchlist')
    } else {
      const { error } = await supabase
        .from('watchlists')
        .insert({ movie_id: movieId, user_id: userId })
      if (error) { toast.error('Could not add to watchlist'); setToggling(false); return }
      setSaved(true)
      toast.success('Added to watchlist')
    }
    setToggling(false)
  }

  if (loading) {
    return (
      <button disabled className={`btn-outline opacity-50 ${className}`} aria-label="Loading watchlist status">
        <Bookmark className="w-4 h-4" />
        Watchlist
      </button>
    )
  }

  if (!userId) {
    return (
      <Link href={`/auth?next=/movie/${movieId}`} className={`btn-outline ${className}`}>
        <Bookmark className="w-4 h-4" />
        Add to watchlist
      </Link>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      className={`btn-outline transition-colors disabled:opacity-50 ${saved ? 'border-film-gold text-film-gold' : ''} ${className}`}
      aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      {saved ? (
        <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Bookmark className="w-4 h-4" aria-hidden="true" />
      )}
      {saved ? 'Saved' : 'Add to watchlist'}
    </button>
  )
}
