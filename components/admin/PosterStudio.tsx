'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  ACCEPTED_TYPES, MAX_ORIGINAL_BYTES, QUALITY, SPECS, formatBytes, objectPosition, originalPath,
  type Crop, type Focus, type ImageKind,
} from '@/lib/images'

export interface StudioImage {
  url: string | null
  uploaded: boolean
  color: string | null
  focusX: number | null
  focusY: number | null
  /** Set once something has been uploaded: the original, so the crop can be adjusted without uploading again. */
  originalPath: string | null
  originalUrl: string | null
  crop: Crop | null
  quality: number | null
  bytes: Record<string, number> | null
  sourceWidth: number | null
  sourceHeight: number | null
}

interface Props { movieId: string; title: string; poster: StudioImage; banner: StudioImage }

const BTN = 'btn-outline py-2 text-sm'
const GOLD = 'btn-gold py-2 text-sm disabled:opacity-40'
const ZOOM_MAX = 4
const DISPLAY_W = 420

function Editor({ movieId, kind, image }: { movieId: string; kind: ImageKind; image: StudioImage }) {
  const router = useRouter()
  const spec = SPECS[kind]
  const fileInput = useRef<HTMLInputElement>(null)
  const imgEl = useRef<HTMLImageElement>(null)

  // Where the picture comes from: a file just chosen, or the original saved earlier.
  const [file, setFile] = useState<File | null>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [center, setCenter] = useState({ x: 0.5, y: 0.5 })
  const [focus, setFocus] = useState<Focus>({ x: image.focusX ?? 0.5, y: image.focusY ?? 0.5 })
  const [quality, setQuality] = useState(image.quality ?? QUALITY.default)
  const [busy, setBusy] = useState<null | 'save' | 'remove'>(null)
  const [error, setError] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop | null>(null)
  const [estimate, setEstimate] = useState<number | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null)

  const editing = !!src
  const cropPx = crop && natural ? { w: Math.round(crop.w * natural.w), h: Math.round(crop.h * natural.h) } : null
  const tooSmall = !!cropPx && (cropPx.w < spec.minW - 1 || cropPx.h < spec.minH - 1)

  // The frame: the biggest rectangle of the right shape that fits the picture, made smaller by zoom.
  const frame = useMemo(() => {
    if (!natural) return null
    const imgAspect = natural.w / natural.h
    const baseW = imgAspect > spec.aspect ? (spec.aspect * natural.h) / natural.w : 1
    const baseH = imgAspect > spec.aspect ? 1 : natural.w / (spec.aspect * natural.h)
    const w = baseW / zoom, h = baseH / zoom
    const x = Math.min(1 - w, Math.max(0, center.x - w / 2))
    const y = Math.min(1 - h, Math.max(0, center.y - h / 2))
    return { x, y, w, h } as Crop
  }, [natural, zoom, center, spec.aspect])

  useEffect(() => { setCrop(frame) }, [frame])

  const [pendingSaved, setPendingSaved] = useState<Crop | null>(null)
  const startFrom = (url: string, f: File | null, saved: Crop | null) => {
    setFile(f); setSrc(url); setNatural(null); setError(null); setZoom(1); setCenter({ x: 0.5, y: 0.5 })
    setPendingSaved(saved)
  }

  // When the picture has loaded, restore a saved crop if there is one.
  const onLoaded = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const el = e.currentTarget
    const n = { w: el.naturalWidth, h: el.naturalHeight }
    setNatural(n)
    if (pendingSaved) {
      const baseW = n.w / n.h > spec.aspect ? (spec.aspect * n.h) / n.w : 1
      setZoom(Math.min(ZOOM_MAX, Math.max(1, baseW / pendingSaved.w)))
      setCenter({ x: pendingSaved.x + pendingSaved.w / 2, y: pendingSaved.y + pendingSaved.h / 2 })
      setPendingSaved(null)
    }
  }

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) { setError('Use a JPG, PNG or WebP picture.'); return }
    if (f.size > MAX_ORIGINAL_BYTES) { setError(`That file is ${formatBytes(f.size)}. The most we can take is ${formatBytes(MAX_ORIGINAL_BYTES)}.`); return }
    startFrom(URL.createObjectURL(f), f, null)
  }

  // ---- what the cropped picture looks like, and how big it will be ----
  useEffect(() => {
    if (!crop || !natural || !imgEl.current) return
    const t = setTimeout(() => {
      try {
        const img = imgEl.current!
        const sx = crop.x * natural.w, sy = crop.y * natural.h, sw = crop.w * natural.w, sh = crop.h * natural.h
        const tw = kind === 'poster' ? 480 : 960
        const th = Math.round(tw / spec.aspect)
        const c = document.createElement('canvas')
        c.width = tw; c.height = th
        c.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th)
        setPreview(c.toDataURL('image/webp', 0.7))
        c.toBlob((b) => setEstimate(b ? b.size : null), 'image/webp', quality / 100)
      } catch {
        setPreview(null); setEstimate(null)   // a picture from another site cannot be read back
      }
    }, 200)
    return () => clearTimeout(t)
  }, [crop, natural, quality, kind, spec.aspect])

  // ---- moving the frame ----
  const surface = useRef<HTMLDivElement>(null)
  const down = (e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* works without it */ }
    drag.current = { x: e.clientX, y: e.clientY, cx: center.x, cy: center.y }
  }
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !surface.current) return
    const r = surface.current.getBoundingClientRect()
    setCenter({ x: drag.current.cx + (e.clientX - drag.current.x) / r.width, y: drag.current.cy + (e.clientY - drag.current.y) / r.height })
  }
  const up = () => { drag.current = null }
  const key = (e: React.KeyboardEvent) => {
    const step = 0.02
    if (e.key === 'ArrowLeft') { e.preventDefault(); setCenter((c) => ({ ...c, x: c.x - step })) }
    if (e.key === 'ArrowRight') { e.preventDefault(); setCenter((c) => ({ ...c, x: c.x + step })) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCenter((c) => ({ ...c, y: c.y - step })) }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCenter((c) => ({ ...c, y: c.y + step })) }
    if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(ZOOM_MAX, z + 0.1))
    if (e.key === '-') setZoom((z) => Math.max(1, z - 0.1))
  }

  // ---- saving ----
  const save = useCallback(async () => {
    if (!crop || !src) return
    setBusy('save'); setError(null)
    try {
      const supabase = createClient() as any
      let path = image.originalPath
      if (file) {
        const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        path = originalPath(movieId, kind, Date.now(), ext)
        const up = await supabase.storage.from('posters').upload(path, file, { contentType: file.type, upsert: false })
        if (up.error) { setError('The picture could not be sent. Check your connection and try again.'); return }
      }
      if (!path) { setError('Choose the picture again.'); return }
      const res = await fetch('/api/admin/posters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movie_id: movieId, kind, original_path: path, crop, focus, quality }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? 'That did not save. Try again.'); return }
      const b = json.bytes ?? {}
      toast.success(`${spec.label} saved. ${Object.entries(b).map(([k, v]) => `${k === 'sm' ? 'Card' : k === 'md' ? 'Page' : 'Large'} ${formatBytes(v as number)}`).join(', ')}.`)
      setSrc(null); setFile(null); setNatural(null)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }, [crop, src, file, image.originalPath, movieId, kind, focus, quality, spec.label, router])

  async function remove() {
    if (!confirm(`Remove the uploaded ${spec.label.toLowerCase()}? ${kind === 'poster' ? 'The link it replaced comes back.' : 'The film will have no banner.'}`)) return
    setBusy('remove'); setError(null)
    try {
      const res = await fetch('/api/admin/posters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movie_id: movieId, kind, action: 'remove' }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setError(json.error ?? 'That did not save. Try again.'); return }
      toast.success(`${spec.label} removed.`)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const fromYouTube = !!image.url && /img\.youtube\.com\/vi\//.test(image.url)
  const shown = preview ?? image.url
  const fx = objectPosition(focus)
  const focusSurface = useRef<HTMLDivElement>(null)
  const setFocusFrom = (e: React.PointerEvent) => {
    if (!focusSurface.current) return
    const r = focusSurface.current.getBoundingClientRect()
    setFocus({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) })
  }

  return (
    <div className="space-y-5">
      {/* What is there now */}
      {!editing && (
        <div className="flex flex-wrap gap-6 items-start">
          <div style={{ width: kind === 'poster' ? 140 : 280, aspectRatio: String(spec.aspect), background: image.color ?? '#15120E', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
            {image.url
              ? <img src={image.url} alt={`Current ${spec.label.toLowerCase()}`} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: objectPosition({ x: image.focusX, y: image.focusY }) }} />
              : <span className="absolute inset-0 flex items-center justify-center text-xs text-film-muted p-3 text-center">No {spec.label.toLowerCase()} yet</span>}
          </div>
          <div className="space-y-2 text-sm max-w-md">
            {image.uploaded ? (
              <>
                <p className="text-film-cream">Uploaded {spec.label.toLowerCase()}.{image.sourceWidth ? ` Original ${image.sourceWidth} by ${image.sourceHeight}.` : ''}</p>
                {image.bytes && <p className="text-film-muted">{Object.entries(image.bytes).map(([k, v]) => `${k === 'sm' ? 'Card' : k === 'md' ? 'Page' : 'Large'} ${formatBytes(v)}`).join(' · ')}</p>}
              </>
            ) : kind === 'poster' ? (
              <p className="text-film-muted">{image.url ? (fromYouTube ? 'This is a YouTube thumbnail. It is wide and low resolution, so it is cropped on every card. Upload a real portrait poster.' : 'This is a pasted link, not an upload.') : 'Nothing set.'}</p>
            ) : (
              <p className="text-film-muted">A banner is the wide picture for promotions and the top of the Club page. Without one, the poster is cropped to fit.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className={GOLD} onClick={() => fileInput.current?.click()}>{image.uploaded ? `Upload a new ${spec.label.toLowerCase()}` : `Upload a ${spec.label.toLowerCase()}`}</button>
              {image.uploaded && image.originalUrl && (
                <button type="button" className={BTN} onClick={() => startFrom(image.originalUrl!, null, image.crop)}>Adjust the crop</button>
              )}
              {image.uploaded && <button type="button" className="btn-ghost py-2 text-sm text-red-400" disabled={!!busy} onClick={remove}>{busy === 'remove' ? 'Removing...' : 'Remove the upload'}</button>}
            </div>
          </div>
        </div>
      )}

      <input ref={fileInput} type="file" accept={ACCEPTED_TYPES.join(',')} className="hidden" onChange={choose} aria-label={`Choose a ${spec.label.toLowerCase()} picture`} />

      {/* The editor */}
      {editing && (
        <div className="grid grid-cols-1 xl:grid-cols-[auto_minmax(0,1fr)] gap-8">
          <div className="space-y-3" style={{ width: DISPLAY_W, maxWidth: '100%' }}>
            <p className="text-xs text-film-muted">Drag the frame over the part you want. Zoom to make the frame smaller. Arrow keys, plus and minus work too.</p>
            <div
              ref={surface}
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ position: 'relative', width: '100%', touchAction: 'none', userSelect: 'none', background: '#0B0A09', borderRadius: 10, overflow: 'hidden' }}
            >
              <img ref={imgEl} src={src!} alt="" crossOrigin={file ? undefined : 'anonymous'} onLoad={onLoaded} draggable={false} style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} />
              {frame && (
                <div
                  tabIndex={0}
                  role="slider"
                  aria-label={`${spec.label} crop frame`}
                  aria-valuetext={`Zoom ${zoom.toFixed(1)}`}
                  onKeyDown={key}
                  style={{
                    position: 'absolute', left: `${frame.x * 100}%`, top: `${frame.y * 100}%`, width: `${frame.w * 100}%`, height: `${frame.h * 100}%`,
                    boxShadow: '0 0 0 9999px rgba(8,7,6,0.62)', border: '2px solid #C8963E', cursor: 'move', outline: 'none',
                  }}
                />
              )}
            </div>
            <label className="flex items-center gap-3 text-sm text-film-muted">
              Zoom
              <input type="range" min={1} max={ZOOM_MAX} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-film-gold" aria-label="Zoom the crop frame" />
              <span style={{ width: 36 }}>{zoom.toFixed(1)}x</span>
            </label>
            {natural && cropPx && <p className={tooSmall ? 'text-xs text-red-400' : 'text-xs text-film-muted'} role={tooSmall ? 'alert' : undefined}>Original {natural.w} by {natural.h}. The crop is {cropPx.w} by {cropPx.h}; a {spec.label.toLowerCase()} needs at least {spec.minW} by {spec.minH}.{tooSmall ? ' Zoom the frame out, or use a bigger picture.' : ''}</p>}
          </div>

          <div className="space-y-5 min-w-0">
            <div>
              <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5" htmlFor={`q-${kind}`}>Quality</label>
              <div className="flex items-center gap-3">
                <input id={`q-${kind}`} type="range" min={QUALITY.min} max={QUALITY.max} step={1} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1 max-w-xs accent-film-gold" />
                <span className="text-sm text-film-cream" style={{ width: 28 }}>{quality}</span>
                <span className="text-sm text-film-muted">{estimate ? `Page copy about ${formatBytes(estimate)}` : ''}</span>
              </div>
              <p className="text-xs text-film-muted mt-1">Lower is lighter and loads faster on a slow phone. 80 suits most pictures. Go higher for fine detail, lower for a flat, dark one.</p>
            </div>

            <div>
              <p className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">Focal point</p>
              <p className="text-xs text-film-muted mb-2">Click what must stay in view when the picture is cropped to a wider shape, such as a face.</p>
              <div
                ref={focusSurface}
                onPointerDown={setFocusFrom}
                style={{ position: 'relative', width: kind === 'poster' ? 150 : 270, aspectRatio: String(spec.aspect), borderRadius: 8, overflow: 'hidden', cursor: 'crosshair', background: '#15120E', touchAction: 'none' }}
              >
                {preview && <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />}
                <span aria-hidden="true" style={{ position: 'absolute', left: `${focus.x * 100}%`, top: `${focus.y * 100}%`, width: 18, height: 18, marginLeft: -9, marginTop: -9, borderRadius: '50%', border: '2px solid #C8963E', background: 'rgba(8,7,6,0.45)', pointerEvents: 'none' }} />
              </div>
            </div>

            <div>
              <p className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">How it will look</p>
              <div className="flex flex-wrap gap-5 items-end">
                {kind === 'poster' ? (
                  <>
                    <Preview label="Swipe card" w={120} ratio={0.72} src={shown} pos={fx} />
                    <Preview label="Shelf" w={80} ratio={2 / 3} src={shown} pos={fx} />
                    <Preview label="Club band on a phone" w={170} ratio={335 / 260} src={shown} pos={fx} />
                  </>
                ) : (
                  <>
                    <Preview label="Wide band" w={260} ratio={16 / 9} src={shown} pos={fx} />
                    <Preview label="On a phone" w={150} ratio={4 / 3} src={shown} pos={fx} />
                  </>
                )}
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className={GOLD} disabled={!!busy || !crop || !natural || tooSmall} onClick={save}>
                {busy === 'save' ? `Resizing and saving the ${spec.label.toLowerCase()}...` : `Save the ${spec.label.toLowerCase()}`}
              </button>
              <button type="button" className={BTN} disabled={!!busy} onClick={() => { setSrc(null); setFile(null); setNatural(null); setError(null) }}>Not now</button>
              <button type="button" className="btn-ghost py-2 text-sm" disabled={!!busy} onClick={() => fileInput.current?.click()}>Choose a different picture</button>
            </div>
          </div>
        </div>
      )}
      {!editing && error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  )
}

function Preview({ label, w, ratio, src, pos }: { label: string; w: number; ratio: number; src: string | null; pos: string }) {
  return (
    <figure className="m-0">
      <div style={{ width: w, aspectRatio: String(ratio), borderRadius: 8, overflow: 'hidden', background: '#15120E', border: '1px solid rgba(237,228,210,0.12)' }}>
        {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos }} />}
      </div>
      <figcaption className="text-xs text-film-muted mt-1" style={{ maxWidth: w }}>{label}</figcaption>
    </figure>
  )
}

/** Poster and banner for one film. Uploads are saved at once and do not wait for the rest of the form. */
export function PosterStudio({ movieId, title, poster, banner }: Props) {
  const [tab, setTab] = useState<ImageKind>('poster')
  return (
    <section id="poster-studio" className="cinema-card p-6 mb-8" aria-labelledby="studio-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h2 id="studio-heading" className="text-xs font-semibold text-film-muted uppercase tracking-widest">Poster and banner for {title}</h2>
        <div role="tablist" aria-label="Which picture" className="flex gap-2">
          {(['poster', 'banner'] as ImageKind[]).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)} className={tab === k ? 'btn-gold py-1.5 text-sm' : 'btn-outline py-1.5 text-sm'}>
              {SPECS[k].label}{(k === 'poster' ? poster : banner).uploaded ? ' (uploaded)' : ''}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-film-muted max-w-2xl mb-5">
        {tab === 'poster'
          ? 'The tall picture on cards, Swipe and the film page. It is saved in three sizes, so a phone on a slow connection gets the small one.'
          : 'The wide picture for promotions and the top of the Club page. Optional.'}
      </p>
      <Editor key={tab} movieId={movieId} kind={tab} image={tab === 'poster' ? poster : banner} />
    </section>
  )
}
