'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

const KEY = 'ms_analytics_choice'
const OPEN_EVENT = 'ms:cookie-choices'
const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

type Choice = 'granted' | 'denied'

function readChoice(): Choice | null {
  try {
    const v = window.localStorage.getItem(KEY)
    return v === 'granted' || v === 'denied' ? v : null
  } catch {
    return null
  }
}

function saveChoice(c: Choice) {
  try { window.localStorage.setItem(KEY, c) } catch { /* private window: the choice lasts until the tab closes */ }
}

/** Google Analytics is only fetched after a yes. Before that, and after a no, nothing from Google Analytics loads. */
function startAnalytics(gaId: string) {
  const w = window as any
  w[`ga-disable-${gaId}`] = false
  if (w.__msGaLoaded) return
  w.__msGaLoaded = true
  w.dataLayer = w.dataLayer || []
  w.gtag = function gtag() { w.dataLayer.push(arguments) }
  w.gtag('js', new Date())
  w.gtag('config', gaId)
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(s)
}

/** After a no, stop any running tag and clear the cookies it set. */
function stopAnalytics(gaId: string) {
  const w = window as any
  w[`ga-disable-${gaId}`] = true
  const host = window.location.hostname
  const labels = host.split('.')
  const domains = new Set<string>(['', host, '.' + host])
  for (let i = 0; i < labels.length - 1; i++) domains.add('.' + labels.slice(i).join('.'))
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0].trim()
    if (name === '_ga' || name === '_gid' || name.startsWith('_ga_') || name.startsWith('_gat')) {
      for (const d of domains) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`
    }
  }
}

/**
 * Asks before analytics cookies are set. Only appears when analytics is switched on for the site.
 * Both answers are the same size and one tap. The footer's "Cookie choices" link brings it back.
 */
export function CookieConsent({ gaId }: { gaId?: string }) {
  const [choice, setChoice] = useState<Choice | null | undefined>(undefined)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!gaId) return
    const saved = readChoice()
    setChoice(saved)
    setAsking(saved === null)
    if (saved === 'granted') startAnalytics(gaId)
    const reopen = () => setAsking(true)
    window.addEventListener(OPEN_EVENT, reopen)
    return () => window.removeEventListener(OPEN_EVENT, reopen)
  }, [gaId])

  const answer = useCallback((c: Choice) => {
    if (!gaId) return
    saveChoice(c)
    setChoice(c)
    setAsking(false)
    if (c === 'granted') startAnalytics(gaId)
    else stopAnalytics(gaId)
  }, [gaId])

  if (!gaId || !asking) return null

  const BTN: React.CSSProperties = {
    flex: '1 1 140px', minHeight: '48px', padding: '0 18px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.28)',
    background: 'transparent', color: '#F6EFE2', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <section
      aria-label="Cookie choices"
      className="fixed left-3 right-3 bottom-[76px] md:left-auto md:right-6 md:bottom-6 md:w-[420px]"
      style={{ zIndex: 35, padding: '18px', borderRadius: '16px', border: '1px solid rgba(237,228,210,0.18)', background: '#14110C', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
    >
      <p style={{ ...MONO, margin: '0 0 6px', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C8963E' }}>Cookies</p>
      <p style={{ margin: '0 0 14px', fontSize: '15px', lineHeight: 1.55, color: '#EDE4D2' }}>
        Can we count visits with Google Analytics? It sets cookies. Say no and nothing from Google Analytics loads.
        {choice && <span style={{ color: '#A39B8F' }}> You said {choice === 'granted' ? 'yes' : 'no'} before, and you can change it here.</span>}
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => answer('granted')} style={BTN}>Yes, count my visits</button>
        <button type="button" onClick={() => answer('denied')} style={BTN}>No, leave me out</button>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: '13px' }}>
        <Link href="/privacy#cookies" style={{ color: '#A39B8F', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>What the cookies are</Link>
      </p>
    </section>
  )
}

/** A footer link that reopens the cookie question. */
export function CookieChoicesLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit' }}>
      Cookie choices
    </button>
  )
}
