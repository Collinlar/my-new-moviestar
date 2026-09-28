'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const REACTION_LABELS: Record<string, { text: string; color: string; bg: string }> = {
  loved:      { text: 'You loved this',          color: '#C8963E', bg: 'rgba(200,150,62,0.12)' },
  liked:      { text: 'You liked this',           color: '#7FA88B', bg: 'rgba(127,168,139,0.12)' },
  okay:       { text: 'You thought it was okay',  color: '#8FA8C8', bg: 'rgba(143,168,200,0.12)' },
  not_for_me: { text: 'Not for you',              color: '#A39B8F', bg: 'rgba(163,155,143,0.1)'  },
}

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

interface Props {
  movieId: string
}

export function PersonalContext({ movieId }: Props) {
  const [reaction, setReaction]     = useState<string | null>(null)
  const [watchLater, setWatchLater] = useState(false)
  const [loading, setLoading]       = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: rxn }, { data: interaction }] = await Promise.all([
        (supabase as any)
          .from('movie_reactions')
          .select('reaction')
          .eq('movie_id', movieId)
          .eq('user_id', user.id)
          .maybeSingle(),
        (supabase as any)
          .from('watchlists')
          .select('id')
          .eq('movie_id', movieId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      setReaction(rxn?.reaction ?? null)
      setWatchLater(!!interaction)
      setLoading(false)
    }
    load()
  }, [movieId])

  if (loading) return null
  if (!reaction && !watchLater) return null

  const rxnMeta = reaction ? REACTION_LABELS[reaction] : null

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px', borderRadius: '14px',
        background: '#15120E', border: '1px solid rgba(237,228,210,0.08)',
        flexWrap: 'wrap',
      }}
      aria-label="Your reaction to this film"
    >
      {rxnMeta && (
        <span
          style={{
            height: '32px', padding: '0 14px', borderRadius: '999px',
            background: rxnMeta.bg, color: rxnMeta.color,
            fontSize: '14px', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center',
            ...MONO,
          }}
        >
          {rxnMeta.text}
        </span>
      )}
      {watchLater && !reaction && (
        <span
          style={{
            height: '32px', padding: '0 14px', borderRadius: '999px',
            background: 'rgba(143,168,200,0.1)', color: '#8FA8C8',
            fontSize: '14px', display: 'inline-flex', alignItems: 'center',
            ...MONO,
          }}
        >
          Saved to Watch Later
        </span>
      )}
      {!reaction && (
        <Link
          href="#community-reviews"
          style={{
            height: '32px', padding: '0 14px', borderRadius: '999px',
            background: 'rgba(200,150,62,0.15)', color: '#C8963E',
            fontSize: '14px', display: 'inline-flex', alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          React now
        </Link>
      )}
    </div>
  )
}
