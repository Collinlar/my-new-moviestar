import { PALETTE, STAR_POINTS, STAR_TRANSFORM, laurelLines, wreathLeaves, type LaurelModel, type LaurelVariant } from '@/lib/laurel'

/**
 * The laurel drawn for image rendering (next/og). It reads the same layout as the SVG file, so the two match.
 * Leaves and star are shapes, so only the lines of text depend on a font.
 */
export function LaurelArt({ model, variant, size }: { model: LaurelModel; variant: LaurelVariant; size: number }) {
  const p = PALETTE[variant]
  const k = size / 1000
  return (
    <div style={{ display: 'flex', position: 'relative', width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} viewBox="0 0 1000 1000" style={{ position: 'absolute', top: 0, left: 0 }}>
        {wreathLeaves().map((l, i) => (
          <ellipse
            key={i}
            cx={l.x.toFixed(1)}
            cy={l.y.toFixed(1)}
            rx={62}
            ry={22}
            fill={p.leaf}
            fillOpacity={l.soft ? 0.5 : 1}
            transform={`rotate(${l.rot.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})`}
          />
        ))}
        <polygon points={STAR_POINTS} fill={p.leaf} transform={STAR_TRANSFORM} />
      </svg>
      {laurelLines(model).map((l) => (
        <div
          key={l.text + l.y}
          style={{
            position: 'absolute',
            left: 0,
            width: `${size}px`,
            top: `${(l.y - l.size * 0.82) * k}px`,
            display: 'flex',
            justifyContent: 'center',
            fontSize: `${l.size * k}px`,
            lineHeight: 1,
            letterSpacing: `${l.spacing * k}px`,
            fontWeight: l.weight,
            color: l.tone === 'ink' ? p.ink : p.muted,
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  )
}
