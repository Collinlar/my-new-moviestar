/**
 * The film's poster as the right-hand side of a Club card. On a phone it becomes a band across the top, because most
 * people open the Club on a phone and a card with no picture on it looks unfinished. Plain markup, no state.
 */
export function ClubPoster({ src, alt, mobileHeight = 220 }: { src: string; alt: string; mobileHeight?: number }) {
  return (
    <div className="ms-club-poster" style={{ position: 'relative', height: '100%', background: '#0E1C22', ['--poster-h' as string]: `${mobileHeight}px` }}>
      <img
        src={src}
        alt={alt}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        fetchPriority="high"
        decoding="async"
      />
      <div className="ms-club-poster-fade" aria-hidden="true" />
    </div>
  )
}
