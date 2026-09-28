'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const GENRES = [
  { slug: 'romance',      label: 'Romance'      },
  { slug: 'comedy',       label: 'Comedy'       },
  { slug: 'drama',        label: 'Drama'        },
  { slug: 'action',       label: 'Action'       },
  { slug: 'thriller',     label: 'Thriller'     },
  { slug: 'horror',       label: 'Horror'       },
  { slug: 'documentary',  label: 'Documentary'  },
  { slug: 'musical',      label: 'Musical'      },
  { slug: 'family',       label: 'Family'       },
  { slug: 'historical',   label: 'Historical'   },
  { slug: 'animation',    label: 'Animation'    },
  { slug: 'political',    label: 'Political'    },
]

const COUNTRIES = [
  { slug: 'ghana',        label: 'Ghana',          flag: '🇬🇭' },
  { slug: 'nigeria',      label: 'Nigeria',         flag: '🇳🇬' },
  { slug: 'south-africa', label: 'South Africa',    flag: '🇿🇦' },
  { slug: 'senegal',      label: 'Senegal',         flag: '🇸🇳' },
  { slug: 'kenya',        label: 'Kenya',           flag: '🇰🇪' },
  { slug: 'ethiopia',     label: 'Ethiopia',        flag: '🇪🇹' },
  { slug: 'egypt',        label: 'Egypt',           flag: '🇪🇬' },
  { slug: 'cameroon',     label: 'Cameroon',        flag: '🇨🇲' },
  { slug: 'cote-divoire', label: "Côte d'Ivoire",   flag: '🇨🇮' },
  { slug: 'tanzania',     label: 'Tanzania',        flag: '🇹🇿' },
  { slug: 'all',          label: 'All of Africa',   flag: '🌍' },
]

type Step = 'genres' | 'countries' | 'done'

interface Props {
  show: boolean
  userName: string | null
}

export function OnboardingFlow({ show, userName }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]         = useState<Step>('genres')
  const [genres, setGenres]     = useState<string[]>([])
  const [countries, setCountries] = useState<string[]>([])
  const [saving, setSaving]     = useState(false)
  const [visible, setVisible]   = useState(show)

  if (!visible) return null

  const toggleGenre = (slug: string) =>
    setGenres(prev =>
      prev.includes(slug) ? prev.filter(g => g !== slug)
        : prev.length < 5 ? [...prev, slug] : prev
    )

  const toggleCountry = (slug: string) =>
    setCountries(prev =>
      prev.includes(slug)
        ? prev.filter(c => c !== slug)
        : [...prev, slug]
    )

  const completeOnboarding = async () => {
    setSaving(true)
    try {
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          genre_picks: genres,
          country_picks: countries,
        },
      })
    } catch {}
    setSaving(false)
    setVisible(false)
    router.push('/swipe')
  }

  const skip = async () => {
    try {
      await supabase.auth.updateUser({ data: { onboarding_completed: true } })
    } catch {}
    setVisible(false)
  }

  const name = userName ? `, ${userName}` : ''

  return (
    <>
      {/* Full-screen backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(8,7,6,0.88)',
          backdropFilter: 'blur(8px)',
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-heading"
        style={{
          position: 'fixed', inset: 0, zIndex: 101,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: '560px',
            background: '#15120E',
            borderRadius: '28px',
            padding: '40px 36px 36px',
            boxShadow: '0 48px 120px rgba(0,0,0,0.9)',
            display: 'flex', flexDirection: 'column', gap: '32px',
          }}
        >
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {(['genres', 'countries', 'done'] as Step[]).map((s) => (
              <div
                key={s}
                style={{
                  width: s === step ? '24px' : '8px', height: '8px',
                  borderRadius: '999px',
                  background: s === step ? '#C8963E' : 'rgba(237,228,210,0.2)',
                  transition: 'width 0.2s, background 0.2s',
                }}
              />
            ))}
          </div>

          {/* ── Step 1 — genres ── */}
          {step === 'genres' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2
                  id="onboarding-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,5vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
                >
                  Welcome{name}.
                </h2>
                <p style={{ margin: 0, fontSize: '16px', color: '#A39B8F', lineHeight: 1.6 }}>
                  What kinds of films do you usually go for? Pick up to 5.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {GENRES.map(({ slug, label }) => {
                  const selected = genres.includes(slug)
                  const maxed = !selected && genres.length >= 5
                  return (
                    <button
                      key={slug}
                      onClick={() => toggleGenre(slug)}
                      disabled={maxed}
                      style={{
                        height: '40px', padding: '0 18px', borderRadius: '999px',
                        background: selected ? '#C8963E' : '#23201A',
                        border: selected ? 'none' : '1px solid rgba(237,228,210,0.12)',
                        color: selected ? '#0B0A09' : maxed ? '#4B4440' : '#C7BFB2',
                        fontSize: '15px', fontWeight: selected ? 600 : 400,
                        cursor: maxed ? 'default' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      {selected && <Check size={13} />}
                      {label}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setStep('countries')}
                  style={{
                    flex: 1, height: '52px', borderRadius: '16px',
                    background: '#C8963E', color: '#0B0A09',
                    fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {genres.length > 0 ? `Next (${genres.length} picked)` : 'Skip this step'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2 — countries ── */}
          {step === 'countries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h2
                  id="onboarding-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,5vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
                >
                  Which industries speak to you?
                </h2>
                <p style={{ margin: 0, fontSize: '16px', color: '#A39B8F', lineHeight: 1.6 }}>
                  Pick as many as you like. We will weight your deck toward what matters to you.
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COUNTRIES.map(({ slug, label, flag }) => {
                  const selected = countries.includes(slug)
                  return (
                    <button
                      key={slug}
                      onClick={() => toggleCountry(slug)}
                      style={{
                        height: '44px', padding: '0 18px', borderRadius: '999px',
                        background: selected ? '#C8963E' : '#23201A',
                        border: selected ? 'none' : '1px solid rgba(237,228,210,0.12)',
                        color: selected ? '#0B0A09' : '#C7BFB2',
                        fontSize: '15px', fontWeight: selected ? 600 : 400,
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{flag}</span>
                      {label}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setStep('genres')}
                  style={{
                    height: '52px', padding: '0 24px', borderRadius: '16px',
                    border: '1px solid rgba(237,228,210,0.18)', background: 'transparent',
                    color: '#EDE4D2', fontSize: '15px', cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('done')}
                  style={{
                    flex: 1, height: '52px', borderRadius: '16px',
                    background: '#C8963E', color: '#0B0A09',
                    fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  }}
                >
                  {countries.length > 0 ? `Next (${countries.length} picked)` : 'Skip this step'}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3 — done ── */}
          {step === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Check size={28} color="#C8963E" />
                </div>
                <h2
                  id="onboarding-heading"
                  style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,5vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
                >
                  You are all set.
                </h2>
                <p style={{ margin: 0, fontSize: '16px', color: '#A39B8F', lineHeight: 1.6 }}>
                  Your first deck is ready. Swipe through African cinema and we will learn what you like from how you react.
                </p>
              </div>

              {(genres.length > 0 || countries.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {genres.slice(0, 3).map(g => (
                    <span
                      key={g}
                      style={{
                        height: '32px', padding: '0 14px', borderRadius: '999px',
                        background: 'rgba(200,150,62,0.12)', color: '#C8963E',
                        fontSize: '14px', display: 'inline-flex', alignItems: 'center',
                        ...MONO,
                      }}
                    >
                      {g}
                    </span>
                  ))}
                  {countries.slice(0, 2).map(c => (
                    <span
                      key={c}
                      style={{
                        height: '32px', padding: '0 14px', borderRadius: '999px',
                        border: '1px solid rgba(237,228,210,0.15)', color: '#D8CFC0',
                        fontSize: '14px', display: 'inline-flex', alignItems: 'center',
                        ...MONO,
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={completeOnboarding}
                disabled={saving}
                style={{
                  height: '56px', borderRadius: '18px',
                  background: '#C8963E', color: '#0B0A09',
                  fontSize: '17px', fontWeight: 600, border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                }}
              >
                Start swiping
                <ArrowRight size={20} />
              </button>
            </div>
          )}

          {/* Skip link */}
          {step !== 'done' && (
            <button
              onClick={skip}
              style={{
                background: 'none', border: 'none',
                color: '#6A6258', fontSize: '14px', cursor: 'pointer',
                padding: '4px 0', textAlign: 'center',
              }}
            >
              Skip setup
            </button>
          )}
        </div>
      </div>
    </>
  )
}
