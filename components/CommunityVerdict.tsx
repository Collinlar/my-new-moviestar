import type { MovieVerdict } from '@/lib/queries'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const REACTION_DISPLAY = [
  { key: 'loved',      emoji: '❤️', label: 'Loved it'   },
  { key: 'liked',      emoji: '👍', label: 'Liked'      },
  { key: 'okay',       emoji: '😐', label: 'Okay'       },
  { key: 'not_for_me', emoji: '👎', label: 'Not for me' },
] as const

const CONFIDENCE_LABEL: Record<MovieVerdict['confidence'], string> = {
  forming:   'First reactions in',
  building:  'Building signal',
  confident: 'High confidence',
}

interface Props {
  verdict: MovieVerdict
  movieTitle: string
}

export function CommunityVerdict({ verdict, movieTitle }: Props) {
  const { total, enjoyed_pct, reaction_breakdown, top_tags, confidence } = verdict

  // Split tags: top half "especially loved", bottom half "mixed" (rough heuristic)
  const lovedTags   = top_tags.slice(0, Math.ceil(top_tags.length / 2))
  const mixedTags   = top_tags.slice(Math.ceil(top_tags.length / 2))

  if (confidence === 'forming') {
    return (
      <section
        style={{
          padding: '48px 0', borderTop: '1px solid rgba(237,228,210,0.1)',
          background: '#0F0D0B',
        }}
        aria-labelledby="verdict-heading"
      >
        <div className="section-container">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '540px' }}>
            <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
              Community Verdict
            </p>
            <p style={{ margin: 0, fontSize: '18px', color: '#A39B8F', lineHeight: 1.55 }}>
              {total === 0
                ? 'No reactions yet. Be the first to weigh in.'
                : `${total} reaction${total === 1 ? '' : 's'} in so far. The picture is still forming.`}
            </p>
            <a
              href="#community-reviews"
              style={{
                display: 'inline-flex', alignItems: 'center',
                height: '44px', padding: '0 20px', borderRadius: '12px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '15px', fontWeight: 600, textDecoration: 'none',
                width: 'fit-content',
              }}
            >
              React to {movieTitle}
            </a>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      style={{
        padding: '56px 0', borderTop: '1px solid rgba(237,228,210,0.1)',
        background: '#0F0D0B',
      }}
      aria-labelledby="verdict-heading"
    >
      <div className="section-container">
        <div
          style={{
            background: '#15120E', borderRadius: '24px',
            padding: '40px',
            display: 'flex', flexDirection: 'column', gap: '32px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <p
              id="verdict-heading"
              style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}
            >
              Community Verdict
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: confidence === 'confident' ? '#7CC49A' : '#C8963E',
              }} />
              <span style={{ ...MONO, fontSize: '11px', letterSpacing: '0.08em', color: '#8C857A' }}>
                {CONFIDENCE_LABEL[confidence]} · {total.toLocaleString()} {total === 1 ? 'reaction' : 'reactions'}
              </span>
            </div>
          </div>

          {/* Big enjoyed stat */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}
            className="grid-cols-1 sm:grid-cols-3"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ ...SERIF, fontSize: 'clamp(52px,7vw,80px)', lineHeight: '0.95', color: '#C8963E' }}>
                {confidence === 'building' ? `${enjoyed_pct}%` : `${enjoyed_pct}%`}
              </div>
              <div style={{ fontSize: '15px', color: '#A39B8F' }}>enjoyed it</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ ...SERIF, fontSize: 'clamp(52px,7vw,80px)', lineHeight: '0.95', color: '#F6EFE2' }}>
                {Math.round(((reaction_breakdown.loved) / total) * 100)}%
              </div>
              <div style={{ fontSize: '15px', color: '#A39B8F' }}>loved it ❤️</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ ...SERIF, fontSize: 'clamp(52px,7vw,80px)', lineHeight: '0.95', color: '#F6EFE2' }}>
                {Math.round(((reaction_breakdown.not_for_me) / total) * 100)}%
              </div>
              <div style={{ fontSize: '15px', color: '#A39B8F' }}>not for them</div>
            </div>
          </div>

          {/* Reaction bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Visual bar */}
            <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '8px' }}>
              {REACTION_DISPLAY.map(({ key }) => {
                const count = reaction_breakdown[key as keyof typeof reaction_breakdown]
                const pct = (count / total) * 100
                if (pct === 0) return null
                const colors: Record<string, string> = {
                  loved: '#C8963E', liked: '#7FA88B', okay: '#8FA8C8', not_for_me: '#6A5A4A'
                }
                return (
                  <div
                    key={key}
                    style={{ width: `${pct}%`, background: colors[key], transition: 'width 0.3s' }}
                    title={`${key}: ${Math.round(pct)}%`}
                  />
                )
              })}
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {REACTION_DISPLAY.map(({ key, emoji, label }) => {
                const count = reaction_breakdown[key as keyof typeof reaction_breakdown]
                const pct = Math.round((count / total) * 100)
                if (pct === 0) return null
                return (
                  <span key={key} style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>
                    {emoji} {label} {pct}%
                  </span>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          {top_tags.length > 0 && (
            <div
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px',
                paddingTop: '24px', borderTop: '1px solid rgba(237,228,210,0.08)',
              }}
              className="grid-cols-1 sm:grid-cols-2"
            >
              {lovedTags.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#A39B8F' }}>
                    {confidence === 'building' ? 'Early viewers praised' : 'Viewers especially loved'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {lovedTags.map(({ slug, label }) => (
                      <span
                        key={slug}
                        style={{
                          height: '32px', padding: '0 14px', borderRadius: '999px',
                          background: 'rgba(200,150,62,0.12)', color: '#F2D6A2',
                          fontSize: '14px', display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mixedTags.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: '#A39B8F' }}>Mixed reactions around</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {mixedTags.map(({ slug, label }) => (
                      <span
                        key={slug}
                        style={{
                          height: '32px', padding: '0 14px', borderRadius: '999px',
                          border: '1px solid rgba(237,228,210,0.14)', color: '#D8CFC0',
                          fontSize: '14px', display: 'inline-flex', alignItems: 'center',
                        }}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
