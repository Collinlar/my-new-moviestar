'use client'

import { useState } from 'react'
import { Check, Eye } from 'lucide-react'
import { NavLink } from '@/components/NavLink'
import type { ClubState } from '@/lib/club'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

interface Props {
  movieId: string
  /** The short name of the film, for button labels. */
  name: string
  /** Where to watch it, when the film has a video. Otherwise the buttons open its page. */
  watchUrl: string | null
  initialState: ClubState
  signedIn: boolean
  initialCount: number
  daysLeft: number
  /** The homepage card shows a sentence of its own. The Club page already has a description. */
  showBlurb?: boolean
}

const PRIMARY: React.CSSProperties = {
  height: '54px', padding: '0 24px', borderRadius: '16px', background: '#EDE4D2', color: '#0B0A09', border: 'none',
  fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
}
const SECONDARY: React.CSSProperties = {
  height: '54px', padding: '0 22px', borderRadius: '16px', background: 'transparent', border: '1px solid rgba(237,228,210,0.28)', color: '#EDE4D2',
  fontSize: '16px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', cursor: 'pointer', fontFamily: 'inherit',
}
const CHIP: React.CSSProperties = {
  height: '36px', padding: '0 14px', borderRadius: '999px', fontSize: '14px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px',
}

const dayWord = (n: number) => (n === 1 ? 'a day' : `${n} days`)

function blurbFor(state: ClubState, days: number): string {
  switch (state) {
    case 'watching': return 'You are in. Watch it when you can, then come back and say what you thought.'
    case 'seen':     return 'You have seen it. Say what you thought and it goes into the Club’s verdict.'
    case 'took':     return `Your take is in and counts toward the Club’s verdict. The next film lands in ${dayWord(days)}.`
    default:         return 'One film, watched together, every week. Watch it when you can, then come back and say what you thought.'
  }
}

/**
 * What a person can do with this week's Club pick, and only what makes sense for where they are.
 * Joining is one tap and happens in place: the button answers at once and the change is saved behind it.
 */
export function ClubActions({ movieId, name, watchUrl, initialState, signedIn, initialCount, daysLeft, showBlurb = false }: Props) {
  const [state, setState] = useState<ClubState>(initialState)
  const [count, setCount] = useState(initialCount)
  const [busy, setBusy] = useState<null | 'watching' | 'completed'>(null)
  const [error, setError] = useState<string | null>(null)

  async function move(next: 'watching' | 'completed') {
    if (busy) return
    const before = state
    const beforeCount = count
    setError(null)
    setBusy(next)
    // Show the new state straight away. It is put back if the save fails.
    setState(next === 'completed' ? 'seen' : 'watching')
    if (before === 'none') setCount((c) => c + 1)
    try {
      const res = await fetch('/api/club/participate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movie_id: movieId, status: next }),
      })
      if (!res.ok) throw new Error('save failed')
    } catch {
      setState(before)
      setCount(beforeCount)
      setError('That did not go through. Check your connection and tap again.')
    } finally {
      setBusy(null)
    }
  }

  const filmHref = `/movie/${movieId}`
  const watch = watchUrl
    ? <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="ms-press" style={PRIMARY}>Watch {name}</a>
    : <NavLink button href={filmHref} pendingLabel="Opening the film page..." style={PRIMARY}>Watch {name}</NavLink>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} aria-live="polite">
      {showBlurb && (
        <p style={{ margin: 0, maxWidth: '460px', fontSize: '18px', lineHeight: 1.5, color: '#C9D4D7' }}>{blurbFor(state, daysLeft)}</p>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {!signedIn && (
          <NavLink button href="/auth?next=/club" pendingLabel="Taking you to sign in..." style={PRIMARY}>Sign in to join this week&apos;s Club</NavLink>
        )}

        {signedIn && state === 'none' && (
          <>
            <button type="button" className="ms-press" onClick={() => move('watching')} disabled={!!busy} style={PRIMARY}>
              <Eye size={18} aria-hidden="true" />
              {busy === 'watching' ? 'Adding you to the Club...' : 'I’m watching'}
            </button>
            <button type="button" className="ms-press" onClick={() => move('completed')} disabled={!!busy} style={SECONDARY}>
              <Check size={18} aria-hidden="true" />
              {busy === 'completed' ? 'Marking it as seen...' : 'I’ve seen it'}
            </button>
          </>
        )}

        {signedIn && state === 'watching' && (
          <>
            <span className="ms-pop-in" style={{ ...CHIP, background: 'rgba(200,150,62,0.16)', border: '1px solid rgba(200,150,62,0.4)', color: '#E0B25C' }}>
              <Eye size={14} aria-hidden="true" /> You&apos;re in
            </span>
            {watch}
            <button type="button" className="ms-press" onClick={() => move('completed')} disabled={!!busy} style={SECONDARY}>
              <Check size={18} aria-hidden="true" />
              {busy === 'completed' ? 'Marking it as seen...' : 'I’ve seen it'}
            </button>
          </>
        )}

        {signedIn && state === 'seen' && (
          <>
            <span className="ms-pop-in" style={{ ...CHIP, background: 'rgba(100,180,130,0.16)', border: '1px solid rgba(100,180,130,0.4)', color: '#7CC49A' }}>
              <Check size={14} aria-hidden="true" /> Seen it
            </span>
            <NavLink button href={`${filmHref}#community-reviews`} pendingLabel="Opening the film page..." style={PRIMARY}>Say what you thought</NavLink>
          </>
        )}

        {signedIn && state === 'took' && (
          <>
            <span className="ms-pop-in" style={{ ...CHIP, background: 'rgba(100,180,130,0.16)', border: '1px solid rgba(100,180,130,0.4)', color: '#7CC49A' }}>
              <Check size={14} aria-hidden="true" /> Your take is in
            </span>
            <a href="/club#club-verdict" className="ms-press" style={PRIMARY}>See what the Club thought</a>
            <NavLink button href={`${filmHref}#community-reviews`} pendingLabel="Opening your take..." style={SECONDARY}>Edit my take</NavLink>
          </>
        )}
      </div>

      {error && <p role="alert" style={{ margin: 0, fontSize: '14px', color: '#F0A28F' }}>{error}</p>}

      <p style={{ ...MONO, margin: 0, fontSize: '13px', color: '#B9C7CC' }}>
        {count > 0
          ? `${count.toLocaleString()} ${count === 1 ? 'person has' : 'people have'} joined this week`
          : 'Be the first to join this week'}
        {' · '}
        {daysLeft === 1 ? 'Last day this week' : `${daysLeft} days left`}
      </p>
    </div>
  )
}
