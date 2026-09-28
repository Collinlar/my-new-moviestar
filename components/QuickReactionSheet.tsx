'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Movie } from '@/lib/queries'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const REACTIONS = [
  { key: 'loved',      emoji: '❤️', label: 'Loved it'    },
  { key: 'liked',      emoji: '👍', label: 'Liked it'    },
  { key: 'okay',       emoji: '😐', label: 'It was okay' },
  { key: 'not_for_me', emoji: '👎', label: 'Not for me'  },
]

const TAGS = [
  { slug: 'story',     label: 'Story'     },
  { slug: 'acting',    label: 'Acting'    },
  { slug: 'chemistry', label: 'Chemistry' },
  { slug: 'visuals',   label: 'Visuals'   },
  { slug: 'music',     label: 'Music'     },
  { slug: 'culture',   label: 'Culture'   },
  { slug: 'dialogue',  label: 'Dialogue'  },
  { slug: 'pacing',    label: 'Pacing'    },
  { slug: 'direction', label: 'Direction' },
  { slug: 'ending',    label: 'Ending'    },
]

type Step = 'reaction' | 'tags' | 'oneliner'

interface Props {
  movie: Movie
  onSave: () => void
  onSkip: () => void
}

export function QuickReactionSheet({ movie, onSave, onSkip }: Props) {
  const [step, setStep]         = useState<Step>('reaction')
  const [reaction, setReaction] = useState<string | null>(null)
  const [tags, setTags]         = useState<string[]>([])
  const [oneLiner, setOneLiner] = useState('')
  const [saving, setSaving]     = useState(false)

  const toggleTag = (slug: string) => {
    setTags(prev =>
      prev.includes(slug)
        ? prev.filter(t => t !== slug)
        : prev.length < 3 ? [...prev, slug] : prev
    )
  }

  const persist = async () => {
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          reaction,
          tags,
          one_liner: oneLiner.trim() || null,
        }),
      })
    } catch {}
  }

  const saveAndNext = async () => {
    setSaving(true)
    await persist()
    setSaving(false)
    onSave()
  }

  return (
    <>
      {/* Backdrop — tap to skip */}
      <div
        onClick={onSkip}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(8,7,6,0.6)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Bottom sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: '50%', zIndex: 41,
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: '480px',
          background: '#18150F',
          borderRadius: '28px 28px 0 0',
          padding: '20px 24px env(safe-area-inset-bottom, 32px)',
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

        {/* ── Step A — reaction ───────────────────────────────────────── */}
        {step === 'reaction' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,6vw,38px)', lineHeight: 1, color: '#F6EFE2', margin: 0, textAlign: 'center' }}>
              What did you think?
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {REACTIONS.map(({ key, emoji, label }) => (
                <button
                  key={key}
                  onClick={() => { setReaction(key); setStep('tags') }}
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

        {/* ── Step B — tags ────────────────────────────────────────────── */}
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

        {/* ── Step C — one-liner ───────────────────────────────────────── */}
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
              onClick={saveAndNext}
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
              onClick={persist}
              style={{ textAlign: 'center', fontSize: '14px', color: '#C8963E', textDecoration: 'none' }}
            >
              Want to say more? Write a full review →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
