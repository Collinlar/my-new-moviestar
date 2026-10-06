import { NavLink } from '@/components/NavLink'
import type { RecognitionItem } from '@/lib/awards'
import type { WinItem } from '@/lib/awards-results'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const STAGE_WORDS: Record<string, string> = {
  shortlist_published: 'Shortlisted',
  voting_open: 'Shortlisted, voting open',
  voting_closed: 'Shortlisted, voting closed',
  jury_review: 'Shortlisted, with the judges',
  results_locked: 'Shortlisted, results being confirmed',
  published: 'Shortlisted',
  archived: 'Shortlisted',
}

/**
 * MuvieStars Recognition: the film's place in MuvieStars' own honours, kept apart from festival and industry
 * awards (Awards spec section 31). Every line links to the official page for that honour.
 */
export function RecognitionSection({ items, wins = [], selections = [], heading = 'MuvieStars Recognition', sectionStyle }: {
  items: RecognitionItem[]
  wins?: WinItem[]
  selections?: Array<{ slug: string; label: string; period?: string | null; periodLabel?: string | null }>
  heading?: string
  sectionStyle?: React.CSSProperties
}) {
  if (items.length === 0 && selections.length === 0 && wins.length === 0) return null
  // A film that won is not also listed as merely shortlisted for the same honour.
  const wonTitles = new Set(wins.map((w) => `${w.title}`))
  return (
    <section style={sectionStyle} aria-labelledby="recognition-heading">
      <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
        <p id="recognition-heading" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 6px' }}>{heading}</p>
        <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6E675E' }}>MuvieStars&rsquo; own honours. Festival and industry awards are listed separately.</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '760px' }}>
          {wins.map((w) => (
            <li key={w.code} style={{ borderTop: '1px solid rgba(200,150,62,0.4)' }}>
              <NavLink href={w.href} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '14px 0', textDecoration: 'none', minHeight: '44px', justifyContent: 'center' }}>
                <span style={{ ...SERIF, fontSize: '26px', lineHeight: 1.15, color: '#F6EFE2' }}>
                  {w.who ? `${w.who}: ` : ''}{w.title}
                </span>
                <span style={{ ...MONO, fontSize: '12px', color: '#C8963E' }}>
                  {w.status === 'under_review' ? 'Winner, under review' : 'Winner'} · Verification ID {w.code}
                </span>
              </NavLink>
            </li>
          ))}
          {selections.map((s) => (
            <li key={`sel-${s.slug}`} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
              <NavLink href={`/selections/${s.slug}`} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '14px 0', textDecoration: 'none', minHeight: '44px', justifyContent: 'center' }}>
                <span style={{ ...SERIF, fontSize: '24px', lineHeight: 1.15, color: '#F6EFE2' }}>{s.label}</span>
                {s.periodLabel && <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>{s.periodLabel}</span>}
              </NavLink>
            </li>
          ))}
          {items.filter((r) => !wonTitles.has(`${r.categoryName}, ${r.cycleName}`)).map((r, i) => (
            <li key={`${r.href}-${i}`} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
              <NavLink href={r.href} style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '14px 0', textDecoration: 'none', minHeight: '44px', justifyContent: 'center' }}>
                <span style={{ ...SERIF, fontSize: '24px', lineHeight: 1.15, color: '#F6EFE2' }}>
                  {r.who ? `${r.who}: ` : ''}{r.categoryName}
                </span>
                <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>{STAGE_WORDS[r.stage] ?? 'Shortlisted'} · {r.cycleName}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
