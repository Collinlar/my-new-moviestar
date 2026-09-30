'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, Bookmark } from 'lucide-react'
import { QuickReactionSheet } from '@/components/QuickReactionSheet'
import { AuthPromptSheet } from '@/components/AuthPromptSheet'
import type { Movie } from '@/lib/queries'
import type { MoodConfig } from '@/lib/mood'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const CARD_PALETTES: Array<{ bg: string; shape: React.CSSProperties }> = [
  { bg: '#12242B', shape: { position: 'absolute', left: '50%', top: '14%', width: '270px', height: '360px', marginLeft: '-135px', borderRadius: '135px 135px 0 0', background: '#C8963E' } },
  { bg: '#2C1A0E', shape: { position: 'absolute', left: '-30%', top: '10%', width: '90%', aspectRatio: '1', borderRadius: '50%', background: '#B5532F' } },
  { bg: '#0F2230', shape: { position: 'absolute', left: '15%', top: '30%', width: '70%', height: '18%', borderRadius: '200px 200px 0 0', background: '#D9674E' } },
  { bg: '#1E1A12', shape: { position: 'absolute', left: 0, right: 0, top: '25%', height: '30%', background: 'repeating-linear-gradient(0deg,#C8963E 0 4px,transparent 4px 13px)' } },
  { bg: '#2B2008', shape: { position: 'absolute', left: '10%', top: '10%', width: '80%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,#F0D48A 0 30%,#C8963E 31% 60%,transparent 61%)' } },
  { bg: '#1A1D2B', shape: { position: 'absolute', left: '18%', top: '14%', width: '64%', height: '44%', border: '2px solid #8FA8C8', borderRadius: '8px' } },
]

type SessionStats = {
  seen: number
  watchLater: number
  loved: number
  liked: number
  okay: number
  notForMe: number
}

const EMPTY_STATS: SessionStats = { seen: 0, watchLater: 0, loved: 0, liked: 0, okay: 0, notForMe: 0 }

async function saveInteraction(movieId: string, type: 'watch_later' | 'not_interested' | 'unseen' | 'seen') {
  try {
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie_id: movieId, interaction_type: type }),
    })
  } catch {}
}

export function SwipeStack({ movies, totalCount, userId, mood }: {
  movies: Movie[]
  totalCount: number
  userId: string | null
  mood?: MoodConfig
}) {
  const [idx, setIdx]                       = useState(0)
  const [exit, setExit]                     = useState<'left' | 'right' | null>(null)
  const [showReaction, setShowReaction]     = useState(false)
  const [haventSeenMode, setHaventSeenMode] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState<'watch_later' | 'reaction' | null>(null)
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [sessionStats, setSessionStats]     = useState<SessionStats>(EMPTY_STATS)

  const haventTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionCardsRef = useRef(0)

  const current = movies[idx]
  const next    = movies[idx + 1]
  const isDone  = idx >= movies.length

  const advance = useCallback((dir: 'left' | 'right') => {
    if (exit !== null) return
    if (haventTimerRef.current) { clearTimeout(haventTimerRef.current); haventTimerRef.current = null }
    setShowReaction(false)
    setHaventSeenMode(false)
    setExit(dir)
    setTimeout(() => {
      setIdx(i => i + 1)
      setExit(null)
      sessionCardsRef.current += 1
      if (sessionCardsRef.current >= 10) {
        setShowSessionSummary(true)
      }
    }, 260)
  }, [exit])

  const handleKeepGoing = () => {
    sessionCardsRef.current = 0
    setSessionStats(EMPTY_STATS)
    setShowSessionSummary(false)
  }

  const handleSeenIt = () => {
    if (exit !== null || showReaction || haventSeenMode) return
    // Remembered even if the reaction is skipped, so the film does not come straight back.
    if (userId && current) saveInteraction(current.id, 'seen')
    setShowReaction(true)
  }

  const handleHaventSeen = () => {
    if (exit !== null || showReaction || haventSeenMode) return
    setHaventSeenMode(true)
    haventTimerRef.current = setTimeout(() => {
      if (current) saveInteraction(current.id, 'unseen')
      advance('left')
    }, 3000)
  }

  const handleWatchLater = () => {
    if (!userId) { setShowAuthPrompt('watch_later'); return }
    if (current) saveInteraction(current.id, 'watch_later')
    setSessionStats(prev => ({ ...prev, watchLater: prev.watchLater + 1 }))
    advance('left')
  }

  const handleNotInterested = () => {
    if (current) saveInteraction(current.id, 'not_interested')
    advance('left')
  }

  const handleReactionSaved = useCallback((reactionKey: string) => {
    setSessionStats(prev => ({
      ...prev,
      seen: prev.seen + 1,
      ...(reactionKey === 'loved'      ? { loved:     prev.loved + 1 }     :
         reactionKey === 'liked'       ? { liked:     prev.liked + 1 }     :
         reactionKey === 'okay'        ? { okay:      prev.okay + 1 }      :
         reactionKey === 'not_for_me'  ? { notForMe:  prev.notForMe + 1 }  : {}),
    }))
    advance('right')
  }, [advance])

  const handleAuthSkip = () => {
    setShowAuthPrompt(null)
    // For watch_later skip: just advance without saving
    if (showAuthPrompt === 'watch_later') advance('left')
    // For reaction skip: the sheet already handles its own skip
  }

  useEffect(() => {
    return () => { if (haventTimerRef.current) clearTimeout(haventTimerRef.current) }
  }, [])

  // ── Session summary (shown after every 10 cards) ───────────────────────────
  if (showSessionSummary) {
    const moviesLeft = movies.length - idx
    const summaryLines = [
      { label: 'Seen',        value: sessionStats.seen },
      { label: 'Watch Later', value: sessionStats.watchLater },
      { label: 'Loved it',    value: sessionStats.loved },
      { label: 'Not for me',  value: sessionStats.notForMe + sessionStats.okay },
    ]

    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', gap: '40px', background: '#0B0A09', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
            Ten down
          </p>
          <h2 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,7vw,72px)', lineHeight: '0.95', color: '#F6EFE2', margin: 0 }}>
            {sessionStats.loved >= 3
              ? 'Strong opinions.'
              : sessionStats.seen === 0
                ? 'Lots to catch up on.'
                : 'Good progress.'}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '360px' }}>
          {summaryLines.map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: '#161411', borderRadius: '16px', padding: '20px 16px',
                display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start',
              }}
            >
              <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C857A' }}>
                {label}
              </span>
              <span style={{ ...SERIF, fontSize: '44px', lineHeight: 1, color: value > 0 ? '#F6EFE2' : '#3A3530' }}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {moviesLeft > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px', alignItems: 'center' }}>
            <button
              onClick={handleKeepGoing}
              style={{
                width: '100%', height: '60px', borderRadius: '18px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '17px', fontWeight: 600, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              Keep going
              <ArrowRight size={18} />
            </button>
            <p style={{ ...MONO, fontSize: '12px', color: '#8C857A', margin: 0 }}>
              {moviesLeft} more film{moviesLeft !== 1 ? 's' : ''} in the stack
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '360px', alignItems: 'center' }}>
            <p style={{ fontSize: '16px', color: '#C7BFB2', margin: 0, lineHeight: 1.6 }}>
              {mood
                ? `That's all the "${mood.label}" films for now.`
                : `You have been through all ${movies.length} films in this stack.`}
            </p>
            {mood && (
              <Link
                href="/swipe"
                style={{
                  width: '100%', height: '60px', borderRadius: '18px',
                  background: '#C8963E', color: '#0B0A09',
                  fontSize: '17px', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  textDecoration: 'none',
                }}
              >
                Swipe all films
                <ArrowRight size={18} />
              </Link>
            )}
            <Link
              href="/browse"
              style={{
                width: '100%', height: '60px', borderRadius: '18px',
                background: mood ? 'transparent' : '#C8963E',
                border: mood ? '1px solid rgba(237,228,210,0.18)' : 'none',
                color: mood ? '#EDE4D2' : '#0B0A09',
                fontSize: '17px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                textDecoration: 'none',
              }}
            >
              Explore the full database
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── All done ───────────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', gap: '32px', background: '#0B0A09', textAlign: 'center',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
          <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
            Through the stack
          </p>
          <h2 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,7vw,80px)', lineHeight: '0.95', color: '#F6EFE2', margin: 0 }}>
            {movies.length === 0 ? 'You have cleared this one.' : 'Not bad, film lover.'}
          </h2>
          <p style={{ fontSize: '18px', color: '#C7BFB2', maxWidth: '440px', lineHeight: '1.6', margin: 0 }}>
            {movies.length === 0
              ? mood
                ? `You have reacted to or saved every "${mood.label}" film we have. Try another mood or browse the full database.`
                : 'You have reacted to or saved everything we have. New films land regularly.'
              : mood
                ? `That's all ${movies.length} "${mood.label}" films for now.`
                : `You've been through ${movies.length} films. The full database has ${totalCount.toLocaleString()} more waiting.`}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {mood && (
            <Link
              href="/swipe"
              style={{
                height: '60px', padding: '0 32px', borderRadius: '18px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '17px', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                textDecoration: 'none',
              }}
            >
              Swipe all films
              <ArrowRight size={18} />
            </Link>
          )}
          <Link
            href="/browse"
            style={{
              height: '60px', padding: '0 32px', borderRadius: '18px',
              background: mood ? 'transparent' : '#C8963E',
              border: mood ? '1px solid rgba(237,228,210,0.18)' : 'none',
              color: mood ? '#EDE4D2' : '#0B0A09',
              fontSize: '17px', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              textDecoration: 'none',
            }}
          >
            Explore the full database
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    )
  }

  const art     = CARD_PALETTES[idx % CARD_PALETTES.length]
  const nextArt = CARD_PALETTES[(idx + 1) % CARD_PALETTES.length]
  const hasPoster = !!(current.poster_url && current.poster_url.startsWith('http'))

  const cardTransform = exit === 'left'
    ? 'translateX(-130%) rotate(-14deg)'
    : exit === 'right'
      ? 'translateX(130%) rotate(14deg)'
      : 'translateX(0) rotate(0deg)'

  return (
    <div style={{
      minHeight: '100dvh', background: '#0B0A09',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '80px 24px 48px', gap: '28px',
    }}>

      {/* Progress */}
      <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          {mood ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span style={{
                height: '26px', padding: '0 12px', borderRadius: '999px',
                background: mood.chipBg, color: mood.chipText,
                ...MONO, fontSize: '11px', fontWeight: 500,
                display: 'inline-flex', alignItems: 'center',
                border: '1px solid rgba(237,228,210,0.08)',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {mood.label}
              </span>
              <Link
                href="/swipe"
                style={{ ...MONO, fontSize: '11px', color: '#6A6258', textDecoration: 'none', whiteSpace: 'nowrap' }}
              >
                All films
              </Link>
            </div>
          ) : (
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: 0 }}>
              African cinema, card by card
            </p>
          )}
          <p style={{ ...MONO, fontSize: '11px', color: '#8C857A', margin: 0, flexShrink: 0 }}>
            {idx + 1} of {movies.length}
          </p>
        </div>
        {mood && (
          <p style={{ ...MONO, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6A6258', margin: 0 }}>
            {mood.tagline}
          </p>
        )}
        <div style={{ height: '2px', background: 'rgba(237,228,210,0.1)', borderRadius: '1px' }}>
          <div style={{
            height: '100%', background: mood ? mood.chipText : '#C8963E', borderRadius: '1px',
            width: `${(idx / movies.length) * 100}%`,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Card stack */}
      <div style={{ position: 'relative', width: '100%', maxWidth: '420px', height: '580px' }}>

        {next && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden',
            background: nextArt.bg,
            transform: 'scale(0.94) translateY(20px)',
            opacity: 0.65, zIndex: 1,
          }}>
            <div style={nextArt.shape} />
          </div>
        )}

        <div style={{
          position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden',
          boxShadow: '0 40px 80px rgba(0,0,0,.65)',
          transform: cardTransform,
          transition: exit ? 'transform 0.26s cubic-bezier(0.4,0,0.6,1)' : 'none',
          zIndex: 2,
        }}>
          {hasPoster ? (
            <img
              src={current.poster_url!}
              alt={current.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <>
              <div style={{ position: 'absolute', inset: 0, background: art.bg }} />
              <div style={art.shape} />
            </>
          )}
          <div className="ms-grain" />
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%',
            background: 'linear-gradient(to top, rgba(8,7,6,.97) 0%, rgba(8,7,6,.6) 50%, rgba(8,7,6,0) 100%)',
          }} />
          <div style={{ position: 'absolute', left: '24px', right: '24px', bottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ ...SERIF, fontSize: '42px', lineHeight: '1', color: '#F6EFE2' }}>
              {current.title}
            </div>
            <div style={{ fontSize: '15px', color: '#C7BFB2' }}>
              {current.release_year}
              {current.country ? ` · ${current.country}` : ''}
              {current.genre   ? ` · ${current.genre}`   : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      {haventSeenMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '420px' }}>
          <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8C857A', margin: 0, textAlign: 'center' }}>
            Haven&apos;t seen it yet
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleWatchLater}
              style={{
                flex: 1, height: '60px', borderRadius: '18px',
                background: '#12242B',
                border: '1px solid rgba(200,150,62,0.3)',
                color: '#C8963E', fontSize: '15px', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Bookmark size={16} />
              Watch later
            </button>
            <button
              onClick={handleNotInterested}
              style={{
                flex: 1, height: '60px', borderRadius: '18px',
                border: '1px solid rgba(237,228,210,0.12)', background: '#161411',
                color: '#8C857A', fontSize: '15px', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              Not for me
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#4B4440', textAlign: 'center', margin: 0 }}>
            Moving on in a moment...
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '14px', width: '100%', maxWidth: '420px' }}>
          <button
            onClick={handleHaventSeen}
            style={{
              flex: 1, height: '60px', borderRadius: '18px',
              border: '1px solid rgba(237,228,210,.16)', background: '#161411',
              color: '#EDE4D2', fontSize: '16px', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              cursor: 'pointer',
            }}
          >
            <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
            Haven&apos;t seen it
          </button>
          <button
            onClick={handleSeenIt}
            style={{
              flex: 1, height: '60px', borderRadius: '18px',
              background: '#C8963E', color: '#0B0A09',
              fontSize: '16px', fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              cursor: 'pointer', border: 'none',
            }}
          >
            Seen it
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      <Link href="/browse" style={{ fontSize: '14px', color: '#8C857A', textDecoration: 'none' }}>
        Skip to the full database →
      </Link>

      {showReaction && (
        <QuickReactionSheet
          movie={current}
          isLoggedIn={!!userId}
          onSave={handleReactionSaved}
          onSkip={() => advance('right')}
        />
      )}

      {showAuthPrompt && (
        <AuthPromptSheet
          context={showAuthPrompt}
          onSkip={handleAuthSkip}
        />
      )}
    </div>
  )
}
