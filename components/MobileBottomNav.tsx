'use client'

import { NavLink } from '@/components/NavLink'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Home, Play, Compass, Users, User } from 'lucide-react'
import { hasSessionCookie } from '@/lib/session'
import { isActivePath } from '@/lib/nav'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

const NAV = [
  { href: '/',       label: 'Home',    Icon: Home,    exact: true  },
  { href: '/swipe',  label: 'Swipe',   Icon: Play,    exact: false },
  { href: '/discover', label: 'Discover', Icon: Compass, exact: false },
  { href: '/club',   label: 'Club',    Icon: Users,   exact: false },
  { href: '/account',label: 'You',     Icon: User,    exact: false, authHref: '/auth' },
]

export function MobileBottomNav() {
  const pathname  = usePathname()
  const [isSignedIn, setIsSignedIn] = useState(false)

  // Signed in or not is only needed to choose where "You" goes, so the session cookie answers it without loading the
  // Supabase library. It is read again on every page change, which is when a sign-in or sign-out lands.
  useEffect(() => { setIsSignedIn(hasSessionCookie()) }, [pathname])

  return (
    <nav
      className="md:hidden"
      aria-label="Mobile navigation"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
        background: '#0B0A09',
        borderTop: '1px solid rgba(237,228,210,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        display: 'flex',
      }}
    >
      {NAV.map(({ href, label, Icon, exact, authHref }) => {
        const resolvedHref = (label === 'You' && !isSignedIn && authHref) ? authHref : href
        const isActive = isActivePath(pathname, href, exact)
        return (
          <NavLink
            key={label}
            href={resolvedHref}
            aria-current={isActive ? 'page' : undefined}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: '4px', padding: '10px 4px',
              minHeight: '56px',
              color: isActive ? '#C8963E' : '#6A6258',
              textDecoration: 'none',
              transition: 'color 0.12s',
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
            <span style={{ ...MONO, fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {label}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
