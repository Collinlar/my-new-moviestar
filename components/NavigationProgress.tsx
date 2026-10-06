'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export const NAV_START_EVENT = 'ms:nav-start'

/** Call before a programmatic router.push so the progress bar knows a page is on the way. */
export function startNavigationProgress() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NAV_START_EVENT))
}

const SHOW_AFTER_MS = 120   // a page that arrives faster than this needs no bar
const GIVE_UP_MS = 15_000   // never leave the bar hanging

/**
 * A thin gold bar across the top that starts the moment a link is tapped and finishes when the new page arrives.
 * The App Router has no navigation events, so it listens for taps on internal links and finishes when the address changes.
 */
export function NavigationProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const key = `${pathname}?${search?.toString() ?? ''}`
  const lastKey = useRef(key)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const showTimer = useRef<ReturnType<typeof setTimeout>>()
  const giveUpTimer = useRef<ReturnType<typeof setTimeout>>()
  const doneTimer = useRef<ReturnType<typeof setTimeout>>()

  const start = useCallback(() => {
    clearTimeout(showTimer.current); clearTimeout(giveUpTimer.current); clearTimeout(doneTimer.current)
    showTimer.current = setTimeout(() => setPhase('running'), SHOW_AFTER_MS)
    giveUpTimer.current = setTimeout(() => { setPhase('done'); doneTimer.current = setTimeout(() => setPhase('idle'), 300) }, GIVE_UP_MS)
  }, [])

  const finish = useCallback(() => {
    clearTimeout(showTimer.current); clearTimeout(giveUpTimer.current); clearTimeout(doneTimer.current)
    setPhase((p) => {
      if (p === 'idle') return p
      doneTimer.current = setTimeout(() => setPhase('idle'), 300)
      return 'done'
    })
  }, [])

  // A new address means the page arrived.
  useEffect(() => {
    if (key !== lastKey.current) { lastKey.current = key; finish() }
  }, [key, finish])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, window.location.href)
      if (url.origin !== window.location.origin) return
      // Same page, or only the #section changed: nothing is coming.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      start()
    }
    const onPop = () => start()
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    window.addEventListener(NAV_START_EVENT, start)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
      window.removeEventListener(NAV_START_EVENT, start)
      clearTimeout(showTimer.current); clearTimeout(giveUpTimer.current); clearTimeout(doneTimer.current)
    }
  }, [start])

  return (
    <div className="ms-progress" data-phase={phase} aria-hidden="true">
      <div className="ms-progress-bar" />
    </div>
  )
}
