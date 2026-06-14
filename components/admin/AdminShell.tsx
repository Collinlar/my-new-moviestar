'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Film, LayoutDashboard, MessageSquare, Users, Shield,
  ChevronRight, Award, Clapperboard, UserCircle, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navSections = [
  {
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    heading: 'Content',
    items: [
      { href: '/admin/movies',    label: 'Movies',     icon: Film         },
      { href: '/admin/cast-crew', label: 'Cast & Crew', icon: Users        },
      { href: '/admin/awards',    label: 'Awards',     icon: Award        },
    ],
  },
  {
    heading: 'Talent',
    items: [
      { href: '/admin/people',   label: 'People',   icon: UserCircle  },
      { href: '/admin/creators', label: 'Creators', icon: Clapperboard },
    ],
  },
  {
    heading: 'Community',
    items: [
      { href: '/admin/reviews', label: 'Reviews', icon: Star         },
      { href: '/admin/users',   label: 'Users',   icon: MessageSquare },
    ],
  },
  {
    heading: 'Moderation',
    items: [
      { href: '/admin/moderation', label: 'Queue', icon: Shield },
    ],
  },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href)

  return (
    <div className="min-h-screen flex bg-cinema-black">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-cinema-border bg-cinema-dark flex flex-col fixed top-0 bottom-0 left-0 z-40">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-cinema-border">
          <Shield className="w-4 h-4 text-film-gold" aria-hidden="true" />
          <span className="font-semibold text-sm text-film-cream tracking-tight">Admin</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4" aria-label="Admin navigation">
          {navSections.map((section, i) => (
            <div key={i}>
              {section.heading && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-film-subtle">
                  {section.heading}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, exact }) => {
                  const active = isActive(href, exact)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-film-gold/10 text-film-gold'
                          : 'text-film-muted hover:text-film-cream hover:bg-cinema-surface'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      {label}
                      {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" aria-hidden="true" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-cinema-border">
          <Link href="/" className="text-xs text-film-subtle hover:text-film-muted transition-colors">
            Back to MuvieStars
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 ml-52 min-h-screen">
        {children}
      </main>
    </div>
  )
}
