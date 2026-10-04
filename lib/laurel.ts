// The official MuvieStars laurel (Awards spec section 33): MUVIESTARS, the honour, the period, and a way to verify it.
// One layout feeds every output, so the SVG, the transparent PNG, the preview and the social card never drift apart.
// Pure module: no server imports, so pages and routes can both use it.

export type LaurelVariant = 'dark' | 'light'
export type LaurelFormat = 'svg' | 'png' | 'preview' | 'card'

export const LAUREL_VARIANTS: LaurelVariant[] = ['dark', 'light']
export const LAUREL_FORMATS: LaurelFormat[] = ['svg', 'png', 'preview', 'card']

/** Formats that are the real production files. Only award admins and the film's rights holder may download these. */
export const PRODUCTION_FORMATS: LaurelFormat[] = ['svg', 'png']

export const VARIANT_LABEL: Record<LaurelVariant, string> = {
  dark: 'For dark backgrounds',
  light: 'For light backgrounds',
}

export interface LaurelModel {
  code: string
  /** The honour, e.g. "Movie of the Month". */
  honour: string
  /** The period, e.g. "October 2026". */
  period: string
  /** Who or what won, used on the social card only. */
  subject: string
  /** The film a performance or direction award belongs to. */
  filmTitle: string | null
}

interface Palette { leaf: string; leafSoft: string; ink: string; muted: string; paper: string | null }
export const PALETTE: Record<LaurelVariant, Palette> = {
  dark:  { leaf: '#C8963E', leafSoft: '#C8963E', ink: '#F6EFE2', muted: '#B9AE9C', paper: '#0B0A09' },
  light: { leaf: '#9A6B16', leafSoft: '#9A6B16', ink: '#1A1612', muted: '#5C5347', paper: '#FBF6EA' },
}

export interface Leaf { x: number; y: number; rot: number; soft: boolean }

/** Two branches of leaves around a circle with the top left open, in a 1000 by 1000 box. */
export function wreathLeaves(): Leaf[] {
  const cx = 500, cy = 500, R = 350, count = 12
  const out: Leaf[] = []
  for (let i = 0; i < count; i++) {
    const left = (100 + (i * 150) / (count - 1)) * (Math.PI / 180)
    const right = Math.PI - left
    const soft = i % 2 === 1
    const r = R + (soft ? -32 : 32)
    const tilt = soft ? 24 : -24
    const deg = (a: number) => (a * 180) / Math.PI
    out.push({ x: cx + r * Math.cos(left), y: cy + r * Math.sin(left), rot: deg(left) + 90 + tilt, soft })
    out.push({ x: cx + r * Math.cos(right), y: cy + r * Math.sin(right), rot: deg(right) - 90 - tilt, soft })
  }
  return out
}

export const STAR_POINTS = '500,404 524,466 590,470 538,512 556,576 500,540 444,576 462,512 410,470 476,466'

/** One line if it fits, otherwise two lines split at the word boundary that balances them best. */
export function wrapLines(text: string, max = 11): string[] {
  const words = text.trim().split(/\s+/)
  const whole = words.join(' ')
  if (whole.length <= max || words.length < 2) return [whole]
  let best = [whole]
  let bestWidth = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const width = Math.max(a.length, b.length)
    if (width < bestWidth) { bestWidth = width; best = [a, b] }
  }
  return best
}

export interface LaurelLine { text: string; y: number; size: number; weight: number; spacing: number; tone: 'ink' | 'muted' }

/** Where each line of text sits inside the wreath, in the 1000 by 1000 box. */
export function laurelLines(m: LaurelModel): LaurelLine[] {
  const honour = wrapLines(m.honour.toUpperCase())
  const size = 60
  const gap = 68
  const lines: LaurelLine[] = [{ text: 'MUVIESTARS', y: 410, size: 30, weight: 600, spacing: 12, tone: 'muted' }]
  honour.forEach((t, i) => lines.push({ text: t, y: 520 + i * gap, size, weight: 700, spacing: 2, tone: 'ink' }))
  const afterHonour = 520 + (honour.length - 1) * gap + 74
  lines.push({ text: m.period.toUpperCase(), y: afterHonour, size: 30, weight: 600, spacing: 8, tone: 'muted' })
  lines.push({ text: m.code, y: afterHonour + 54, size: 19, weight: 500, spacing: 3, tone: 'muted' })
  return lines
}

/** The star above the wordmark: centred at (500, 290), about 100 high. */
export const STAR_TRANSFORM = 'translate(500 290) scale(0.58) translate(-500 -490)'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** The production laurel as a standalone SVG, transparent unless `background` is set. */
export function laurelSvg(m: LaurelModel, variant: LaurelVariant, background = false): string {
  const p = PALETTE[variant]
  const leaves = wreathLeaves()
    .map((l) => `<ellipse cx="${l.x.toFixed(1)}" cy="${l.y.toFixed(1)}" rx="62" ry="22" fill="${p.leaf}"${l.soft ? ' fill-opacity="0.5"' : ''} transform="rotate(${l.rot.toFixed(1)} ${l.x.toFixed(1)} ${l.y.toFixed(1)})"/>`)
    .join('')
  const text = laurelLines(m)
    .map((l) => `<text x="500" y="${l.y}" text-anchor="middle" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="${l.size}" font-weight="${l.weight}" letter-spacing="${l.spacing}" fill="${l.tone === 'ink' ? p.ink : p.muted}">${esc(l.text)}</text>`)
    .join('')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" role="img" aria-label="${esc(`MuvieStars ${m.honour}, ${m.period}. Verification ID ${m.code}`)}">`
    + `<title>${esc(`MuvieStars ${m.honour}, ${m.period}`)}</title>`
    + (background && p.paper ? `<rect width="1000" height="1000" fill="${p.paper}"/>` : '')
    + leaves
    + `<polygon points="${STAR_POINTS}" fill="${p.leaf}" transform="${STAR_TRANSFORM}"/>`
    + text
    + `</svg>\n`
}

export function laurelUrl(code: string, variant: LaurelVariant, format: LaurelFormat, download = false): string {
  return `/api/laurel/${code}?variant=${variant}&format=${format}${download ? '&download=1' : ''}`
}

export function parseVariant(v: string | null): LaurelVariant {
  return v === 'light' ? 'light' : 'dark'
}

export function parseFormat(v: string | null): LaurelFormat | null {
  return (LAUREL_FORMATS as string[]).includes(v ?? '') ? (v as LaurelFormat) : null
}
