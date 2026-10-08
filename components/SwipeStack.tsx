'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { NavLink } from '@/components/NavLink'
import { ArrowRight, Bookmark } from 'lucide-react'
import { QuickReactionSheet } from '@/components/QuickReactionSheet'
import { startNavigationProgress } from '@/components/NavigationProgress'
import { writeGuestSwipe } from '@/lib/guest-swipes'
import { BARS_ZOOM, lighterThumb, thumbnailHasBars } from '@/lib/poster'
import { objectPosition } from '@/lib/images'
import type { Movie } from '@/lib/queries'
import type { MoodConfig } from '@/lib/mood'
import { playable, watchHeadline, watchLinks } from '@/lib/watch'
import { WatchChip } from '@/components/WatchChip'

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

/** How a choice was made, so pulling a card and tapping a button can be compared later. */
type InteractionSource = 'swipe' | 'swipe_gesture' | 'swipe_key'

const COMMIT_DISTANCE = 96   // how far a card must be pulled to count as a choice
const TAP_SLOP = 6           // under this much movement it was a tap, not a pull
const STRIP_MS = 6000        // how long the "what next" strip waits after a left pull
const GESTURE_KEY = 'ms_swipe_gesture_used'

async function saveInteraction(movieId: string, type: 'watch_later' | 'not_interested' | 'unseen' | 'seen' | 'undo', source: InteractionSource = 'swipe') {
  try {
    await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movie_id: movieId, interaction_type: type, source }),
    })
  } catch {}
}

export function SwipeStack({ movies, totalCount, userId, mood }: {
  movies: Movie[]
  totalCount: number
  userId: string | null
  mood?: MoodConfig
}) {
  const router = useRouter()
  const [idx, setIdx]                       = useState(0)
  const [exit, setExit]                     = useState<'left' | 'right' | null>(null)
  const [showReaction, setShowReaction]     = useState(false)
  const [showSessionSummary, setShowSessionSummary] = useState(false)
  const [sessionStats, setSessionStats]     = useState<SessionStats>(EMPTY_STATS)
  const [dx, setDx]                         = useState(0)
  const [phase, setPhase]                   = useState<'idle' | 'drag' | 'back'>('idle')
  // The film just passed with a left pull. A strip over the top of the stack offers what to do with it.
  const [passed, setPassed]                 = useState<Movie | null>(null)
  const [watchOpen, setWatchOpen]           = useState(false)
  const [notice, setNotice]                 = useState<string | null>(null)
  const [calm, setCalm]                     = useState(false)
  const [hinted, setHinted]                 = useState(true)
  const [nudge, setNudge]                   = useState(false)

  const sessionCardsRef = useRef(0)
  const stripTimer      = useRef<ReturnType<typeof setTimeout>>()
  const noticeTimer     = useRef<ReturnType<typeof setTimeout>>()
  const backTimer       = useRef<ReturnType<typeof setTimeout>>()
  const start           = useRef<{ x: number; y: number; t: number } | null>(null)
  const moved           = useRef(false)

  const current = movies[idx]
  const next    = movies[idx + 1]
  const isDone  = idx >= movies.length

  const storage = () => { try { return window.localStorage } catch { return null } }

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    setCalm(q.matches)
    const on = () => setCalm(q.matches)
    q.addEventListener('change', on)
    // The pull-the-card hint is shown until someone has pulled a card once.
    try { setHinted(window.localStorage.getItem(GESTURE_KEY) === '1') } catch { setHinted(false) }
    return () => q.removeEventListener('change', on)
  }, [])

  // One small nudge on the first card for people who have not pulled one yet, so a card that was only ever tapped
  // now shows it moves.
  useEffect(() => {
    if (hinted || calm || idx > 0) return
    const t = setTimeout(() => { setNudge(true); setTimeout(() => setNudge(false), 800) }, 2600)
    return () => clearTimeout(t)
  }, [hinted, calm, idx])

  // The next two posters are fetched before they are needed, so the next card is already there when this one leaves.
  useEffect(() => {
    for (const m of movies.slice(idx + 1, idx + 3)) {
      if (m?.poster_url?.startsWith('http')) { const im = new Image(); im.src = lighterThumb(m.poster_url, 1) }
    }
  }, [idx, movies])

  useEffect(() => () => { clearTimeout(stripTimer.current); clearTimeout(noticeTimer.current); clearTimeout(backTimer.current) }, [])

  const rememberGesture = () => {
    if (hinted) return
    setHinted(true); setNudge(false)
    try { window.localStorage.setItem(GESTURE_KEY, '1') } catch { /* the hint just shows again next time */ }
  }

  const showNotice = (text: string) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 2800)
  }

  const clearStrip = () => { clearTimeout(stripTimer.current); setPassed(null); setWatchOpen(false) }

  const openStrip = (film: Movie) => {
    clearTimeout(stripTimer.current)
    setNotice(null)
    setPassed(film)
    setWatchOpen(false)
    stripTimer.current = setTimeout(() => setPassed(null), STRIP_MS)
  }

  const advance = useCallback((dir: 'left' | 'right') => {
    if (exit !== null) return
    setShowReaction(false)
    setExit(dir)
    setTimeout(() => {
      setIdx(i => i + 1)
      setExit(null)
      setDx(0)
      setPhase('idle')
      sessionCardsRef.current += 1
      if (sessionCardsRef.current >= 10) {
        setShowSessionSummary(true)
      }
    }, calm ? 0 : 260)
  }, [exit, calm])

  const handleKeepGoing = () => {
    sessionCardsRef.current = 0
    setSessionStats(EMPTY_STATS)
    setShowSessionSummary(false)
  }

  const springBack = () => {
    setPhase('back'); setDx(0)
    clearTimeout(backTimer.current)
    backTimer.current = setTimeout(() => setPhase('idle'), calm ? 0 : 240)
  }

  /** Right: seen it. The film is remembered as seen at once and the reaction sheet opens over the card. */
  const handleSeenIt = (source: InteractionSource = 'swipe') => {
    if (exit !== null || showReaction || !current) return
    clearStrip()
    // Remembered even if the reaction is skipped, so the film does not come straight back.
    if (userId) saveInteraction(current.id, 'seen', source)
    else writeGuestSwipe(storage(), { id: current.id, a: 'seen', at: Date.now() })
    springBack()
    setShowReaction(true)
  }

  /** Left: not seen yet. Saved as the soft "unseen" and the card leaves. The strip offers the rest. */
  const handleHaventSeen = (source: InteractionSource = 'swipe') => {
    if (exit !== null || showReaction || !current) return
    const film = current
    if (userId) saveInteraction(film.id, 'unseen', source)
    advance('left')
    openStrip(film)
  }

  /** Save the film for later, from the card's own button. */
  const handleWatchLater = () => {
    if (exit !== null || showReaction || !current) return
    clearStrip()
    saveForLater(current)
    advance('left')
  }

  const saveForLater = (film: Movie) => {
    if (userId) saveInteraction(film.id, 'watch_later')
    else writeGuestSwipe(storage(), { id: film.id, a: 'later', at: Date.now() })
    setSessionStats(prev => ({ ...prev, watchLater: prev.watchLater + 1 }))
    showNotice(userId ? 'Saved to watch later.' : 'Saved on this device. Make a free account and it comes with you.')
  }

  const stripWatchLater = () => {
    if (!passed) return
    saveForLater(passed)
    clearStrip()
  }

  const stripNotInterested = () => {
    if (!passed) return
    if (userId) saveInteraction(passed.id, 'not_interested')
    clearStrip()
    showNotice(userId ? 'Got it. We will not show it again.' : 'Got it.')
  }

  const stripUndo = () => {
    if (!passed || exit !== null) return
    const film = passed
    clearStrip()
    setIdx(i => Math.max(0, i - 1))
    sessionCardsRef.current = Math.max(0, sessionCardsRef.current - 1)
    if (userId) saveInteraction(film.id, 'undo')
  }

  const stripWhereToWatch = () => {
    clearTimeout(stripTimer.current)   // someone heading off to watch should not have the strip whisked away
    setWatchOpen(true)
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

  // ── Pulling the card ────────────────────────────────────────────────────────
  const canPull = exit === null && !showReaction && !!current

  const down = (e: React.PointerEvent) => {
    if (!canPull) return
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* the drag still works */ }
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    moved.current = false
    clearTimeout(backTimer.current)
    setNudge(false); setPhase('drag')
  }
  const move = (e: React.PointerEvent) => {
    if (!start.current || phase !== 'drag') return
    const d = e.clientX - start.current.x
    if (Math.abs(d) > TAP_SLOP) moved.current = true
    setDx(Math.max(-340, Math.min(340, d)))
  }
  const up = () => {
    if (!start.current) return
    const s = start.current
    start.current = null
    const fast = (Math.abs(dx) / Math.max(1, performance.now() - s.t)) > 0.5   // a flick counts
    if (!moved.current) {
      // A tap opens the film.
      setPhase('idle'); setDx(0)
      if (current) { startNavigationProgress(); router.push(`/movie/${current.id}`) }
      return
    }
    rememberGesture()
    if (Math.abs(dx) > COMMIT_DISTANCE || (fast && Math.abs(dx) > 40)) {
      try { navigator.vibrate?.(8) } catch { /* not every phone allows it */ }
      if (dx > 0) handleSeenIt('swipe_gesture'); else handleHaventSeen('swipe_gesture')
    } else springBack()
  }
  const cancel = () => { start.current = null; if (phase === 'drag') springBack() }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'ArrowRight') { e.preventDefault(); handleSeenIt('swipe_key') }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); handleHaventSeen('swipe_key') }
    if (e.key === 'Enter' && current) { e.preventDefault(); startNavigationProgress(); router.push(`/movie/${current.id}`) }
  }

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
              <NavLink button pendingLabel="Opening Swipe..."
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
              </NavLink>
            )}
            <NavLink button pendingLabel="Opening the archive..."
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
            </NavLink>
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
            <NavLink button pendingLabel="Opening Swipe..."
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
            </NavLink>
          )}
          <NavLink button pendingLabel="Opening the archive..."
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
          </NavLink>
        </div>
      </div>
    )
  }

  const art     = CARD_PALETTES[idx % CARD_PALETTES.length]
  const nextArt = CARD_PALETTES[(idx + 1) % CARD_PALETTES.length]
  const hasPoster = !!(current.poster_url && current.poster_url.startsWith('http'))
  const nextPoster = next?.poster_url && next.poster_url.startsWith('http') ? lighterThumb(next.poster_url, 1) : null
  // Links known to be blocked in Ghana or removed are left out of the quick strip. The film page shows the full story.
  const watchOptions = passed ? playable(watchLinks(passed, passed.watch_check ?? null)) : []
  const headline = watchHeadline(watchLinks(current, current.watch_check ?? null))
  const pull = Math.min(Math.abs(dx) / COMMIT_DISTANCE, 1)
  const barsOn = hasPoster && thumbnailHasBars(current.poster_url!)

  const cardTransform = exit === 'left'
    ? 'translateX(-130%) rotate(-14deg)'
    : exit === 'right'
      ? 'translateX(130%) rotate(14deg)'
      : `translateX(${dx}px) rotate(${dx / 18}deg)`
  const cardTransition = calm ? 'none'
    : exit ? 'transform 0.26s cubic-bezier(0.4,0,0.6,1)'
    : phase === 'back' ? 'transform 0.24s cubic-bezier(0.2,0.7,0.2,1)'
    : 'none'

  const STRIP_BTN: React.CSSProperties = {
    minHeight: '44px', padding: '0 14px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.18)', background: 'transparent',
    color: '#EDE4D2', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px',
  }

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
      <div
        tabIndex={0}
        onKeyDown={onKey}
        role="group"
        aria-label="Film card. Use the left and right arrow keys, or the buttons below. Press Enter to open the film."
        style={{ position: 'relative', width: '100%', maxWidth: '420px', height: '580px', outline: 'none', touchAction: 'pan-y', userSelect: 'none' }}
      >

        {/* What to do with the film just passed. Over the top of the stack so the buttons below never move. */}
        {(passed || notice) && (
          <div
            className="ms-strip-in"
            role="status"
            aria-live="polite"
            style={{
              position: 'absolute', top: '12px', left: '12px', right: '12px', zIndex: 6,
              background: '#12242B', border: '1px solid rgba(200,150,62,0.35)', borderRadius: '16px',
              padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            }}
          >
            {passed ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#C9D4D7', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Not seen: <strong style={{ color: '#F6EFE2', fontWeight: 600 }}>{passed.title}</strong>
                  </p>
                  <button type="button" className="ms-press" onClick={stripUndo} style={{ ...STRIP_BTN, borderColor: 'rgba(200,150,62,0.5)', color: '#E0B25C', flexShrink: 0 }}>Undo</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button type="button" className="ms-press" onClick={stripWatchLater} style={STRIP_BTN}><Bookmark size={15} aria-hidden="true" />Watch later</button>
                  {watchOptions.length > 0 && !watchOpen && (
                    <button type="button" className="ms-press" onClick={stripWhereToWatch} style={STRIP_BTN}>Where to watch</button>
                  )}
                  <button type="button" className="ms-press" onClick={stripNotInterested} style={{ ...STRIP_BTN, color: '#A39B8F' }}>Not for me</button>
                </div>
                {watchOpen && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} aria-label="Where to watch">
                    {watchOptions.slice(0, 3).map((w) => (
                      <a
                        key={w.url}
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ minHeight: '44px', padding: '0 16px', borderRadius: '12px', background: '#EDE4D2', color: '#0B0A09', fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.25, padding: '6px 0' }}>
                          <span>Watch on {w.label}</span>
                          <span style={{ ...MONO, fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.04em', color: w.free ? '#2F6B45' : '#5B5246' }}>
                            {[w.access, w.facts.find((x) => /^\d+(h| min)/.test(x))].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </a>
                    ))}
                    <p style={{ flexBasis: '100%', margin: 0, fontSize: '12px', color: '#8C857A' }}>Come back and tell us what you thought.</p>
                  </div>
                )}
              </>
            ) : (
              <p style={{ margin: 0, fontSize: '14px', color: '#F6EFE2' }}>{notice}</p>
            )}
          </div>
        )}

        {next && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden',
            background: nextArt.bg,
            transform: `scale(${0.94 + 0.06 * pull}) translateY(${20 - 20 * pull}px)`,
            transition: phase === 'drag' || calm ? 'none' : 'transform 0.26s cubic-bezier(0.2,0.7,0.2,1)',
            opacity: 0.65 + 0.35 * pull, zIndex: 1,
          }}>
            {nextPoster ? (
              <img
                src={nextPoster}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: thumbnailHasBars(nextPoster) ? 'center center' : 'center top', transform: thumbnailHasBars(nextPoster) ? `scale(${BARS_ZOOM})` : undefined }}
              />
            ) : (
              <div style={nextArt.shape} />
            )}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,10,9,0.3)' }} />
          </div>
        )}

        <div
          className={nudge ? 'ms-nudge' : undefined}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancel}
          style={{
            position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden',
            boxShadow: '0 40px 80px rgba(0,0,0,.65)',
            transform: cardTransform,
            transition: cardTransition,
            cursor: phase === 'drag' ? 'grabbing' : canPull ? 'grab' : 'default',
            zIndex: 2,
          }}
        >
          {hasPoster ? (
            <img
              src={current.poster_url!}
              alt={current.title}
              draggable={false}
              fetchPriority="high"
              decoding="async"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: barsOn ? 'center center' : current.poster_focus_x != null || current.poster_focus_y != null ? objectPosition({ x: current.poster_focus_x, y: current.poster_focus_y }) : undefined, backgroundColor: current.poster_color ?? undefined, transform: barsOn ? `scale(${BARS_ZOOM})` : undefined, pointerEvents: 'none' }}
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
            pointerEvents: 'none',
          }} />

          {/* As the card is pulled, a stamp says what letting go will do. */}
          <div style={{ position: 'absolute', top: '24px', left: '24px', padding: '6px 12px', borderRadius: '10px', border: '2px solid #C8963E', color: '#C8963E', background: 'rgba(11,10,9,0.55)', ...MONO, fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transform: 'rotate(-8deg)', opacity: dx > 0 ? pull : 0, pointerEvents: 'none' }}>Seen it</div>
          <div style={{ position: 'absolute', top: '24px', right: '24px', padding: '6px 12px', borderRadius: '10px', border: '2px solid #EDE4D2', color: '#EDE4D2', background: 'rgba(11,10,9,0.55)', ...MONO, fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transform: 'rotate(8deg)', opacity: dx < 0 ? pull : 0, pointerEvents: 'none' }}>Not seen</div>

          <div style={{ position: 'absolute', left: '24px', right: '24px', bottom: '28px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
            {headline && <WatchChip text={headline.text} color={headline.color} free={headline.free} />}
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

      <p style={{ ...MONO, fontSize: '12px', color: '#8C857A', margin: '-12px 0 0', minHeight: '18px', textAlign: 'center' }}>
        {hinted ? '' : 'Pull the card right if you have seen it, left if you have not.'}
      </p>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '14px', width: '100%', maxWidth: '420px' }}>
        <button
          type="button"
          className="ms-press"
          onClick={() => handleHaventSeen()}
          style={{
            flex: 1, height: '60px', borderRadius: '18px',
            border: '1px solid rgba(237,228,210,.16)', background: '#161411',
            color: '#EDE4D2', fontSize: '16px', fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer',
          }}
        >
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
          Haven&apos;t seen it
        </button>
        <button
          type="button"
          className="ms-press"
          onClick={handleWatchLater}
          aria-label="Save to watch later"
          title="Save to watch later"
          style={{
            width: '60px', height: '60px', flexShrink: 0, borderRadius: '18px',
            background: '#12242B', border: '1px solid rgba(200,150,62,0.3)', color: '#C8963E',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <Bookmark size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="ms-press"
          onClick={() => handleSeenIt()}
          style={{
            flex: 1, height: '60px', borderRadius: '18px',
            background: '#C8963E', color: '#0B0A09',
            fontSize: '16px', fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            cursor: 'pointer', border: 'none',
          }}
        >
          Seen it
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>

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
    </div>
  )
}
