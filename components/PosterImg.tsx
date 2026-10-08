import type { CSSProperties, ImgHTMLAttributes } from 'react'
import { BARS_ZOOM, pickPoster, type PosterRole, type PosterSources } from '@/lib/poster'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'style'> & {
  film: PosterSources | null | undefined
  /** How big it is on screen: tiny up to about 100 px wide, card up to about 260 px, large above that. */
  role: PosterRole
  style?: CSSProperties
}

// What the card is, so the browser can choose between an upload's small and medium copies.
const SIZES: Record<PosterRole, string> = {
  tiny: '96px',
  card: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px',
  large: '(max-width: 640px) 90vw, 480px',
}

/**
 * A film's poster, at a size that suits the box it sits in. An uploaded poster brings its own small and medium copies. A
 * YouTube thumbnail is cut down from the 330 KB original to 8 to 100 KB, and if that size has black bars they are zoomed
 * away. The box around it must hide overflow (every poster box here does). Drop-in for an img: pass the same alt, style,
 * loading and so on.
 */
export function PosterImg({ film, role, style, alt = '', loading = 'lazy', decoding = 'async', ...rest }: Props) {
  const pick = pickPoster(film ?? {}, role)
  if (!pick) return null
  const img = (s?: CSSProperties) => (
    <img src={pick.src} srcSet={pick.srcSet} sizes={pick.srcSet ? SIZES[role] : undefined} alt={alt} loading={loading} decoding={decoding} style={s} {...rest} />
  )
  if (pick.zoom === 1) return img(style)

  // Bars to crop away: the picture is enlarged inside a box that keeps the size, shape and corners the caller asked for.
  const { width, height, borderRadius, display, flexShrink, ...inner } = style ?? {}
  return (
    <span style={{ display: display ?? 'block', width: width ?? '100%', height: height ?? '100%', borderRadius, overflow: 'hidden', flexShrink, lineHeight: 0 }}>
      {img({ ...inner, width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: `scale(${BARS_ZOOM})` })}
    </span>
  )
}
