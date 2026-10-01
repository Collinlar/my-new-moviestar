'use client'

import { useEffect } from 'react'

/** Records one visit per browser session for a shared link. Renders nothing. */
export function ShareVisitBeacon({ token }: { token: string }) {
  useEffect(() => {
    const key = `ms_share_visit_${token}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      // Private mode: fall through and count the visit once per page load.
    }
    fetch('/api/share/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {})
  }, [token])

  return null
}
