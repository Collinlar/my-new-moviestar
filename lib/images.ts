import type { Parsed } from '@/lib/parsed'

// Posters and banners: the rules shared by the admin screen and the server that makes the copies. Pure, so it can be
// tested without an image library.

export type ImageKind = 'poster' | 'banner'

export interface VariantSpec { key: 'sm' | 'md' | 'lg'; w: number; h: number }

export const SPECS: Record<ImageKind, { label: string; aspect: number; minW: number; minH: number; variants: VariantSpec[]; primary: VariantSpec['key'] }> = {
  poster: {
    label: 'Poster',
    aspect: 2 / 3,
    minW: 480, minH: 720,
    variants: [{ key: 'sm', w: 240, h: 360 }, { key: 'md', w: 480, h: 720 }, { key: 'lg', w: 960, h: 1440 }],
    primary: 'md',
  },
  banner: {
    label: 'Banner',
    aspect: 16 / 9,
    minW: 960, minH: 540,
    variants: [{ key: 'sm', w: 640, h: 360 }, { key: 'md', w: 1280, h: 720 }, { key: 'lg', w: 1920, h: 1080 }],
    primary: 'md',
  },
}

export const QUALITY = { min: 55, max: 95, default: 80 }
export const MAX_ORIGINAL_BYTES = 15 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const clamp01 = (n: number): number => Math.min(1, Math.max(0, n))
export const clampQuality = (q: unknown): number => {
  const n = Math.round(Number(q))
  return Number.isFinite(n) ? Math.min(QUALITY.max, Math.max(QUALITY.min, n)) : QUALITY.default
}

/** A crop as fractions of the original picture. */
export interface Crop { x: number; y: number; w: number; h: number }
export interface Focus { x: number; y: number }
export interface Rect { left: number; top: number; width: number; height: number }

export function parseCrop(raw: any): Parsed<Crop> {
  const c = { x: Number(raw?.x), y: Number(raw?.y), w: Number(raw?.w), h: Number(raw?.h) }
  if (![c.x, c.y, c.w, c.h].every(Number.isFinite)) return { ok: false, error: 'The crop is missing. Move the frame over the picture and try again.' }
  if (c.w <= 0 || c.h <= 0 || c.w > 1.0001 || c.h > 1.0001 || c.x < -0.0001 || c.y < -0.0001 || c.x + c.w > 1.0005 || c.y + c.h > 1.0005) {
    return { ok: false, error: 'The crop frame is outside the picture. Move it back over the picture and try again.' }
  }
  return { ok: true, value: { x: clamp01(c.x), y: clamp01(c.y), w: Math.min(1, c.w), h: Math.min(1, c.h) } }
}

export function parseFocus(raw: any): Focus {
  const x = Number(raw?.x), y = Number(raw?.y)
  return { x: Number.isFinite(x) ? clamp01(x) : 0.5, y: Number.isFinite(y) ? clamp01(y) : 0.5 }
}

/**
 * The crop in whole pixels, forced to the exact shape for this kind. The frame the admin drew is trusted for where it
 * is and roughly how big it is, and the shape is corrected here so a rounding slip can never save a 2:3 poster that
 * is 2.02:3.
 */
export function fitCrop(srcW: number, srcH: number, crop: Crop, aspect: number): Rect {
  let width = Math.max(1, Math.round(crop.w * srcW))
  let height = Math.round(width / aspect)
  if (height > srcH) { height = srcH; width = Math.round(height * aspect) }
  if (width > srcW) { width = srcW; height = Math.round(width / aspect) }
  const cx = (crop.x + crop.w / 2) * srcW
  const cy = (crop.y + crop.h / 2) * srcH
  const left = Math.min(srcW - width, Math.max(0, Math.round(cx - width / 2)))
  const top = Math.min(srcH - height, Math.max(0, Math.round(cy - height / 2)))
  return { left, top, width, height }
}

/** Null when the crop is big enough to make a sharp picture, otherwise a message that says what to do. */
export function checkMinimum(kind: ImageKind, rect: Rect): string | null {
  const s = SPECS[kind]
  if (rect.width >= s.minW && rect.height >= s.minH) return null
  return `That crop is ${rect.width} by ${rect.height} pixels. A ${s.label.toLowerCase()} needs at least ${s.minW} by ${s.minH}. Use a bigger picture, or zoom the frame out.`
}

/** Which copies to make. Never larger than the crop, so nothing is blown up and softened. */
export function variantPlan(kind: ImageKind, rect: Rect): VariantSpec[] {
  return SPECS[kind].variants.filter((v) => v.w <= rect.width && v.h <= rect.height)
}

/** The folder is the film, the name carries a fingerprint, so a new upload never overwrites a copy that is cached. */
export const copyPath = (movieId: string, kind: ImageKind, fingerprint: string, key: string) => `${movieId}/${kind}-${fingerprint}-${key}.webp`
export const originalPath = (movieId: string, kind: ImageKind, stamp: number, ext: string) => `${movieId}/original-${kind}-${stamp}.${ext}`

export const isOwnOriginal = (movieId: string, kind: ImageKind, path: unknown): path is string =>
  typeof path === 'string' && !path.includes('..') && new RegExp(`^${movieId}/original-${kind}-\\d+\\.(jpg|jpeg|png|webp)$`).test(path)

export const objectPosition = (focus?: { x?: number | null; y?: number | null } | null): string =>
  `${Math.round(clamp01(focus?.x ?? 0.5) * 100)}% ${Math.round(clamp01(focus?.y ?? 0.5) * 100)}%`

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export type ImageRequest =
  | { action: 'save'; movieId: string; kind: ImageKind; originalPath: string; crop: Crop; focus: Focus; quality: number }
  | { action: 'remove'; movieId: string; kind: ImageKind }

export function parseImageRequest(body: any): Parsed<ImageRequest> {
  const movieId = body?.movie_id
  if (typeof movieId !== 'string' || !UUID.test(movieId)) return { ok: false, error: 'That film id is not valid.' }
  const kind = body?.kind
  if (kind !== 'poster' && kind !== 'banner') return { ok: false, error: 'Say whether this is a poster or a banner.' }
  if (body?.action === 'remove') return { ok: true, value: { action: 'remove', movieId, kind } }
  if (!isOwnOriginal(movieId, kind, body?.original_path)) return { ok: false, error: 'That file is not one of this film’s uploads. Choose the picture again.' }
  const crop = parseCrop(body?.crop)
  if ('error' in crop) return { ok: false, error: crop.error }
  return { ok: true, value: { action: 'save', movieId, kind, originalPath: body.original_path, crop: crop.value, focus: parseFocus(body?.focus), quality: clampQuality(body?.quality) } }
}
