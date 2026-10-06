import Link from 'next/link'
import { NavLink } from '@/components/NavLink'
import type { Movie } from '@/lib/queries'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface Props {
  id: string
  eyebrow: string
  title: string
  note?: string
  href?: string
  hrefLabel?: string
  films: Array<Pick<Movie, 'id' | 'title' | 'poster_url' | 'release_year' | 'country' | 'genre'> & { why_listed?: string | null }>
}

/** A short row of posters with a heading. Used for the curated sections on the homepage. */
export function FilmShelf({ id, eyebrow, title, note, href, hrefLabel, films }: Props) {
  return (
    <section
      className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20"
      style={{ paddingTop: '96px' }}
      aria-labelledby={`${id}-heading`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '620px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              {eyebrow}
            </p>
            <h2
              id={`${id}-heading`}
              style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(32px,4vw,48px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}
            >
              {title}
            </h2>
            {note && <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.55, color: '#A39B8F' }}>{note}</p>}
          </div>
          {href && (
            <NavLink href={href} style={{ fontSize: '15px', fontWeight: 500, color: '#C8963E', textDecoration: 'none', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
              {hrefLabel ?? 'See more'} →
            </NavLink>
          )}
        </div>

        <ul
          style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '20px' }}
          className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
        >
          {films.map((m) => (
            <li key={m.id}>
              <Link href={`/movie/${m.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ aspectRatio: '2/3', borderRadius: '12px', overflow: 'hidden', background: '#15120E' }}>
                  {m.poster_url && (
                    <img
                      src={m.poster_url}
                      alt={`${m.title} poster`}
                      width={240}
                      height={360}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 500, color: '#F6EFE2', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {m.title}
                  </p>
                  <p style={{ margin: '3px 0 0', ...MONO, fontSize: '12px', color: '#8C857A' }}>
                    {[m.release_year, m.country].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
