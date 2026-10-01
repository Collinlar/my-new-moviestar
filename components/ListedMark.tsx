import Link from 'next/link'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

const Check = ({ size = 10 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M2.5 6.4 5 8.9l4.5-5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** The subtle "Listed on MuvieStars" mark. Links to the plain-words explanation of what Listed means. */
export function ListedMark() {
  return (
    <Link
      href="/how-listing-works"
      title="What Listed on MuvieStars means"
      style={{
        height: '26px', padding: '0 12px', borderRadius: '999px',
        background: 'rgba(127,168,139,0.10)', border: '1px solid rgba(127,168,139,0.28)',
        ...MONO, fontSize: '11px', color: '#7FA88B',
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px',
      }}
    >
      <Check />
      Listed on MuvieStars
    </Link>
  )
}

/** A small corner mark for poster cards inside grids that are already links. */
export function ListedDot() {
  return (
    <span
      role="img"
      aria-label="Listed on MuvieStars"
      title="Listed on MuvieStars"
      style={{
        position: 'absolute', top: '7px', left: '7px',
        width: '22px', height: '22px', borderRadius: '50%',
        background: 'rgba(11,10,9,0.82)', color: '#7FA88B',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Check size={11} />
    </span>
  )
}
