'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  challengeId: string
  slug: string
  joined: boolean
  signedIn: boolean
  /** Ended challenges cannot be joined. */
  open: boolean
  upcoming: boolean
}

const PRIMARY: React.CSSProperties = {
  minHeight: '58px', padding: '0 28px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09',
  fontSize: '17px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', textDecoration: 'none',
}

export function ChallengeJoin({ challengeId, slug, joined, signedIn, open, upcoming }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  if (!signedIn) {
    return (
      <Link href={`/auth?next=/challenges/${slug}`} style={PRIMARY}>
        Sign in to join this challenge
      </Link>
    )
  }

  const act = async (action: 'join' | 'leave') => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/challenges/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge_id: challengeId, action }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'That did not go through. Check your connection and tap again.')
        return
      }
      router.refresh()
    } catch {
      setError('We could not reach MuvieStars just now. Check your connection and tap again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start' }}>
      {joined ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => act('leave')}
          style={{ minHeight: '44px', padding: '0 4px', background: 'none', border: 'none', color: '#8C857A', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {busy ? 'Stepping out...' : 'Step out of this challenge'}
        </button>
      ) : (
        <button type="button" disabled={busy} onClick={() => act('join')} style={{ ...PRIMARY, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Adding you in...' : upcoming ? 'Join before it starts' : 'Join this challenge'}
        </button>
      )}
      {error && <p role="alert" style={{ margin: 0, fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
    </div>
  )
}
