import { NavLink } from '@/components/NavLink'
import type { Nominee } from '@/lib/awards'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

/** The system's own suggestion note is housekeeping. Only an editor's words are shown to the public. */
const editorNote = (reason: string | null) => (reason && !reason.startsWith('Suggested by the system') ? reason : null)

/** A shortlist, in neutral alphabetical order so the order never hints at a ranking. */
export function NomineeRows({ nominees, linked = true }: { nominees: Nominee[]; linked?: boolean }) {
  const sorted = [...nominees].sort((a, b) => a.subject.title.localeCompare(b.subject.title))
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {sorted.map((n) => {
        const note = editorNote(n.reason)
        const inner = (
          <>
            <span style={{ width: '56px', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', background: '#15120E', display: 'block', flexShrink: 0 }}>
              {n.subject.posterUrl && /^https?:\/\//.test(n.subject.posterUrl) && (
                <img src={n.subject.posterUrl} alt="" width={56} height={84} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
              <span style={{ ...SERIF, fontSize: 'clamp(26px,3vw,34px)', lineHeight: 1.08, color: '#F6EFE2' }}>{n.subject.title}</span>
              {(n.subject.filmTitle || n.subject.year) && (
                <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                  {[n.subject.filmTitle ? `in ${n.subject.filmTitle}` : null, n.subject.year].filter(Boolean).join(' · ')}
                </span>
              )}
              {note && <span style={{ fontSize: '15px', lineHeight: 1.5, color: '#A39B8F', maxWidth: '560px' }}>{note}</span>}
            </span>
          </>
        )
        return (
          <li key={n.id} style={{ borderTop: '1px solid rgba(237,228,210,0.1)' }}>
            {linked ? (
              <NavLink href={n.subject.href} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 0', textDecoration: 'none', minHeight: '44px' }}>{inner}</NavLink>
            ) : (
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px 0' }}>{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
