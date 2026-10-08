'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { SpotlightBand, type BandFilm } from '@/components/SpotlightBand'
import {
  AUDIENCES, CTAS, LIMITS, ctaLabel, describeLog, formatGhana, fromLocalInput, overlapping, parseSpotlight, pickLive, relativeTo,
  stateOf, toLocalInput, type Audience, type CtaKind, type SpotlightRow, type SpotlightState,
} from '@/lib/spotlight'

export type AdminFilm = BandFilm & { id: string; listed: boolean }
export interface SpotlightItem { row: SpotlightRow; film: AdminFilm | null; views: number; taps: number; views7: number; taps7: number }
export interface LogItem { id: number; action: string; headline: string | null; changes: Record<string, { from: unknown; to: unknown }> | null; actor: string | null; at: string }

interface Props { items: SpotlightItem[]; log: LogItem[]; adminId: string; ready: boolean; now: number }

const ic = 'cinema-input text-sm py-2 w-full'
const FILM_BASE = 'id, title, release_year, country, genre, poster_url, listing_status'
const FILM_IMAGES = ', poster_focus_x, poster_focus_y, poster_color, banner_url, banner_focus_x, banner_focus_y, banner_color'

const STATE_STYLE: Record<SpotlightState, { label: string; color: string; bg: string }> = {
  live: { label: 'Live', color: '#7FA88B', bg: 'rgba(127,168,139,0.14)' },
  scheduled: { label: 'Scheduled', color: '#8FA8C8', bg: 'rgba(143,168,200,0.14)' },
  draft: { label: 'Draft', color: '#C8963E', bg: 'rgba(200,150,62,0.14)' },
  ended: { label: 'Ended', color: '#A39B8F', bg: 'rgba(163,155,143,0.12)' },
}

const toFilm = (m: any): AdminFilm => ({
  id: m.id, title: m.title, year: m.release_year ?? null, country: m.country ?? null, genre: m.genre ?? null, listed: m.listing_status === 'approved',
  posterUrl: m.poster_url ?? null, posterFocus: { x: m.poster_focus_x ?? null, y: m.poster_focus_y ?? null }, posterColor: m.poster_color ?? null,
  bannerUrl: m.banner_url ?? null, bannerFocus: { x: m.banner_focus_x ?? null, y: m.banner_focus_y ?? null }, bannerColor: m.banner_color ?? null,
})

interface Draft {
  id: string | null
  status: 'draft' | 'published'
  film: AdminFilm | null
  headline: string
  line: string
  cta_kind: CtaKind
  audience: Audience
  starts: string   // datetime-local, read as Ghana time
  ends: string
  precedence: boolean
}

const nowLocal = (now: number) => toLocalInput(new Date(Math.ceil(now / 60000) * 60000).toISOString())
const addDays = (local: string, days: number) => (local ? toLocalInput(new Date(Date.parse(fromLocalInput(local)) + days * 86_400_000).toISOString()) : '')

export function SpotlightManager({ items, log, adminId, ready, now }: Props) {
  const router = useRouter()
  const supabase = createClient() as any
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminFilm[]>([])
  const [searching, setSearching] = useState(false)
  const [showEnded, setShowEnded] = useState(false)

  const rows = useMemo(() => items.map((i) => i.row), [items])
  const byState = (s: SpotlightState) => items.filter((i) => stateOf(i.row, now) === s)
  const liveNow = { out: pickLive(rows, false, now), in: pickLive(rows, true, now) }
  const filmOf = (id: string | undefined) => items.find((i) => i.row.id === id)?.film ?? null

  if (!ready) {
    return (
      <div className="cinema-card p-6 text-sm text-film-muted max-w-2xl">
        The Spotlight is not set up on this database yet. Run <code className="text-film-gold">20261001000014_spotlight.sql</code> in the Supabase SQL editor, then reload this page.
      </div>
    )
  }

  const blank = (): Draft => {
    const starts = nowLocal(now)
    return { id: null, status: 'draft', film: null, headline: '', line: '', cta_kind: 'film', audience: 'everyone', starts, ends: addDays(starts, 7), precedence: false }
  }
  const edit = (i: SpotlightItem): Draft => ({
    id: i.row.id, status: i.row.status, film: i.film, headline: i.row.headline, line: i.row.line ?? '', cta_kind: i.row.cta_kind, audience: i.row.audience,
    starts: toLocalInput(i.row.starts_at), ends: toLocalInput(i.row.ends_at), precedence: i.row.priority > 0,
  })
  const patch = (p: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...p } : d))

  async function search() {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const like = `%${q.replace(/[%_,()]/g, ' ')}%`
    // Only listed films can be a Spotlight. The picture columns come from the poster upload migration, so fall back without them.
    let { data, error: e } = await supabase.from('movies').select(FILM_BASE + FILM_IMAGES).eq('listing_status', 'approved').ilike('title', like).limit(8)
    if (e) ({ data, error: e } = await supabase.from('movies').select(FILM_BASE).eq('listing_status', 'approved').ilike('title', like).limit(8))
    setSearching(false)
    if (e) { setError('We could not search just now. Tap Find films again.'); return }
    setError(null)
    setResults((data ?? []).map(toFilm))
  }

  function candidate(d: Draft) {
    return parseSpotlight({
      movie_id: d.film?.id, headline: d.headline, line: d.line, cta_kind: d.cta_kind, audience: d.audience,
      starts_at: fromLocalInput(d.starts), ends_at: fromLocalInput(d.ends), priority: d.precedence ? 1 : 0,
    })
  }

  async function save(publish: boolean) {
    if (!draft) return
    const parsed = candidate(draft)
    if ('error' in parsed) { setError(parsed.error); return }
    setBusy('save'); setError(null)
    const value = parsed.value
    let id = draft.id
    if (id) {
      const { error: e } = await supabase.from('spotlights').update(value).eq('id', id)
      if (e) { setBusy(null); setError(friendly(e)); return }
    } else {
      const { data, error: e } = await supabase.from('spotlights').insert({ ...value, created_by: adminId, status: 'draft' }).select('id').single()
      if (e || !data) { setBusy(null); setError(friendly(e)); return }
      id = data.id
    }
    if (publish && draft.status !== 'published') {
      const { error: e } = await supabase.from('spotlights').update({ status: 'published' }).eq('id', id)
      if (e) { setBusy(null); setError(`It was saved as a draft, but could not be published. ${friendly(e)}`); router.refresh(); return }
    }
    setBusy(null)
    toast.success(publish ? 'Published.' : draft.id ? 'Saved.' : 'Saved as a draft.')
    setDraft(null)
    router.refresh()
  }

  async function setStatus(i: SpotlightItem, status: 'draft' | 'published') {
    setBusy(i.row.id)
    const { error: e } = await supabase.from('spotlights').update({ status }).eq('id', i.row.id)
    setBusy(null)
    if (e) { toast.error(friendly(e)); return }
    toast.success(status === 'published' ? 'Published.' : 'Taken back to draft. It is no longer shown.')
    router.refresh()
  }

  async function remove(i: SpotlightItem) {
    if (!confirm(`Delete "${i.row.headline}"? Its counts go with it. The change log keeps a record.`)) return
    setBusy(i.row.id)
    const { error: e } = await supabase.from('spotlights').delete().eq('id', i.row.id)
    setBusy(null)
    if (e) { toast.error(friendly(e)); return }
    toast.success('Deleted.')
    router.refresh()
  }

  const preview = draft?.film && draft.headline.trim()
    ? <SpotlightBand film={draft.film} headline={draft.headline.trim()} line={draft.line.trim() || null} compact cta={<span style={{ minHeight: '52px', padding: '0 28px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>{ctaLabel(draft.cta_kind)}</span>} />
    : null

  const parsedNow = draft ? candidate(draft) : null
  const clashes = draft && parsedNow && 'value' in parsedNow
    ? overlapping({ id: draft.id ?? '', audience: draft.audience, starts_at: parsedNow.value.starts_at, ends_at: parsedNow.value.ends_at }, rows)
    : []
  const alreadyOver = draft && parsedNow && 'value' in parsedNow && Date.parse(parsedNow.value.ends_at) <= now

  const live = byState('live'), scheduled = byState('scheduled'), drafts = byState('draft'), ended = byState('ended')

  return (
    <div className="space-y-8">
      {/* What visitors see right now */}
      <section className="cinema-card p-5" aria-labelledby="sp-now">
        <h2 id="sp-now" className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-3">On the homepage right now</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {([['Visitors who are not signed in', liveNow.out], ['Signed-in members', liveNow.in]] as const).map(([who, r]) => (
            <div key={who}>
              <p className="text-film-muted text-xs mb-1">{who}</p>
              {r ? <p className="text-film-cream"><span className="text-film-gold">{r.headline}</span> <span className="text-film-muted">({filmOf(r.id)?.title ?? 'film'}, {relativeTo(r, now).toLowerCase()})</span></p>
                : <p className="text-film-muted">Nothing. The homepage shows no Spotlight.</p>}
            </div>
          ))}
        </div>
      </section>

      {!draft && <button className="btn-gold py-2 text-sm" onClick={() => { setDraft(blank()); setError(null); setQuery(''); setResults([]) }}>New Spotlight</button>}

      {/* The editor */}
      {draft && (
        <section className="cinema-card p-5 space-y-5" aria-labelledby="sp-edit">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sp-edit" className="text-xs font-semibold text-film-muted uppercase tracking-widest">{draft.id ? 'Edit this Spotlight' : 'New Spotlight'}</h2>
            <button className="btn-ghost py-1.5 text-sm" onClick={() => { setDraft(null); setError(null) }}>Not now</button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">Film</label>
            {draft.film ? (
              <div className="flex items-center gap-3">
                <p className="text-film-cream text-sm">{draft.film.title}{draft.film.year ? <span className="text-film-muted"> ({draft.film.year})</span> : null}</p>
                {!draft.film.listed && <span className="text-xs text-red-400">Not listed, so it cannot be published</span>}
                <button className="btn-ghost py-1 text-sm" onClick={() => patch({ film: null })}>Change film</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 max-w-md">
                  <input className={ic} placeholder="Which film?" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search() }} aria-label="Search listed films" />
                  <button className="btn-outline py-2 text-sm whitespace-nowrap" onClick={search} disabled={searching}>{searching ? 'Looking...' : 'Find films'}</button>
                </div>
                <p className="text-xs text-film-muted">Only listed films can be a Spotlight.</p>
                {results.length > 0 && (
                  <ul className="max-w-md divide-y divide-cinema-border rounded-lg border border-cinema-border">
                    {results.map((f) => (
                      <li key={f.id}>
                        <button className="w-full text-left px-3 py-2 text-sm text-film-cream hover:bg-cinema-surface min-h-[44px]" onClick={() => { patch({ film: f }); setResults([]) }}>
                          {f.title} <span className="text-film-muted">{f.year ?? ''}{f.bannerUrl ? ' · has a banner' : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {query.trim().length >= 2 && !searching && results.length === 0 && <p className="text-xs text-film-muted">No listed film matches that.</p>}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5" htmlFor="sp-headline">Headline</label>
              <input id="sp-headline" className={ic} maxLength={LIMITS.headline + 20} value={draft.headline} onChange={(e) => patch({ headline: e.target.value })} placeholder="Say why it is worth tonight" />
              <p className={`text-xs mt-1 ${draft.headline.trim().length > LIMITS.headline ? 'text-red-400' : 'text-film-muted'}`}>{draft.headline.trim().length} of {LIMITS.headline}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5" htmlFor="sp-line">One line under it (optional)</label>
              <input id="sp-line" className={ic} maxLength={LIMITS.line + 20} value={draft.line} onChange={(e) => patch({ line: e.target.value })} placeholder="A Lagos thriller that earned its ending" />
              <p className={`text-xs mt-1 ${draft.line.trim().length > LIMITS.line ? 'text-red-400' : 'text-film-muted'}`}>{draft.line.trim().length} of {LIMITS.line}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <fieldset>
              <legend className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">The button goes to</legend>
              <div className="space-y-1">
                {CTAS.map((c) => (
                  <label key={c.value} className="flex items-start gap-2 text-sm cursor-pointer min-h-[32px]">
                    <input type="radio" name="sp-cta" className="accent-film-gold mt-1" checked={draft.cta_kind === c.value} onChange={() => patch({ cta_kind: c.value })} />
                    <span><span className="text-film-cream">{c.label}</span> <span className="text-film-muted">{c.help}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5" htmlFor="sp-audience">Who sees it</label>
              <select id="sp-audience" className={ic} value={draft.audience} onChange={(e) => patch({ audience: e.target.value as Audience })}>
                {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              <p className="text-xs text-film-muted mt-1">{AUDIENCES.find((a) => a.value === draft.audience)?.help}</p>
            </div>
          </div>

          <div>
            <p className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">When (Ghana time)</p>
            <div className="grid gap-3 sm:grid-cols-2 max-w-xl">
              <div>
                <label className="block text-xs text-film-muted mb-1" htmlFor="sp-start">Starts</label>
                <input id="sp-start" type="datetime-local" className={ic} value={draft.starts} onChange={(e) => patch({ starts: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-film-muted mb-1" htmlFor="sp-end">Ends</label>
                <input id="sp-end" type="datetime-local" className={ic} value={draft.ends} onChange={(e) => patch({ ends: e.target.value })} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button className="btn-outline py-1.5 text-sm" onClick={() => { const s = nowLocal(now); patch({ starts: s, ends: draft.ends && Date.parse(fromLocalInput(draft.ends)) > Date.parse(fromLocalInput(s)) ? draft.ends : addDays(s, 7) }) }}>Start now</button>
              {[1, 3, 7, 14].map((d) => <button key={d} className="btn-outline py-1.5 text-sm" onClick={() => patch({ ends: addDays(draft.starts || nowLocal(now), d) })}>Run for {d} {d === 1 ? 'day' : 'days'}</button>)}
            </div>
            <p className="text-xs text-film-muted mt-1">At most {LIMITS.maxDays} days. Ghana time is the same as GMT all year.</p>
          </div>

          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="accent-film-gold mt-1" checked={draft.precedence} onChange={(e) => patch({ precedence: e.target.checked })} />
            <span><span className="text-film-cream">Takes precedence</span> <span className="text-film-muted">Only one Spotlight shows at a time. If two run together, this one wins. Otherwise the one that started later wins.</span></span>
          </label>

          {/* Warnings that matter before it goes out */}
          <div className="space-y-1 text-sm" aria-live="polite">
            {draft.film && !draft.film.bannerUrl && (
              <p className="text-film-amber">This film has no banner, so the band uses its poster. <Link className="underline" href={`/admin/movies/${draft.film.id}/edit#poster-studio`} target="_blank">Upload a banner</Link> for a better band.</p>
            )}
            {clashes.length > 0 && (
              <p className="text-film-amber">Overlaps with {clashes.map((c) => `"${c.headline}"`).join(', ')} for some of the same people. Only one is shown at a time: {draft.precedence ? 'this one wins because it takes precedence.' : 'the one with precedence, then the later start.'}</p>
            )}
            {alreadyOver && <p className="text-film-amber">That end time has already passed, so this would never be shown.</p>}
            {error && <p role="alert" className="text-red-400">{error}</p>}
          </div>

          <div>
            <p className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Preview</p>
            {preview ?? <div className="rounded-lg border border-dashed border-cinema-border p-6 text-sm text-film-muted">Pick a film and write a headline to see the band. It is shown at your screen width. Make the window narrow to see the phone layout.</div>}
          </div>

          <div className="flex flex-wrap gap-2">
            {draft.status === 'published' ? (
              <button className="btn-gold py-2 text-sm disabled:opacity-40" disabled={busy === 'save'} onClick={() => save(false)}>{busy === 'save' ? 'Saving...' : 'Save changes'}</button>
            ) : (
              <>
                <button className="btn-gold py-2 text-sm disabled:opacity-40" disabled={busy === 'save' || !draft.film?.listed} onClick={() => save(true)}>{busy === 'save' ? 'Saving...' : 'Save and publish'}</button>
                <button className="btn-outline py-2 text-sm disabled:opacity-40" disabled={busy === 'save'} onClick={() => save(false)}>Save as a draft</button>
              </>
            )}
          </div>
        </section>
      )}

      {/* The lists */}
      <List title="Live now" items={live} />
      <List title="Scheduled" items={scheduled} />
      <List title="Drafts" items={drafts} />
      <section aria-labelledby="sp-ended">
        <div className="flex items-baseline gap-3 mb-2">
          <h2 id="sp-ended" className="text-xs font-semibold text-film-muted uppercase tracking-widest">Ended ({ended.length})</h2>
          {ended.length > 0 && <button className="btn-ghost py-1 text-sm" onClick={() => setShowEnded((v) => !v)}>{showEnded ? 'Hide' : 'Show'}</button>}
        </div>
        {showEnded && <Rows items={ended} />}
      </section>

      {/* Change log */}
      <section aria-labelledby="sp-log">
        <h2 id="sp-log" className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-2">Change log</h2>
        {log.length === 0 ? <p className="text-sm text-film-muted">Nothing has been changed yet.</p> : (
          <ul className="cinema-card divide-y divide-cinema-border">
            {log.map((l) => (
              <li key={l.id} className="p-3 text-sm flex flex-wrap justify-between gap-2">
                <span className="text-film-cream">{describeLog(l)}</span>
                <span className="text-xs text-film-muted">{formatGhana(l.at, now)} · {l.actor === adminId ? 'you' : l.actor ? 'another admin' : 'someone'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )

  function List({ title, items: list }: { title: string; items: SpotlightItem[] }) {
    return (
      <section aria-label={title}>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-2">{title} ({list.length})</h2>
        {list.length === 0 ? <p className="text-sm text-film-muted">None.</p> : <Rows items={list} />}
      </section>
    )
  }

  function Rows({ items: list }: { items: SpotlightItem[] }) {
    return (
      <div className="cinema-card divide-y divide-cinema-border">
        {list.map((i) => {
          const st = stateOf(i.row, now), s = STATE_STYLE[st]
          const ctr = i.views >= 20 ? ` (${Math.round((i.taps / i.views) * 1000) / 10}%)` : ''
          return (
            <div key={i.row.id} className="p-4 flex flex-wrap items-start gap-4">
              <div style={{ width: 48, height: 72, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: i.film?.posterColor ?? '#15120E' }}>
                {i.film?.posterUrl && <img src={i.film.posterUrl} alt="" width={48} height={72} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div className="min-w-0 flex-1 basis-64">
                <p className="text-film-cream font-medium break-words">{i.row.headline}</p>
                <p className="text-xs text-film-muted mt-0.5">{i.film?.title ?? 'Film removed'}{i.film && !i.film.listed ? ' (no longer listed, so visitors do not see this)' : ''} · {AUDIENCES.find((a) => a.value === i.row.audience)?.label}{i.row.priority > 0 ? ' · takes precedence' : ''}</p>
                <p className="text-xs text-film-muted mt-0.5">{formatGhana(i.row.starts_at, now)} to {formatGhana(i.row.ends_at, now)} · {relativeTo(i.row, now)}</p>
                {(st === 'live' || st === 'ended') && (
                  <p className="text-xs text-film-muted mt-0.5">{i.taps} taps from {i.views} views{ctr}{i.views7 || i.taps7 ? ` · last 7 days: ${i.taps7} taps from ${i.views7} views` : ''}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded uppercase" style={{ color: s.color, background: s.bg }}>{s.label}</span>
                <button className="btn-outline py-1.5 text-sm" onClick={() => { setDraft(edit(i)); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button>
                {i.row.status === 'draft'
                  ? <button className="btn-gold py-1.5 text-sm disabled:opacity-40" disabled={busy === i.row.id || !i.film?.listed} onClick={() => setStatus(i, 'published')}>Publish</button>
                  : st !== 'ended' && <button className="btn-outline py-1.5 text-sm disabled:opacity-40" disabled={busy === i.row.id} onClick={() => setStatus(i, 'draft')}>Take back to draft</button>}
                <button className="btn-ghost py-1.5 text-sm text-red-400" disabled={busy === i.row.id} onClick={() => remove(i)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
}

/** The database's own sentence when it wrote one (a film that is not listed, say), otherwise a plain fallback. */
function friendly(e: any): string {
  if (e?.code === '23514' && e.message) return e.message
  if (e?.code === '42501') return 'Only admins can change the Spotlight.'
  return 'That did not save. Check your connection and try again.'
}
