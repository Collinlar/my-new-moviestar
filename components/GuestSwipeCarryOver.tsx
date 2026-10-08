'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { clearGuestSwipes, readGuestSwipes } from '@/lib/guest-swipes'
import { hasSessionCookie } from '@/lib/session'

/**
 * When someone who tried the homepage swipe preview signs in or signs up, their picks come with them. Mounted once
 * for the whole site, so it works whichever page sign-in lands on. The picks are only removed from this device after
 * they have been saved to the account.
 *
 * It does not load the Supabase library: the server checks who is signed in when the picks arrive. It only looks for
 * a session cookie, and only when there are picks to carry, so most visitors cost nothing here. It looks again on every
 * page change, which is when a sign-in lands.
 */
export function GuestSwipeCarryOver() {
  const busy = useRef(false)
  const pathname = usePathname()

  useEffect(() => {
    let storage: Storage | null = null
    try { storage = window.localStorage } catch { return }
    if (!hasSessionCookie()) return
    const items = readGuestSwipes(storage)
    if (items.length === 0 || busy.current) return

    busy.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/guest-swipes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
        if (!res.ok) return
        const json = await res.json()
        clearGuestSwipes(storage)
        const later = json.later ?? 0, seen = json.seen ?? 0
        if (later + seen > 0) {
          const parts = [
            later ? `${later} on your watch-later list` : null,
            seen ? `${seen} marked as seen` : null,
          ].filter(Boolean).join(' and ')
          toast.success(`Your swipes came with you: ${parts}.`)
        }
      } catch {
        // Stay on the device and try again next time the site opens.
      } finally {
        busy.current = false
      }
    })()
  }, [pathname])

  return null
}
