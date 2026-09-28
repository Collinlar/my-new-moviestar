'use client'

import { useState } from 'react'
import { Check, Eye } from 'lucide-react'
import type { Movie } from '@/lib/queries'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

type Status = 'watching' | 'completed' | null

interface Props {
  movie: Movie
  participantCount: number
  initialStatus: Status
  userId: string | null
}

export function ClubParticipationBar({ movie, participantCount, initialStatus, userId }: Props) {
  const [status, setStatus]   = useState<Status>(initialStatus)
  const [count, setCount]     = useState(participantCount)
  const [loading, setLoading] = useState(false)

  const participate = async (newStatus: 'watching' | 'completed') => {
    if (loading) return
    if (!userId) {
      window.location.href = `/auth?redirect=/club`
      return
    }

    const prev = status
    const prevCount = count

    // Optimistic update
    setStatus(newStatus)
    if (!prev) setCount(c => c + 1)
    setLoading(true)

    try {
      const res = await fetch('/api/club/participate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movie.id, status: newStatus }),
      })
      if (!res.ok) throw new Error('failed')
    } catch {
      // Roll back on failure
      setStatus(prev)
      setCount(prevCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Participant count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '-4px' }}>
          {[...Array(Math.min(count, 5))].map((_, i) => (
            <div
              key={i}
              style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: `hsl(${30 + i * 20}, 40%, 35%)`,
                border: '2px solid #12242B',
                marginLeft: i > 0 ? '-8px' : 0,
              }}
            />
          ))}
        </div>
        {count > 0 ? (
          <span style={{ ...MONO, fontSize: '13px', color: '#B9C7CC' }}>
            {count.toLocaleString()} {count === 1 ? 'person is' : 'people are'} watching this week
          </span>
        ) : (
          <span style={{ ...MONO, fontSize: '13px', color: '#B9C7CC' }}>
            Be the first to join this week
          </span>
        )}
      </div>

      {/* Action buttons */}
      {status === null && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => participate('watching')}
            disabled={loading}
            style={{
              height: '48px', padding: '0 22px', borderRadius: '14px',
              background: 'rgba(200,150,62,0.15)',
              border: '1px solid rgba(200,150,62,0.4)',
              color: '#C8963E', fontSize: '15px', fontWeight: 500,
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Eye size={16} />
            {loading ? 'Joining...' : "I'm watching"}
          </button>
          <button
            onClick={() => participate('completed')}
            disabled={loading}
            style={{
              height: '48px', padding: '0 22px', borderRadius: '14px',
              border: '1px solid rgba(237,228,210,0.18)', background: 'transparent',
              color: '#EDE4D2', fontSize: '15px',
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Check size={16} />
            {loading ? 'Saving...' : "I've seen it"}
          </button>
        </div>
      )}

      {status === 'watching' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            height: '36px', padding: '0 16px', borderRadius: '999px',
            background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
            color: '#C8963E', fontSize: '14px', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}>
            <Eye size={14} />
            Watching
          </span>
          <button
            onClick={() => participate('completed')}
            disabled={loading}
            style={{
              height: '36px', padding: '0 16px', borderRadius: '999px',
              border: '1px solid rgba(237,228,210,0.15)', background: 'transparent',
              color: '#C7BFB2', fontSize: '14px',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            <Check size={14} />
            Mark as seen
          </button>
        </div>
      )}

      {status === 'completed' && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{
            height: '36px', padding: '0 16px', borderRadius: '999px',
            background: 'rgba(100,180,130,0.15)', border: '1px solid rgba(100,180,130,0.3)',
            color: '#7CC49A', fontSize: '14px', fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}>
            <Check size={14} />
            Seen it
          </span>
          {movie.id && (
            <a
              href={`/movie/${movie.id}#review`}
              style={{
                height: '36px', padding: '0 16px', borderRadius: '999px',
                border: '1px solid rgba(200,150,62,0.3)', background: 'transparent',
                color: '#C8963E', fontSize: '14px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                textDecoration: 'none',
              }}
            >
              Write a review
            </a>
          )}
        </div>
      )}
    </div>
  )
}
