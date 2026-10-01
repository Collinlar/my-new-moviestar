'use client'

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_SHARE_OPTIONS, SHARE_TEMPLATES, type ShareOptions } from '@/lib/share'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

interface Props {
  token: string
  /** The film (for a take) or the challenge (for a laurel). */
  title: string
  /** A take has layouts and several things to show or hide. A laurel only has the name. */
  kind?: 'take' | 'laurel'
  /** What this take contains, so the panel only offers choices that change something. */
  has?: { rating: boolean; words: boolean; tags: boolean }
  words?: string
  /** Called when the person opens one of the share routes. */
  onShared?: () => void
}

const BTN: React.CSSProperties = {
  minHeight: '48px', borderRadius: '14px', background: '#23201A', border: '1px solid rgba(237,228,210,0.12)',
  color: '#C7BFB2', fontSize: '15px', fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '0 12px',
}

export function SharePanel({ token, title, kind = 'take', has = { rating: false, words: false, tags: false }, words, onShared }: Props) {
  const [options, setOptions] = useState<ShareOptions>(DEFAULT_SHARE_OPTIONS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const latest = useRef(0)

  const isLaurel = kind === 'laurel'
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://muviestars.com'}/${isLaurel ? 'laurel' : 'take'}/${token}`
  const imagePath = `/api/og/${isLaurel ? 'laurel' : 'take'}`

  // Saves the choices, then refreshes the preview so it always shows what will be shared.
  const update = async (patch: Partial<ShareOptions>) => {
    if (!loaded) return
    const next = { ...options, ...patch }
    const call = ++latest.current
    setOptions(next)
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/share/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: token, ...next }),
      })
      const json = await res.json().catch(() => null)
      if (call !== latest.current) return
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'Your sharing choice did not save. Tap it again.')
      } else {
        setVersion((v) => v + 1)
      }
    } catch {
      if (call === latest.current) setError('We could not reach MuvieStars just now. Check your connection and tap again.')
    } finally {
      if (call === latest.current) setSaving(false)
    }
  }

  const track = (destination: string) => {
    onShared?.()
    fetch('/api/share/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share_token: token, destination }),
    }).catch(() => {})
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // The link is shown below, so it can still be copied by hand.
    }
  }

  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return }
    try {
      await navigator.share({
        title: isLaurel ? `I completed ${title}` : `${title}: my take`,
        text: isLaurel ? `I completed the ${title} challenge on MuvieStars.` : options.show_words && words ? words : `I just rated ${title} on MuvieStars.`,
        url: shareUrl,
      })
    } catch {
      // Dismissed.
    }
  }

  useEffect(() => { setCopied(false) }, [token])

  // A card can already have choices saved from an earlier visit. Show those, not the defaults.
  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    fetch(`/api/share/card?token=${token}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && json?.ok) setOptions(json.options) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoaded(true) })
    return () => { cancelled = true }
  }, [token])

  const toggles: Array<{ key: 'show_name' | 'show_rating' | 'show_words' | 'show_tags'; label: string; show: boolean }> = [
    { key: 'show_name',   label: 'Put my name on it',      show: true },
    { key: 'show_rating', label: 'Show my stars',          show: !isLaurel && has.rating },
    { key: 'show_words',  label: 'Show my words',          show: !isLaurel && has.words },
    { key: 'show_tags',   label: 'Show what stood out',    show: !isLaurel && has.tags },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* What will be shared */}
      <div style={{ borderRadius: '14px', overflow: 'hidden', background: '#15120E', aspectRatio: '1 / 1', maxWidth: '260px', width: '100%', alignSelf: 'center', position: 'relative' }}>
        <img
          key={version}
          src={`${imagePath}?token=${token}&v=${version}`}
          alt={isLaurel ? `How your ${title} laurel will look when shared` : `How your take on ${title} will look when shared`}
          width={260}
          height={260}
          style={{ width: '100%', height: '100%', display: 'block', opacity: saving ? 0.4 : 1, transition: 'opacity 0.15s' }}
        />
      </div>

      {/* Layout */}
      {!isLaurel && (
      <div role="group" aria-label="Card layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {SHARE_TEMPLATES.map((t) => {
          const on = options.template === t.key
          return (
            <button
              key={t.key}
              type="button"
              aria-pressed={on}
              onClick={() => update({ template: t.key })}
              style={{
                minHeight: '48px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: 500,
                background: on ? 'rgba(200,150,62,0.15)' : 'transparent',
                border: `1px solid ${on ? 'rgba(200,150,62,0.6)' : 'rgba(237,228,210,0.14)'}`,
                color: on ? '#C8963E' : '#A39B8F',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      )}

      {/* What to show */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
        <legend style={{ ...MONO, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C857A', padding: 0, marginBottom: '4px' }}>
          What people see
        </legend>
        {toggles.filter((t) => t.show).map((t) => (
          <label key={t.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: '44px', fontSize: '15px', color: '#EDE4D2', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={options[t.key]}
              onChange={(e) => update({ [t.key]: e.target.checked } as Partial<ShareOptions>)}
              style={{ width: '20px', height: '20px', accentColor: '#C8963E' }}
            />
            {t.label}
          </label>
        ))}
      </fieldset>

      {error && <p role="alert" style={{ margin: 0, fontSize: '14px', color: '#E58A7B' }}>{error}</p>}

      {/* Where to send it */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', opacity: saving ? 0.6 : 1 }} aria-busy={saving}>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(isLaurel ? `I completed the ${title} challenge on MuvieStars: ${shareUrl}` : `I watched ${title} on MuvieStars. Here is my take: ${shareUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('whatsapp')}
          style={{ ...BTN, background: '#25D366', color: '#0B0A09', fontWeight: 600, pointerEvents: saving ? 'none' : 'auto' }}
        >
          Send on WhatsApp
        </a>
        <button type="button" disabled={saving} onClick={() => { copyLink(); track('copy_link') }} style={{ ...BTN, background: copied ? '#1D9E75' : '#23201A', color: copied ? '#0B0A09' : '#C7BFB2' }}>
          {copied ? 'Link copied' : 'Copy my link'}
        </button>
        <a
          href={`${imagePath}?token=${token}&v=${version}`}
          target="_blank"
          rel="noopener noreferrer"
          download={`${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${isLaurel ? 'laurel' : 'my-take'}.png`}
          onClick={() => track('save_image')}
          style={{ ...BTN, pointerEvents: saving ? 'none' : 'auto' }}
        >
          Save the image
        </a>
        <button type="button" disabled={saving} onClick={() => { nativeShare(); track('native_share') }} style={BTN}>
          More ways to share
        </button>
      </div>
    </div>
  )
}
