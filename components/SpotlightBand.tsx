import type { CSSProperties, ReactNode } from 'react'
import { objectPosition } from '@/lib/images'

const SERIF: CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: CSSProperties = { fontFamily: '"Geist Mono", monospace' }

export interface BandFilm {
  title: string
  year: number | null
  country: string | null
  genre: string | null
  posterUrl: string | null
  posterFocus: { x: number | null; y: number | null } | null
  posterColor: string | null
  bannerUrl: string | null
  bannerFocus: { x: number | null; y: number | null } | null
  bannerColor: string | null
}

/**
 * The Spotlight at the top of the homepage: one film the editors want you to watch now. The banner fills the band,
 * with a dark wash only where the words sit so they stay readable. A film with no banner gets its poster beside the
 * words on the poster's own colour. Plain markup: the button is passed in so the page can count taps and the admin
 * preview can leave them out. `compact` is for the admin preview, which has no header above it to clear.
 */
export function SpotlightBand({ film, headline, line, cta, compact = false }: { film: BandFilm; headline: string; line: string | null; cta: ReactNode; compact?: boolean }) {
  const hasBanner = !!film.bannerUrl
  const meta = [film.title, film.year, film.country, film.genre ? film.genre.charAt(0).toUpperCase() + film.genre.slice(1) : null].filter(Boolean).join(' · ')
  const ground = film.bannerColor || film.posterColor || '#12242B'
  return (
    <section
      aria-label={`Spotlight: ${film.title}`}
      className="ms-spot"
      style={{ position: 'relative', overflow: 'hidden', background: ground, minHeight: compact ? '320px' : '440px', display: 'flex', alignItems: 'flex-end' }}
    >
      {hasBanner && (
        <img
          src={film.bannerUrl!}
          alt=""
          width={1280}
          height={720}
          fetchPriority="high"
          decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: objectPosition(film.bannerFocus) }}
        />
      )}
      {/* A wash behind the words, not a decoration: it keeps the type readable over any picture. */}
      <div className="ms-spot-wash" aria-hidden="true" style={{ position: 'absolute', inset: 0 }} />

      <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20 w-full" style={{ position: 'relative', paddingTop: compact ? '40px' : '112px', paddingBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '40px' }}>
          <div style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
            <p style={{ ...MONO, margin: 0, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E' }}>
              Spotlight <span style={{ color: '#A39B8F' }}>&middot; Picked by our editors</span>
            </p>
            <h2 style={{ ...SERIF, margin: 0, fontSize: 'clamp(34px, 5.4vw, 60px)', lineHeight: 1.04, color: '#F6EFE2', fontWeight: 400, overflowWrap: 'anywhere' }}>{headline}</h2>
            {line && <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#DDD5C6', maxWidth: '520px' }}>{line}</p>}
            <p style={{ ...MONO, margin: 0, fontSize: '13px', color: '#B8B0A3' }}>{meta}</p>
            <div style={{ paddingTop: '4px' }}>{cta}</div>
          </div>

          {!hasBanner && film.posterUrl && (
            <img
              className="ms-spot-poster"
              src={film.posterUrl}
              alt={`${film.title} poster`}
              width={240}
              height={360}
              decoding="async"
              style={{ width: 'clamp(140px, 18vw, 240px)', aspectRatio: '2 / 3', objectFit: 'cover', objectPosition: objectPosition(film.posterFocus), borderRadius: '12px', flexShrink: 0, border: '1px solid rgba(237,228,210,0.14)' }}
            />
          )}
        </div>
      </div>
      <style>{`
        .ms-spot-wash { background: linear-gradient(to top, rgba(8,7,6,0.92) 0%, rgba(8,7,6,0.72) 45%, rgba(8,7,6,0.15) 100%); }
        @media (min-width: 900px) { .ms-spot-wash { background: linear-gradient(to right, rgba(8,7,6,0.9) 0%, rgba(8,7,6,0.62) 42%, rgba(8,7,6,0) 72%); } }
        @media (max-width: 640px) { .ms-spot-poster { display: none; } }
      `}</style>
    </section>
  )
}
