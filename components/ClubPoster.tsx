import { objectPosition } from '@/lib/images'

/**
 * The film's poster as the right-hand side of a Club card. On a phone it becomes a band across the top, because most
 * people open the Club on a phone and a card with no picture on it looks unfinished. Plain markup, no state.
 */
export function ClubPoster({ src, alt, mobileHeight = 220, focus, color }: { src: string; alt: string; mobileHeight?: number; focus?: { x?: number | null; y?: number | null } | null; color?: string | null }) {
  // An uploaded poster carries a focal point the admin chose, so the band crops around the face instead of the top edge.
  const position = focus && (focus.x != null || focus.y != null) ? objectPosition(focus) : 'center top'
  return (
    <div className="ms-club-poster" style={{ position: 'relative', height: '100%', background: color || '#0E1C22', ['--poster-h' as string]: `${mobileHeight}px` }}>
      <img
        src={src}
        alt={alt}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: position }}
        fetchPriority="high"
        decoding="async"
      />
      <div className="ms-club-poster-fade" aria-hidden="true" />
    </div>
  )
}
