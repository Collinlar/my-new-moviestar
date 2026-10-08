import type { CSSProperties } from 'react'

const MONO: CSSProperties = { fontFamily: 'var(--font-geist-mono, ui-monospace, monospace)' }

/**
 * One line on a card that says where the film can be watched: "Free on YouTube", "On Netflix". A square of the
 * platform's own colour leads it, so the platform is recognised before the words are read. Plain markup, no state.
 */
export function WatchChip({ text, color, free }: { text: string; color: string | null; free: boolean }) {
  return (
    <span
      style={{
        alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px', height: '28px', padding: '0 12px 0 10px',
        borderRadius: '8px', background: 'rgba(11,10,9,0.72)', border: `1px solid ${free ? 'rgba(127,168,139,0.4)' : 'rgba(237,228,210,0.22)'}`,
        color: free ? '#9CC7A8' : '#EDE4D2', ...MONO, fontSize: '12px', fontWeight: 600, letterSpacing: '0.04em',
      }}
    >
      <span aria-hidden="true" style={{ width: '10px', height: '10px', borderRadius: '2px', background: color ?? '#C8963E', flexShrink: 0 }} />
      {text}
    </span>
  )
}
