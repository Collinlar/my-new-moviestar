import Link from 'next/link'
import { Film } from 'lucide-react'

const footerLinks = {
  Discover: [
    { href: '/browse',      label: 'Browse all films'    },
    { href: '/trending',    label: 'Trending now'        },
    { href: '/featured',    label: 'Editor\'s picks'     },
    { href: '/canon',       label: 'African film canon'  },
    { href: '/festivals',   label: 'Film festivals'      },
    { href: '/all-reviews', label: 'Community reviews'  },
  ],
  Filmmakers: [
    { href: '/creators',    label: 'Directors'           },
    { href: '/people',      label: 'Actors'              },
  ],
  Account: [
    { href: '/auth',        label: 'Sign in'             },
    { href: '/auth',        label: 'Create account'      },
  ],
}

const genres = ['Drama', 'Comedy', 'Action', 'Romance', 'Thriller', 'Documentary', 'Animation']

export function Footer() {
  return (
    <footer className="bg-cinema-dark border-t border-cinema-border mt-auto" role="contentinfo">
      <div className="section-container py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-film-cream hover:text-film-gold transition-colors mb-4">
              <Film className="w-5 h-5 text-film-gold" aria-hidden="true" />
              <span className="font-bold text-lg">
                Muvie<span className="text-film-gold">Stars</span>
              </span>
            </Link>
            <p className="text-sm text-film-muted leading-relaxed max-w-xs">
              Africa's cinema, documented. The most complete archive of African films,
              filmmakers, and reviews.
            </p>
          </div>

          {/* Link groups */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-film-muted mb-4">
                {group}
              </h3>
              <ul className="space-y-2.5" role="list">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-film-muted hover:text-film-cream transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Browse by genre */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-film-muted mb-4">
              Browse by genre
            </h3>
            <ul className="flex flex-wrap gap-2" role="list">
              {genres.map((g) => (
                <li key={g}>
                  <Link
                    href={`/browse?genre=${g.toLowerCase()}`}
                    className="genre-tag text-xs"
                  >
                    {g}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-cinema-border mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-film-subtle">
            &copy; {new Date().getFullYear()} MuvieStars. Preserving and celebrating African cinema.
          </p>
          <div className="flex items-center gap-4 text-xs text-film-subtle">
            <Link href="/privacy" className="hover:text-film-muted transition-colors">Privacy</Link>
            <Link href="/terms"   className="hover:text-film-muted transition-colors">Terms</Link>
            <a href="mailto:hello@muviestars.com" className="hover:text-film-muted transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
