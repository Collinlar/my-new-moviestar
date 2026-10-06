'use client'

import { useEffect, useState } from 'react'
import { NavLink } from '@/components/NavLink'
import { createClient } from '@/lib/supabase/client'

interface Props {
  movieId: string
  title: string
}

/**
 * Shown on films that are not listed yet. A nomination asks the editors to take a look.
 * The film page is cached for everyone, so who is signed in and what they nominated loads here.
 */
export function NominateButton({ movieId, title }: Props) {
  const supabase = createClient() as any
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const [nominated, setNominated] = useState(false)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const [{ data: { user } }, countRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc('nomination_count', { p_movie: movieId }),
      ])
      setSignedIn(!!user)
      setCount(typeof countRes?.data === 'number' ? countRes.data : 0)
      if (user) {
        const { data } = await supabase.from('movie_nominations').select('id').eq('movie_id', movieId).eq('user_id', user.id).maybeSingle()
        setNominated(!!data)
      }
    } catch {
      // The film is still readable without the nomination prompt.
    } finally {
      setReady(true)
    }
  }

  useEffect(() => { load() }, [movieId]) // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (action: 'nominate' | 'withdraw') => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId, action }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'That did not go through. Check your connection and tap again.')
        return
      }
      await load()
    } catch {
      setError('We could not reach MuvieStars just now. Check your connection and tap again.')
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
      <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.55, color: '#C7BFB2', maxWidth: '560px' }}>
        {title} is not listed on MuvieStars yet. {count > 0 ? `${count} ${count === 1 ? 'person has' : 'people have'} nominated it. ` : ''}
        When enough people nominate a film, an editor checks it for listing.
      </p>
      {!signedIn ? (
        <NavLink href={`/auth?next=/movie/${movieId}`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', color: '#C8963E', fontSize: '15px' }}>
          Sign in to nominate it
        </NavLink>
      ) : nominated ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => act('withdraw')}
          style={{ minHeight: '44px', padding: 0, background: 'none', border: 'none', color: '#8C857A', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {busy ? 'Taking it back...' : 'You nominated this. Take my nomination back'}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => act('nominate')}
          style={{ minHeight: '48px', padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(200,150,62,0.6)', background: 'transparent', color: '#C8963E', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Sending your nomination...' : 'Nominate it for listing'}
        </button>
      )}
      {error && <p role="alert" style={{ margin: 0, fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
    </div>
  )
}
