'use client'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }

interface Props {
  context: 'watch_later' | 'reaction'
  onSkip: () => void
}

const COPY = {
  watch_later: 'Sign in to save this to your Watch Later list and build your cinema profile.',
  reaction:    'Sign in to save this reaction and build a permanent record of what you have watched.',
}

export function AuthPromptSheet({ context, onSkip }: Props) {
  return (
    <>
      <div
        onClick={onSkip}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(8,7,6,0.72)',
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: '50%', zIndex: 41,
          transform: 'translateX(-50%)',
          width: '100%', maxWidth: '480px',
          background: '#18150F',
          borderRadius: '28px 28px 0 0',
          padding: '20px 24px',
          paddingBottom: 'max(40px, env(safe-area-inset-bottom, 40px))',
          boxShadow: '0 -32px 80px rgba(0,0,0,0.85)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(237,228,210,0.18)' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,5vw,36px)', lineHeight: 1.1, color: '#F6EFE2', margin: 0 }}>
              Save your movie taste?
            </h3>
            <p style={{ margin: 0, fontSize: '15px', color: '#A39B8F', lineHeight: 1.6 }}>
              {COPY[context]}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
              href="/auth?mode=signup&next=/swipe"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '56px', borderRadius: '18px',
                background: '#C8963E', color: '#0B0A09',
                fontSize: '16px', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Create a free account
            </a>
            <a
              href="/auth?next=/swipe"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '56px', borderRadius: '18px',
                border: '1px solid rgba(237,228,210,0.18)',
                color: '#EDE4D2', fontSize: '16px',
                textDecoration: 'none',
              }}
            >
              Sign in
            </a>
            <button
              onClick={onSkip}
              style={{ background: 'none', border: 'none', color: '#8C857A', fontSize: '14px', cursor: 'pointer', padding: '8px 0' }}
            >
              Keep swiping without saving
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
