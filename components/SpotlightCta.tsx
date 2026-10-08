'use client'

import { useEffect } from 'react'
import { NavLink } from '@/components/NavLink'

/** Adds one view or one tap to the Spotlight's count. No names, no devices. Fire and forget: a failed count never blocks a tap. */
function count(id: string, kind: 'view' | 'tap') {
  try {
    const body = JSON.stringify({ id, kind })
    if (navigator.sendBeacon?.('/api/spotlight/event', new Blob([body], { type: 'application/json' }))) return
    void fetch('/api/spotlight/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
  } catch { /* counting is a nicety */ }
}

/** The Spotlight's button. Counts the tap, then goes where the editors pointed it. */
export function SpotlightCta({ id, href, label }: { id: string; href: string; label: string }) {
  // One view per visit to the site, so refreshing the homepage ten times is not ten views.
  useEffect(() => {
    try {
      const key = `ms_spot_view_${id}`
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch { /* private window: count it, the worst case is one extra view */ }
    count(id, 'view')
  }, [id])

  return (
    <NavLink
      href={href}
      button
      pendingLabel="Opening the film..."
      onClick={() => count(id, 'tap')}
      style={{ minHeight: '52px', padding: '0 28px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
    >
      {label}
    </NavLink>
  )
}
