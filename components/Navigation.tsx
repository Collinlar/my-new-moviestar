'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Search, Menu, X, Film } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'kofcollkcl100@gmail.com'

const navLinks = [
  { href: '/browse',    label: 'Browse'     },
  { href: '/trending',  label: 'Trending'   },
  { href: '/canon',     label: 'Canon'      },
  { href: '/festivals', label: 'Festivals'  },
  { href: '/creators',  label: 'Filmmakers' },
  { href: '/people',    label: 'People'     },
]

export function Navigation() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen]         = useState(false)
  const [user, setUser]       = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user ?? null)
      if (user) {
        const admin = user.email === ADMIN_EMAIL
        if (!admin) {
          const { data } = await (supabase as any).from('profiles').select('role').eq('user_id', user.id).single()
          setIsAdmin(data?.role === 'admin')
        } else {
          setIsAdmin(true)
        }
      }
    }
    checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setIsAdmin(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isHome = pathname === '/'

  return (
    <>
      <header
        className={cn(
          'fixed top-0 inset-x-0 z-50 transition-all duration-300',
          isHome && !scrolled
            ? 'bg-transparent'
            : 'bg-cinema-black/95 backdrop-blur-sm border-b border-cinema-border'
        )}
      >
        <div className="section-container">
          <nav className="flex items-center justify-between h-16" aria-label="Main navigation">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 text-film-cream hover:text-film-gold transition-colors"
              aria-label="MuvieStars — Home"
            >
              <Film className="w-5 h-5 text-film-gold" aria-hidden="true" />
              <span className="font-bold text-lg tracking-tight">
                Muvie<span className="text-film-gold">Stars</span>
              </span>
            </Link>

            {/* Desktop links */}
            <ul className="hidden md:flex items-center gap-1" role="list">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname?.startsWith(link.href)
                        ? 'text-film-gold'
                        : 'text-film-muted hover:text-film-cream'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <Link
                href="/search"
                className="btn-ghost p-2"
                aria-label="Search movies"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex btn-ghost text-xs py-1.5 text-film-gold hover:text-film-amber"
                >
                  Admin
                </Link>
              )}
              {user ? (
                <div className="hidden sm:flex items-center gap-2">
                  <Link href="/account" className="btn-ghost text-sm py-1.5 text-film-muted hover:text-film-cream">
                    My account
                  </Link>
                  <button onClick={handleSignOut} className="btn-outline text-sm py-1.5">
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth"
                  className="hidden sm:inline-flex btn-outline text-sm py-1.5"
                >
                  Sign in
                </Link>
              )}

              {/* Mobile menu toggle */}
              <button
                className="md:hidden btn-ghost p-2"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label="Toggle navigation menu"
              >
                {open
                  ? <X className="w-5 h-5" aria-hidden="true" />
                  : <Menu className="w-5 h-5" aria-hidden="true" />
                }
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-cinema-black/80 backdrop-blur-sm" />
          <nav
            className="absolute top-16 inset-x-0 bg-cinema-dark border-b border-cinema-border p-4"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile navigation"
          >
            <ul className="flex flex-col gap-1" role="list">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center px-4 py-3 rounded-lg text-base font-medium transition-colors',
                      pathname?.startsWith(link.href)
                        ? 'text-film-gold bg-cinema-surface'
                        : 'text-film-cream hover:bg-cinema-surface'
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              {isAdmin && (
                <li>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-film-gold hover:bg-cinema-surface transition-colors"
                  >
                    Admin panel
                  </Link>
                </li>
              )}
              {user && (
                <li>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="flex items-center px-4 py-3 rounded-lg text-base font-medium text-film-cream hover:bg-cinema-surface transition-colors"
                  >
                    My account
                  </Link>
                </li>
              )}
              <li className="mt-2 pt-2 border-t border-cinema-border">
                {user ? (
                  <button
                    onClick={() => { setOpen(false); handleSignOut() }}
                    className="btn-outline w-full justify-center"
                  >
                    Sign out
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    onClick={() => setOpen(false)}
                    className="btn-gold w-full justify-center"
                  >
                    Sign in
                  </Link>
                )}
              </li>
            </ul>
          </nav>
        </div>
      )}
    </>
  )
}
