'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { clearGuestSwipes, readGuestSwipes } from '@/lib/guest-swipes'

/**
 * When someone who tried the homepage swipe preview signs in or signs up, their picks come with them. Mounted once
 * for the whole site, so it works whichever page sign-in lands on. The picks are only removed from this device after
 * they have been saved to the account.
 */
export function GuestSwipeCarryOver() {
  const busy = useRef(false)

  useEffect(() => {
    const supabase = createClient() as any

    async function carry() {
      if (busy.current) return
      let storage: Storage | null = null
      try { storage = window.localStorage } catch { return }
      const items = readGuestSwipes(storage)
      if (items.length === 0) return
      busy.current = true
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
    }

    supabase.auth.getUser().then(({ data }: any) => { if (data?.user) carry() })
    const { data: sub } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) carry()
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return null
}
