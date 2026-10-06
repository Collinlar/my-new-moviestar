'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { NavLink } from '@/components/NavLink'
import { startNavigationProgress } from '@/components/NavigationProgress'
import { pickFresh, readGuestSwipes, writeGuestSwipe } from '@/lib/guest-swipes'
import { BARS_ZOOM, lighterThumb as lighter, thumbnailHasBars as hasBars } from '@/lib/poster'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export interface DeckFilm { id: string; title: string; year: number | null; line: string; poster: string }

const COMMIT_DISTANCE = 96    // how far a card must be pulled to count as a choice
const FLY_MS = 260
const DECK_SIZE = 6

function store(): Storage | null {
  try { return window.localStorage } catch { return null }
}
const TAP_SLOP = 6            // under this much movement it was a tap, not a swipe

/**
 * A real, working taste of Swipe on the homepage for people who have not signed up. Pull a card right for "Seen it" or
 * left for "Haven't seen it", which saves it to watch later, or tap the buttons. The picks are kept in this browser, so
 * the next visit opens on films not yet picked, and when the person creates an account they come with them (see
 * GuestSwipeCarryOver). Tap a card to open the film. It works with a thumb on a phone as well as a mouse.
 *
 * `films` is a wider pool than the deck needs. The server shuffles it per visit and this component takes the first
 * few the browser has not picked before.
 */
export function HeroSwipeDeck({ films: pool }: { films: DeckFilm[] }) {
  const router = useRouter()
  const [i, setI] = useState(0)
  const [dx, setDx] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'drag' | 'back' | 'exit'>('idle')
  const [dir, setDir] = useState<1 | -1>(1)
  const [seen, setSeen] = useState(0)
  const [later, setLater] = useState(0)
  const [films, setFilms] = useState<DeckFilm[]>(() => pool.slice(0, DECK_SIZE))
  const [touched, setTouched] = useState(false)
  const [nudge, setNudge] = useState(false)
  const [note, setNote] = useState('')
  const [calm, setCalm] = useState(false)
  const start = useRef<{ x: number; y: number; t: number } | null>(null)
  const moved = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const total = films.length
  const done = i >= total
  const top = films[i]

  // Returning visitors open on films they have not picked yet. The server's first six are shown until this runs,
  // so a first-time visitor never sees a swap.
  useEffect(() => {
    const picked = new Set(readGuestSwipes(store()).map((x) => x.id))
    if (picked.size === 0) return
    const next = pickFresh(pool, picked, DECK_SIZE)
    if (next.some((f, k) => f.id !== films[k]?.id) || next.length !== films.length) setFilms(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    setCalm(q.matches)
    const on = () => setCalm(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])

  // One small nudge, once, if nobody has touched the deck: it says "this moves" without a word.
  useEffect(() => {
    if (touched || calm || total === 0) return
    const t = setTimeout(() => { setNudge(true); setTimeout(() => setNudge(false), 800) }, 2400)
    return () => clearTimeout(t)
  }, [touched, calm, total])

  useEffect(() => () => clearTimeout(timer.current), [])

  const fly = useCallback((d: 1 | -1) => {
    if (phase === 'exit' || done) return
    setTouched(true); setNudge(false)
    setDir(d); setPhase('exit')
    if (d === 1) setSeen((n) => n + 1); else setLater((n) => n + 1)
    if (films[i]) writeGuestSwipe(store(), { id: films[i].id, a: d === 1 ? 'seen' : 'later', at: Date.now() })
    setNote(`${d === 1 ? 'Marked as seen' : 'Saved to watch later'}: ${films[i]?.title}`)
    try { navigator.vibrate?.(8) } catch { /* not every phone allows it */ }
    timer.current = setTimeout(() => { setI((n) => n + 1); setDx(0); setPhase('idle') }, calm ? 0 : FLY_MS)
  }, [phase, done, films, i, calm])

  function down(e: React.PointerEvent) {
    if (phase === 'exit' || done) return
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* the drag still works without capture */ }
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() }
    moved.current = false
    setTouched(true); setNudge(false); setPhase('drag')
  }
  function move(e: React.PointerEvent) {
    if (!start.current || phase !== 'drag') return
    const d = e.clientX - start.current.x
    if (Math.abs(d) > TAP_SLOP) moved.current = true
    setDx(Math.max(-340, Math.min(340, d)))
  }
  function up(e: React.PointerEvent) {
    if (!start.current) return
    const s = start.current
    start.current = null
    const fast = (Math.abs(dx) / Math.max(1, performance.now() - s.t)) > 0.5   // a flick counts
    if (!moved.current) {
      // A tap opens the film.
      setPhase('idle'); setDx(0)
      if (top) { startNavigationProgress(); router.push(`/movie/${top.id}`) }
      return
    }
    if (Math.abs(dx) > COMMIT_DISTANCE || (fast && Math.abs(dx) > 40)) fly(dx > 0 ? 1 : -1)
    else { setPhase('back'); setDx(0); timer.current = setTimeout(() => setPhase('idle'), calm ? 0 : 240) }
  }
  function cancel() {
    start.current = null
    if (phase === 'drag') { setPhase('back'); setDx(0); timer.current = setTimeout(() => setPhase('idle'), calm ? 0 : 240) }
  }
  function key(e: React.KeyboardEvent) {
    if (e.key === 'ArrowRight') { e.preventDefault(); fly(1) }
    if (e.key === 'ArrowLeft') { e.preventDefault(); fly(-1) }
    if (e.key === 'Enter' && top) { e.preventDefault(); startNavigationProgress(); router.push(`/movie/${top.id}`) }
  }

  const pull = Math.min(Math.abs(dx) / COMMIT_DISTANCE, 1)

  /** Where each card sits. The top card follows the finger. The ones behind rise as it leaves. */
  function style(depth: number): React.CSSProperties {
    const rise = phase === 'exit' ? 1 : pull
    if (depth === 0) {
      const x = phase === 'exit' ? dir * 560 : dx
      const rot = phase === 'exit' ? dir * 16 : dx / 18
      return {
        transform: `translateX(${x}px) rotate(${rot}deg)`,
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'drag' ? 'none' : calm ? 'none' : `transform ${FLY_MS}ms cubic-bezier(0.2,0.7,0.2,1), opacity ${FLY_MS}ms ease-out`,
        cursor: phase === 'drag' ? 'grabbing' : 'grab',
        zIndex: 3,
      }
    }
    const base = depth === 1 ? { s: 0.94, y: 16, r: 3 } : { s: 0.88, y: 32, r: -3 }
    const next = depth === 1 ? { s: 1, y: 0, r: 0 } : { s: 0.94, y: 16, r: 3 }
    const s = base.s + (next.s - base.s) * rise, y = base.y + (next.y - base.y) * rise, r = base.r + (next.r - base.r) * rise
    return {
      transform: `translateY(${y}px) scale(${s}) rotate(${r}deg)`,
      transition: phase === 'drag' || calm ? 'none' : 'transform 260ms cubic-bezier(0.2,0.7,0.2,1)',
      zIndex: 2 - depth,
    }
  }

  const visible = films.slice(i, i + 3)

  return (
    <div style={{ width: 'min(100%, 380px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px' }}>
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="Try Swipe. Use the left and right arrow keys, or the buttons below. Press Enter to open the film."
        tabIndex={0}
        onKeyDown={key}
        style={{ position: 'relative', width: '100%', aspectRatio: '380 / 520', outline: 'none', touchAction: 'pan-y', userSelect: 'none' }}
      >
        {done ? (
          <div className="ms-deck-in" style={{ position: 'absolute', inset: 0, borderRadius: '26px', background: '#12242B', border: '1px solid rgba(237,228,210,0.14)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px', padding: '32px' }}>
            <p style={{ ...MONO, margin: 0, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8963E' }}>
              {seen} seen · {later} for later
            </p>
            <p style={{ ...SERIF, margin: 0, fontSize: '40px', lineHeight: 1, color: '#F6EFE2' }}>Keep these.</p>
            <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.5, color: '#C9D4D7' }}>
              Your picks are saved on this device. Make a free account and they come with you: the films you have seen are marked, and the rest wait on your watch-later list.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <NavLink
                button
                pendingLabel="Opening sign up..."
                href="/auth?next=/"
                style={{ height: '50px', padding: '0 22px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
              >
                Create my free account <ArrowRight size={18} aria-hidden="true" />
              </NavLink>
              <NavLink
                button
                pendingLabel="Opening Swipe..."
                href="/swipe"
                style={{ height: '50px', padding: '0 18px', borderRadius: '14px', border: '1px solid rgba(237,228,210,0.2)', color: '#EDE4D2', fontSize: '15px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
              >
                Keep swiping
              </NavLink>
            </div>
          </div>
        ) : (
          [...visible].reverse().map((f, idx) => {
            const depth = visible.length - 1 - idx
            const isTop = depth === 0
            return (
              <div
                key={f.id}
                className={calm ? undefined : 'ms-deck-in'}
                aria-hidden={!isTop}
                style={{ position: 'absolute', inset: 0, animationDelay: `${(2 - depth) * 70}ms` }}
              >
                <div
                  className={isTop && nudge ? 'ms-nudge' : undefined}
                  onPointerDown={isTop ? down : undefined}
                  onPointerMove={isTop ? move : undefined}
                  onPointerUp={isTop ? up : undefined}
                  onPointerCancel={isTop ? cancel : undefined}
                  role={isTop ? 'link' : undefined}
                  aria-label={isTop ? `${f.title}. Tap to open the film, or pull sideways to choose.` : undefined}
                  style={{ position: 'absolute', inset: 0, borderRadius: '26px', overflow: 'hidden', background: '#12242B', boxShadow: depth === 0 ? '0 40px 80px rgba(0,0,0,.6)' : '0 20px 40px rgba(0,0,0,.4)', ...style(depth) }}
                >
                  <img
                    src={lighter(f.poster, depth)}
                    data-bars={hasBars(lighter(f.poster, depth)) ? 'yes' : undefined}
                    alt=""
                    width={380}
                    height={520}
                    loading={depth === 0 ? 'eager' : 'lazy'}
                    fetchPriority={depth === 0 ? 'high' : 'auto'}
                    decoding="async"
                    draggable={false}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: hasBars(lighter(f.poster, depth)) ? 'center center' : 'center top', transform: hasBars(lighter(f.poster, depth)) ? `scale(${BARS_ZOOM})` : undefined, pointerEvents: 'none' }}
                  />
                  <div className="ms-grain" />
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%', background: 'linear-gradient(to top,rgba(8,7,6,.96) 0%,rgba(8,7,6,.7) 40%,rgba(8,7,6,0))', pointerEvents: 'none' }} />
                  {depth > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(11,10,9,${depth === 1 ? 0.28 : 0.45})`, pointerEvents: 'none' }} />}

                  {isTop && (
                    <>
                      <div style={{ position: 'absolute', top: '22px', left: '22px', padding: '6px 12px', borderRadius: '10px', border: '2px solid #C8963E', color: '#C8963E', background: 'rgba(11,10,9,0.55)', ...MONO, fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transform: 'rotate(-8deg)', opacity: dx > 0 ? pull : 0, pointerEvents: 'none' }}>Seen it</div>
                      <div style={{ position: 'absolute', top: '22px', right: '22px', padding: '6px 12px', borderRadius: '10px', border: '2px solid #EDE4D2', color: '#EDE4D2', background: 'rgba(11,10,9,0.55)', ...MONO, fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', transform: 'rotate(8deg)', opacity: dx < 0 ? pull : 0, pointerEvents: 'none' }}>Watch later</div>
                    </>
                  )}

                  <div style={{ position: 'absolute', left: '24px', right: '24px', bottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
                    <div style={{ ...SERIF, fontSize: 'clamp(34px, 11vw, 46px)', lineHeight: 0.98, color: '#F6EFE2', overflowWrap: 'anywhere' }}>{f.title}</div>
                    <div style={{ fontSize: '15px', color: '#D8CFC0' }}>{f.line}</div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!done && (
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            type="button"
            className="ms-press"
            onClick={() => fly(-1)}
            style={{ flex: 1, height: '54px', borderRadius: '16px', border: '1px solid rgba(237,228,210,.16)', background: '#161411', color: '#EDE4D2', fontSize: '15px', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
            Haven&apos;t seen it
          </button>
          <button
            type="button"
            className="ms-press"
            onClick={() => fly(1)}
            style={{ flex: 1, height: '54px', borderRadius: '16px', border: 'none', background: '#C8963E', color: '#0B0A09', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Seen it
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}

      <p style={{ ...MONO, fontSize: '12px', color: '#8C857A', margin: 0, textAlign: 'center' }}>
        {done
          ? 'Saved on this device only, until you make an account.'
          : seen + later === 0
            ? `${i + 1} of ${total} · Try it. No account needed.`
            : `${i + 1} of ${total} · ${seen + later} saved on this device`}
      </p>

      <p className="sr-only" role="status" aria-live="polite">{note}</p>
    </div>
  )
}
