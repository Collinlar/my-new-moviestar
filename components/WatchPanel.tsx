import type { CSSProperties } from 'react'
import type { WatchOption } from '@/lib/watch'

const MONO: CSSProperties = { fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)' }

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Where to watch, with what a viewer needs before they leave: what it costs, who put it there, how long it is, whether
 * it plays in Ghana. Each row is one place. Rows are separated by a hairline, not boxed, and the platform's colour is
 * a bar down the left edge. Plain markup, no state: the facts come from the last link check.
 */
export function WatchPanel({ options, title, sectionStyle }: { options: WatchOption[]; title: string; sectionStyle: CSSProperties }) {
  if (options.length === 0) return null
  return (
    <section id="where-to-watch" style={sectionStyle} aria-labelledby="watch-heading">
      <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20">
        <p id="watch-heading" style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 8px' }}>
          Where to watch
        </p>
        <p style={{ margin: '0 0 24px', fontSize: '15px', color: '#A39B8F', maxWidth: '560px', lineHeight: 1.6 }}>
          What each one costs, and what we know about it, before you leave.
        </p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '860px' }}>
          {options.map((o, i) => {
            const blocked = o.state === 'blocked'
            return (
              <li
                key={o.url + i}
                style={{
                  display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '14px', padding: '20px 0 20px 18px',
                  borderTop: i === 0 ? '1px solid rgba(237,228,210,0.1)' : undefined, borderBottom: '1px solid rgba(237,228,210,0.1)',
                  borderLeft: `3px solid ${blocked ? 'rgba(237,228,210,0.18)' : o.brand.color ?? '#C8963E'}`, opacity: blocked ? 0.85 : 1,
                }}
                className="ms-watch-row"
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 14px' }}>
                    <span style={{ fontSize: '19px', fontWeight: 600, color: '#F6EFE2' }}>{o.label}</span>
                    <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700, color: o.free ? '#7FA88B' : '#E0B25C' }}>
                      {o.access}
                    </span>
                  </div>
                  {o.facts.length > 0 && (
                    <p style={{ ...MONO, margin: '8px 0 0', fontSize: '14px', color: '#B8B0A3', lineHeight: 1.7 }}>{o.facts.join(' · ')}</p>
                  )}
                  {o.note && <p style={{ margin: '8px 0 0', fontSize: '14.5px', color: '#C7BFB2', lineHeight: 1.6 }}>{o.note}</p>}
                  {o.warning && <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#E0B25C', lineHeight: 1.6 }}>{o.warning}</p>}
                  {o.checkedAt && <p style={{ ...MONO, margin: '10px 0 0', fontSize: '11px', color: '#8C857A' }}>Checked {fmtDate(o.checkedAt)}</p>}
                </div>
                <div>
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${blocked ? 'Try anyway: ' : ''}Watch ${title} on ${o.label} (opens in a new tab)`}
                    style={{
                      minHeight: '48px', padding: '0 22px', borderRadius: '12px', textDecoration: 'none', fontSize: '15px', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center',
                      background: blocked ? 'transparent' : '#EDE4D2', color: blocked ? '#EDE4D2' : '#0B0A09',
                      border: blocked ? '1px solid rgba(237,228,210,0.25)' : '1px solid transparent',
                    }}
                  >
                    {blocked ? `Try ${o.label} anyway` : `Watch on ${o.label}`}
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
      <style>{`@media (min-width: 640px) { .ms-watch-row { grid-template-columns: minmax(0,1fr) auto !important; align-items: center; column-gap: 32px; } }`}</style>
    </section>
  )
}
