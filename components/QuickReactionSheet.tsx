'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Movie } from '@/lib/queries'
import { REACTIONS, TAGS } from '@/lib/reactions'
import { SharePanel } from '@/components/SharePanel'
import { AwardNote, type AwardsInfo } from '@/components/AwardNote'
import { StandoutPicker, NO_STANDOUTS, standoutsPayload, useStandoutOptions, type StandoutValue } from '@/components/StandoutPicker'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

type Step = 'reaction' | 'rating' | 'tags' | 'oneliner' | 'auth' | 'share'

interface Props {
  movie: Movie
  isLoggedIn: boolean
  onSave: (reactionKey: string) => void
  onSkip: () => void
}

export function QuickReactionSheet({ movie, isLoggedIn, onSave, onSkip }: Props) {
  const [step, setStep]           = useState<Step>('reaction')
  const [reaction, setReaction]   = useState<string | null>(null)
  const [rating, setRating]       = useState<number | null>(null)
  const [hoverStar, setHoverStar] = useState(0)
  const [tags, setTags]           = useState<string[]>([])
  const [oneLiner, setOneLiner]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [finished, setFinished] = useState<Array<{ slug: string; title: string }>>([])
  const [dnaReady, setDnaReady] = useState(false)
  const [awardsInfo, setAwardsInfo] = useState<AwardsInfo | null>(null)
  const [standouts, setStandouts] = useState<StandoutValue>(NO_STANDOUTS)
  const standoutOptions = useStandoutOptions(movie.id, isLoggedIn)

  const toggleTag = (slug: string) => {
    setTags(prev =>
      prev.includes(slug)
        ? prev.filter(t => t !== slug)
        : prev.length < 3 ? [...prev, slug] : prev
    )
  }

  const persist = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          reaction,
          rating,
          tags,
          one_liner: oneLiner.trim() || null,
          standouts: standoutsPayload(standoutOptions, standouts),
        }),
      })
      const data = await res.json()
      setFinished(Array.isArray(data.completed) ? data.completed : [])
      setDnaReady(!!data.dnaReady)
      setAwardsInfo(data.awards ?? null)
      return data.shareToken ?? null
    } catch {
      return null
    }
  }

  const saveAndNext = async () => {
    setSaving(true)
    const token = await persist()
    setSaving(false)
    if (token) {
      setShareToken(token)
      setStep('share')
    } else {
      onSave(reaction || '')
    }
  }

  const handleSaveClick = () => {
    if (!isLoggedIn) {
      setStep('auth')
      return
    }
    saveAndNext()
  }

  const starDisplay = (n: number) => n <= (hoverStar || rating || 0) ? '★' : '☆'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onSkip}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(8,7,6,0.6)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: '50%', zIndex: 41,
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: '480px',
          background: '#18150F',
          borderRadius: '28px 28px 0 0',
          padding: '20px 24px',
          paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          boxShadow: '0 -32px 80px rgba(0,0,0,0.85)',
        }}
      >
        {/* Drag handle + film label */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(237,228,210,0.18)' }} />
          <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C857A', margin: 0 }}>
            {movie.title}
          </p>
        </div>

        {/* ── Step A — reaction ───────────────────────────── */}
        {step === 'reaction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,6vw,38px)', lineHeight: 1, color: '#F6EFE2', margin: 0, textAlign: 'center' }}>
              What did you think?
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {REACTIONS.map(({ key, emoji, label }) => (
                <button
                  key={key}
                  onClick={() => { setReaction(key); setStep('rating') }}
                  style={{
                    height: '84px', borderRadius: '20px',
                    background: '#23201A',
                    border: '1px solid rgba(237,228,210,0.1)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '32px', lineHeight: 1 }}>{emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#C7BFB2' }}>{label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onSkip}
              style={{ background: 'none', border: 'none', color: '#8C857A', fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}
            >
              Skip for now
            </button>
          </div>
        )}

        {/* ── Step B — star rating ─────────────────────────── */}
        {step === 'rating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,6vw,38px)', lineHeight: 1, color: '#F6EFE2', margin: 0, textAlign: 'center' }}>
                How many stars?
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#8C857A' }}>
                Your personal rating
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onMouseEnter={() => setHoverStar(n)}
                  onMouseLeave={() => setHoverStar(0)}
                  onClick={() => { setRating(n); setStep('tags') }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '52px', lineHeight: 1,
                    color: n <= (hoverStar || rating || 0) ? '#C8963E' : 'rgba(237,228,210,0.2)',
                    transition: 'color 0.1s',
                    padding: '4px 2px',
                    minWidth: '44px', minHeight: '60px',
                  }}
                >
                  {starDisplay(n)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('tags')}
              style={{ background: 'none', border: 'none', color: '#8C857A', fontSize: '14px', cursor: 'pointer', padding: '4px 0' }}
            >
              Skip rating
            </button>
          </div>
        )}

        {/* ── Step C — tags ───────────────────────────────── */}
        {step === 'tags' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,6vw,38px)', lineHeight: 1, color: '#F6EFE2', margin: 0, textAlign: 'center' }}>
                What stood out?
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#8C857A' }}>
                Pick up to 3
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {TAGS.map(({ slug, label }) => {
                const selected = tags.includes(slug)
                const maxed = !selected && tags.length >= 3
                return (
                  <button
                    key={slug}
                    onClick={() => toggleTag(slug)}
                    disabled={maxed}
                    style={{
                      height: '40px', padding: '0 18px', borderRadius: '999px',
                      background: selected ? '#C8963E' : '#23201A',
                      border: selected ? 'none' : '1px solid rgba(237,228,210,0.12)',
                      color: selected ? '#0B0A09' : maxed ? '#4B4440' : '#C7BFB2',
                      fontSize: '15px', fontWeight: selected ? 600 : 400,
                      cursor: maxed ? 'default' : 'pointer',
                      transition: 'background 0.12s',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <StandoutPicker options={standoutOptions} value={standouts} onChange={setStandouts} />

            <button
              onClick={() => setStep('oneliner')}
              style={{
                height: '56px', borderRadius: '18px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '17px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
              }}
            >
              {tags.length > 0 ? `Next (${tags.length} picked)` : 'Skip tags'}
            </button>
          </div>
        )}

        {/* ── Step D — one-liner ──────────────────────────── */}
        {step === 'oneliner' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,6vw,38px)', lineHeight: 1, color: '#F6EFE2', margin: 0, textAlign: 'center' }}>
              One sentence. Go.
            </h3>

            <div style={{ position: 'relative' }}>
              <textarea
                value={oneLiner}
                onChange={e => setOneLiner(e.target.value.slice(0, 180))}
                placeholder="Great chemistry, but the ending felt rushed."
                rows={3}
                autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#23201A',
                  border: '1px solid rgba(237,228,210,0.12)',
                  borderRadius: '16px', padding: '14px 16px',
                  color: '#F6EFE2', fontSize: '16px', lineHeight: '1.55',
                  resize: 'none', outline: 'none', fontFamily: 'inherit',
                }}
              />
              <span style={{
                position: 'absolute', bottom: '10px', right: '12px',
                ...MONO, fontSize: '11px', color: '#8C857A',
              }}>
                {180 - oneLiner.length}
              </span>
            </div>

            <button
              onClick={handleSaveClick}
              disabled={saving}
              style={{
                height: '56px', borderRadius: '18px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '17px', fontWeight: 600,
                border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving your reaction...' : 'Save my reaction'}
            </button>

            <Link
              href={`/movie/${movie.id}#review`}
              onClick={() => persist()}
              style={{ textAlign: 'center', fontSize: '14px', color: '#C8963E', textDecoration: 'none' }}
            >
              Want to say more? Write a full review →
            </Link>
          </div>
        )}

        {/* ── Step E — auth gate ──────────────────────────── */}
        {step === 'auth' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,5vw,36px)', lineHeight: 1.1, color: '#F6EFE2', margin: 0 }}>
                Save your movie taste?
              </h3>
              <p style={{ margin: 0, fontSize: '15px', color: '#A39B8F', lineHeight: 1.6 }}>
                Sign in to keep this reaction and build a permanent record of what you have watched.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a
                href="/auth?mode=signup&redirect=/swipe"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '56px', borderRadius: '18px',
                  background: '#C8963E', color: '#0B0A09',
                  fontSize: '16px', fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Create a free account
              </a>
              <a
                href="/auth?redirect=/swipe"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: '56px', borderRadius: '18px',
                  border: '1px solid rgba(237,228,210,0.18)',
                  color: '#EDE4D2', fontSize: '16px',
                  textDecoration: 'none',
                }}
              >
                Sign in
              </a>
              <button
                onClick={onSkip}
                style={{ background: 'none', border: 'none', color: '#8C857A', fontSize: '14px', cursor: 'pointer', padding: '8px 0' }}
              >
                Skip for now
              </button>
            </div>
          </div>
        )}

        {/* ── Step F — share prompt ───────────────────────── */}
        {step === 'share' && shareToken && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
              <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,5vw,36px)', lineHeight: 1, color: '#F6EFE2', margin: 0, textAlign: 'center' }}>
                Your take is saved.
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#8C857A', textAlign: 'center' }}>
                Share it with people who love African cinema.
              </p>
            </div>

            {finished.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {finished.map(c => (
                  <Link
                    key={c.slug}
                    href={`/challenges/${c.slug}`}
                    style={{ display: 'block', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.45)', background: 'rgba(200,150,62,0.1)', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span style={{ display: 'block', fontSize: '13px', color: '#C8963E', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"Geist Mono", monospace' }}>Challenge finished</span>
                    <span style={{ display: 'block', fontSize: '16px', color: '#F6EFE2', marginTop: '2px' }}>{c.title}. Tap to collect your laurel.</span>
                  </Link>
                ))}
              </div>
            )}

            {dnaReady && (
              <Link
                href="/dna"
                style={{ display: 'block', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.45)', background: 'rgba(200,150,62,0.1)', textDecoration: 'none', minHeight: '44px' }}
              >
                <span style={{ display: 'block', fontSize: '13px', color: '#C8963E', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"Geist Mono", monospace' }}>Movie DNA</span>
                <span style={{ display: 'block', fontSize: '16px', color: '#F6EFE2', marginTop: '2px' }}>Your Movie DNA is ready. Tap to see it.</span>
              </Link>
            )}

            <AwardNote info={awardsInfo} />

            <SharePanel
              token={shareToken}
              title={movie.title}
              has={{ rating: !!rating, words: !!oneLiner.trim(), tags: tags.length > 0 }}
              words={oneLiner.trim() || undefined}
            />

            {/* Keep swiping */}
            <button
              onClick={() => onSave(reaction || '')}
              style={{
                background: 'none', border: 'none',
                color: '#8C857A', fontSize: '14px',
                cursor: 'pointer', padding: '4px 0',
              }}
            >
              Keep swiping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
