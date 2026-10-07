import 'server-only'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { SPECS, checkMinimum, fitCrop, variantPlan, type Crop, type ImageKind, type Rect, type VariantSpec } from '@/lib/images'

export interface MadeCopy { key: VariantSpec['key']; w: number; h: number; buf: Buffer }
export interface Processed {
  copies: MadeCopy[]
  blur: string           // a tiny blurred WebP as a data URL, shown while the real picture loads
  color: string          // the picture's average colour, as #rrggbb
  rect: Rect             // the crop that was used, in pixels of the original
  source: { width: number; height: number }
  fingerprint: string
}

export class ImageProblem extends Error {}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0')

/**
 * Turns an original upload into the sized copies the site uses. The picture is turned upright, cropped to the exact
 * shape, resized down to each size (never up), and saved as WebP at the quality the admin chose. Camera and location
 * data is dropped, because sharp writes none of it back.
 */
export async function processImage(original: Buffer, kind: ImageKind, crop: Crop, quality: number): Promise<Processed> {
  let upright: Buffer
  let width = 0, height = 0
  try {
    const out = await sharp(original, { failOn: 'none', limitInputPixels: 100_000_000 }).rotate().toBuffer({ resolveWithObject: true })
    upright = out.data; width = out.info.width; height = out.info.height
  } catch (e) {
    console.error('[images] could not read an uploaded picture:', e)
    throw new ImageProblem('That file could not be read as a picture. Use a JPG, PNG or WebP.')
  }

  const rect = fitCrop(width, height, crop, SPECS[kind].aspect)
  const tooSmall = checkMinimum(kind, rect)
  if (tooSmall) throw new ImageProblem(tooSmall)

  const cropped = () => sharp(upright).extract({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })

  const copies: MadeCopy[] = []
  for (const v of variantPlan(kind, rect)) {
    const buf = await cropped().resize(v.w, v.h, { fit: 'cover' }).webp({ quality, effort: 4, smartSubsample: true }).toBuffer()
    copies.push({ key: v.key, w: v.w, h: v.h, buf })
  }

  const blurW = 16
  const blurH = Math.max(1, Math.round(blurW / SPECS[kind].aspect))
  const tiny = await cropped().resize(blurW, blurH, { fit: 'cover' }).webp({ quality: 40 }).toBuffer()
  const blur = `data:image/webp;base64,${tiny.toString('base64')}`

  const px = await cropped().resize(1, 1, { fit: 'cover' }).removeAlpha().raw().toBuffer()
  const color = `#${hex(px[0])}${hex(px[1])}${hex(px[2])}`

  const md = copies.find((c) => c.key === 'md') ?? copies[0]
  const fingerprint = createHash('sha1').update(md.buf).digest('hex').slice(0, 10)

  return { copies, blur, color, rect, source: { width, height }, fingerprint }
}
