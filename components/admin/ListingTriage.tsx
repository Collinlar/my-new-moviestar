'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES, INDUSTRIES } from '@/lib/utils'
import {
  HARD_CHECKS, SOFT_CHECKS, QUEUE_COLUMNS, QUEUE_TABS, REJECTION_REASONS, REJECTION_LABELS,
  SORT_OPTIONS, STATUS_LABELS, missingHard, suggestCountry, youtubeId,
  type DecisionStatus, type ListingStatus, type QueueRow, type QueueTabKey, type SortKey,
} from '@/lib/listing'

interface Props {
  rows: QueueRow[]
  counts: Record<ListingStatus, number>
  total: number
  tab: QueueTabKey
  page: number
  pageSize: number
  filters: { q: string; industry: string; ready: boolean; missingCountry: boolean; sort: SortKey }
  adminId: string
  transitionMinPool: number
}

interface DecidePayload {
  ids: string[]
  status: DecisionStatus
  reason?: string
  note?: string
  why_listed?: string
  confirmed?: boolean
}

interface Detail {
  description: string | null
  synopsis: string | null
  youtube_url: string | null
  why_listed: string | null
  listing_notes: string | null
  history: Array<{ id: string; reviewer_id: string | null; from_status: string | null; to_status: string; reason: string | null; note: string | null; created_at: string }>
}

const PILL: Record<ListingStatus, string> = {
  draft:             'bg-cinema-surface text-film-muted',
  submitted:         'bg-blue-400/10 text-blue-300',
  under_review:      'bg-blue-400/10 text-blue-300',
  needs_information: 'bg-film-gold/10 text-film-gold',
  approved:          'bg-emerald-400/10 text-emerald-300',
  rejected:          'bg-red-400/10 text-red-300',
  archived:          'bg-cinema-surface text-film-subtle',
  delisted:          'bg-red-400/10 text-red-300',
}

const isTyping = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

function Dots({ row }: { row: QueueRow }) {
  return (
    <span className="flex gap-0.5 shrink-0" aria-label={`${row.completeness} of 8 checks pass`}>
      {[...HARD_CHECKS, ...SOFT_CHECKS].map(c => {
        const pass = row[c.key]
        const hard = HARD_CHECKS.some(h => h.key === c.key)
        return (
          <span
            key={c.key}
            title={`${c.label}: ${pass ? 'yes' : 'no'}`}
            className={`w-1.5 h-4 rounded-sm ${pass ? 'bg-emerald-400/70' : hard ? 'bg-red-400/80' : 'bg-film-gold/70'}`}
          />
        )
      })}
    </span>
  )
}

/* ─── Detail panel ─────────────────────────────────────────────────────────────────────────── */

interface PanelProps {
  row: QueueRow
  adminId: string
  busy: boolean
  onDecide: (p: DecidePayload) => Promise<boolean>
  onRowUpdated: (r: QueueRow) => void
  onMove: (dir: -1 | 1) => void
}

// Lives at module level so its inputs keep focus while typing. The parent keys it by film id,
// so all of its state resets when you move to another film.
function DetailPanel({ row, adminId, busy, onDecide, onRowUpdated, onMove }: PanelProps) {
  const supabase = useMemo(() => createClient() as any, [])
  const [detail, setDetail] = useState<Detail | null>(null)
  const [title, setTitle]   = useState(row.title)
  const [year, setYear]     = useState(row.release_year ? String(row.release_year) : '')
  const [country, setCountry] = useState(row.country ?? '')
  const [savingFields, setSavingFields] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [playing, setPlaying]     = useState(false)
  const [why, setWhy]         = useState('')
  const [mode, setMode]       = useState<null | 'needs' | 'reject' | 'delist'>(null)
  const [note, setNote]       = useState('')
  const [reason, setReason]   = useState('')
  const noteRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [{ data: m }, { data: h }] = await Promise.all([
        supabase.from('movies').select('description, synopsis, youtube_url, why_listed, listing_notes').eq('id', row.id).single(),
        supabase.from('movie_listing_reviews')
          .select('id, reviewer_id, from_status, to_status, reason, note, created_at')
          .eq('movie_id', row.id).order('created_at', { ascending: false }).limit(8),
      ])
      if (cancelled) return
      setDetail({ ...(m ?? {}), history: h ?? [] })
      if (m?.why_listed) setWhy(m.why_listed)
    })()
    return () => { cancelled = true }
  }, [row.id, supabase])

  const videoId = useMemo(() => youtubeId(detail?.youtube_url), [detail?.youtube_url])

  const suggestion = useMemo(
    () => (row.country || !detail ? null : suggestCountry({ title: row.title, description: detail.description, synopsis: detail.synopsis })),
    [row.country, row.title, detail],
  )

  const dirty = title.trim() !== row.title || year !== (row.release_year ? String(row.release_year) : '') || country.trim() !== (row.country ?? '')
  const canApprove = row.hard_ready && confirmed && !dirty && !busy
  const isListed = row.listing_status === 'approved'

  const saveFields = async () => {
    setSavingFields(true)
    const body: Record<string, unknown> = { action: 'update_fields', id: row.id }
    if (title.trim() !== row.title) body.title = title
    if (year !== (row.release_year ? String(row.release_year) : '')) body.release_year = year
    if (country.trim() !== (row.country ?? '')) body.country = country
    try {
      const res = await fetch('/api/admin/listing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'That did not save. Try again.'); return }
      const { data: fresh } = await supabase.from('movie_listing_queue_scored').select(QUEUE_COLUMNS).eq('id', row.id).single()
      if (fresh) onRowUpdated(fresh as QueueRow)
      toast.success('Film details saved')
    } catch {
      toast.error('That did not go through. Check your connection and try again.')
    } finally {
      setSavingFields(false)
    }
  }

  const approve = () => onDecide({ ids: [row.id], status: 'approved', confirmed: true, why_listed: why.trim() || undefined })
  const archive = () => onDecide({ ids: [row.id], status: 'archived' })

  const submitMode = async () => {
    if (mode === 'needs') await onDecide({ ids: [row.id], status: 'needs_information', note })
    if (mode === 'reject') await onDecide({ ids: [row.id], status: 'rejected', reason, note: note || undefined })
    if (mode === 'delist') await onDecide({ ids: [row.id], status: 'delisted', note })
  }

  // Keyboard: a approve, n needs info, r reject, x archive, j/k or arrows to move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'j' || k === 'arrowdown') { e.preventDefault(); onMove(1) }
      else if (k === 'k' || k === 'arrowup') { e.preventDefault(); onMove(-1) }
      else if (k === 'a' && !isListed) {
        e.preventDefault()
        if (canApprove) approve()
        else if (!row.hard_ready) toast.error(`Cannot list yet. Missing: ${missingHard(row).join(', ')}.`)
        else if (dirty) toast.error('Save your changes to the film details first.')
        else toast.error('Tick the confirmation first (shortcut: C), then list.')
      }
      else if (k === 'c' && !isListed) { e.preventDefault(); setConfirmed(v => !v) }
      else if (k === 'v') { e.preventDefault(); setPlaying(v => !v) }
      else if (k === 'n') { e.preventDefault(); setMode('needs'); setTimeout(() => noteRef.current?.focus(), 0) }
      else if (k === 'r') { e.preventDefault(); setMode('reject') }
      else if (k === 'x') { e.preventDefault(); archive() }
      else if (k === 'escape') setMode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, canApprove, dirty, isListed, confirmed, why, busy])

  const reviewerLabel = (id: string | null) => (id === null ? 'System' : id === adminId ? 'You' : 'Another admin')
  const desc = detail?.synopsis || detail?.description || ''
  const ic = 'cinema-input text-sm py-2'

  return (
    <div className="cinema-card p-5 space-y-5">
      <div className="flex gap-4">
        {row.poster_url ? (
          <img src={row.poster_url} alt="" width={96} height={144} className="w-24 h-36 object-cover rounded-lg bg-cinema-surface shrink-0" />
        ) : (
          <div className="w-24 h-36 rounded-lg bg-cinema-surface shrink-0" />
        )}
        <div className="min-w-0 space-y-2">
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${PILL[row.listing_status]}`}>
            {STATUS_LABELS[row.listing_status]}
          </span>
          <h2 className="text-lg font-semibold text-film-cream leading-snug break-words">{row.title}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {videoId && (
              <button type="button" onClick={() => setPlaying(v => !v)} className="text-film-gold hover:underline" aria-pressed={playing}>
                {playing ? 'Hide preview' : 'Preview video'} <span className="text-film-subtle">(V)</span>
              </button>
            )}
            {detail?.youtube_url && (
              <a href={detail.youtube_url} target="_blank" rel="noopener noreferrer" className="text-film-muted hover:text-film-cream inline-flex items-center gap-1">
                Open on YouTube <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            )}
            <Link href={`/movie/${row.id}`} target="_blank" className="text-film-muted hover:text-film-cream inline-flex items-center gap-1">
              Public page <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </Link>
            <Link href={`/admin/movies/${row.id}/edit`} className="text-film-muted hover:text-film-cream">Full editor</Link>
          </div>
        </div>
      </div>

      {playing && videoId && (
        <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title={`Preview of ${row.title}`}
            className="w-full h-full"
            allow="accelerometer; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      <p className="text-sm text-film-muted leading-relaxed max-h-36 overflow-auto">
        {detail ? (desc || 'No synopsis yet.') : 'Pulling up this film’s record...'}
      </p>

      {/* Checklist */}
      <div>
        <p className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Eligibility</p>
        <ul className="space-y-1">
          {HARD_CHECKS.map(c => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              <span className={row[c.key] ? 'text-emerald-300' : 'text-red-300'} aria-hidden="true">{row[c.key] ? '✓' : '✕'}</span>
              <span className={row[c.key] ? 'text-film-muted' : 'text-film-cream'}>{c.label}</span>
              {!row[c.key] && <span className="text-[10px] uppercase tracking-wide text-red-300">Required</span>}
            </li>
          ))}
          {SOFT_CHECKS.map(c => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              <span className={row[c.key] ? 'text-emerald-300' : 'text-film-gold'} aria-hidden="true">{row[c.key] ? '✓' : '!'}</span>
              <span className={row[c.key] ? 'text-film-muted' : 'text-film-cream'}>{c.label}</span>
              {!row[c.key] && <span className="text-[10px] uppercase tracking-wide text-film-gold">Flagged</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Fix blockers without leaving the queue */}
      <div>
        <p className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Film details</p>
        <div className="grid grid-cols-[1fr_88px] gap-2">
          <div className="col-span-2">
            <label htmlFor={`t-${row.id}`} className="sr-only">Title</label>
            <input id={`t-${row.id}`} className={ic} value={title} onChange={e => setTitle(e.target.value)} placeholder="Film title" />
          </div>
          <div>
            <label htmlFor={`c-${row.id}`} className="sr-only">Country</label>
            <input id={`c-${row.id}`} className={ic} list="listing-countries" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country of origin" />
          </div>
          <div>
            <label htmlFor={`y-${row.id}`} className="sr-only">Release year</label>
            <input id={`y-${row.id}`} className={ic} inputMode="numeric" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Year" />
          </div>
        </div>
        {suggestion && !country.trim() && (
          <button
            type="button"
            onClick={() => setCountry(suggestion.country)}
            className="mt-2 text-xs text-film-gold hover:underline text-left"
          >
            Looks like {suggestion.country}, going by the {suggestion.from}. Use it?
          </button>
        )}
        {dirty && (
          <button onClick={saveFields} disabled={savingFields} className="btn-outline py-1.5 text-xs mt-2 disabled:opacity-50">
            {savingFields ? 'Saving film details...' : 'Save film details'}
          </button>
        )}
      </div>

      {/* Decision */}
      {!isListed && (
        <div className="space-y-3 border-t border-cinema-border pt-4">
          <div>
            <label htmlFor={`w-${row.id}`} className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">
              Why it&apos;s on MuvieStars <span className="normal-case font-normal text-film-subtle">(optional, {300 - why.length} left)</span>
            </label>
            <textarea
              id={`w-${row.id}`}
              className={`${ic} resize-none`}
              rows={2}
              maxLength={300}
              value={why}
              onChange={e => setWhy(e.target.value)}
              placeholder="One honest line on why this film earns its place. Leave blank if unsure."
            />
          </div>
          <label className="flex items-start gap-2 text-sm text-film-muted cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-film-gold" />
            <span>
              I have checked: African cinema, a real production (not a clip or compilation), no rights or identity concerns
              <span className="text-film-subtle"> (C)</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button onClick={approve} disabled={!canApprove} className="btn-gold py-2 text-sm disabled:opacity-40" title="Shortcut: A">
              List this film
            </button>
            <button onClick={() => { setMode('needs'); setTimeout(() => noteRef.current?.focus(), 0) }} disabled={busy} className="btn-outline py-2 text-sm" title="Shortcut: N">
              Ask for more info
            </button>
            <button onClick={() => setMode('reject')} disabled={busy} className="btn-outline py-2 text-sm" title="Shortcut: R">
              Reject film
            </button>
            <button onClick={archive} disabled={busy} className="btn-ghost py-2 text-sm" title="Shortcut: X">
              Archive
            </button>
          </div>
          {!row.hard_ready && (
            <p className="text-xs text-red-300">Cannot list yet. Missing: {missingHard(row).join(', ')}.</p>
          )}
        </div>
      )}

      {isListed && (
        <div className="space-y-3 border-t border-cinema-border pt-4">
          <p className="text-sm text-film-muted">This film is listed. Pull it from discovery if it should not be.</p>
          <button onClick={() => setMode('delist')} disabled={busy} className="btn-outline py-2 text-sm">Delist this film</button>
        </div>
      )}

      {mode && (
        <div className="space-y-2 bg-cinema-surface border border-cinema-border rounded-lg p-3">
          {mode === 'reject' && (
            <>
              <label htmlFor={`r-${row.id}`} className="block text-xs text-film-muted">Why is this being rejected?</label>
              <select id={`r-${row.id}`} className={ic} value={reason} onChange={e => setReason(e.target.value)}>
                <option value="">Choose a reason</option>
                {REJECTION_REASONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
            </>
          )}
          <label htmlFor={`n-${row.id}`} className="block text-xs text-film-muted">
            {mode === 'needs' ? 'What information is missing?' : mode === 'delist' ? 'Why is it being delisted?' : 'Note (optional)'}
          </label>
          <input id={`n-${row.id}`} ref={noteRef} className={ic} value={note} onChange={e => setNote(e.target.value)} maxLength={500}
            placeholder={mode === 'needs' ? 'No release year, no cast credits' : mode === 'delist' ? 'Rights holder asked for removal' : 'Anything the next editor should know'} />
          <div className="flex gap-2 pt-1">
            <button onClick={submitMode} disabled={busy} className="btn-gold py-1.5 text-xs disabled:opacity-50">
              {mode === 'needs' ? 'Send back for info' : mode === 'delist' ? 'Delist with this reason' : 'Reject with this reason'}
            </button>
            <button onClick={() => setMode(null)} className="btn-ghost py-1.5 text-xs">Not now</button>
          </div>
        </div>
      )}

      {/* History */}
      {detail && detail.history.length > 0 && (
        <div className="border-t border-cinema-border pt-4">
          <p className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Decision history</p>
          <ul className="space-y-2">
            {detail.history.map(h => (
              <li key={h.id} className="text-xs text-film-muted">
                <span className="text-film-cream">{STATUS_LABELS[h.to_status as ListingStatus] ?? h.to_status}</span>
                {' by '}{reviewerLabel(h.reviewer_id)}{' on '}{new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {h.reason && <span>{'. '}{REJECTION_LABELS[h.reason] ?? h.reason}</span>}
                {h.note && <span className="block text-film-subtle">{h.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/* ─── Queue ────────────────────────────────────────────────────────────────────────────────── */

export function ListingTriage({ rows: initialRows, counts: initialCounts, total, tab, page, pageSize, filters, adminId, transitionMinPool }: Props) {
  const [rows, setRows]     = useState(initialRows)
  const [counts, setCounts] = useState(initialCounts)
  const [activeId, setActiveId] = useState<string | null>(initialRows[0]?.id ?? null)
  const [checked, setChecked]   = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [bulk, setBulk] = useState<null | 'approve' | 'needs' | 'reject' | 'country'>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [bulkNote, setBulkNote] = useState('')
  const [bulkReason, setBulkReason] = useState('')
  const [bulkCountry, setBulkCountry] = useState('')
  const supabase = useMemo(() => createClient() as any, [])

  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const activeRef = useRef(activeId)
  activeRef.current = activeId

  const tabDef = QUEUE_TABS.find(t => t.key === tab)!
  const active = rows.find(r => r.id === activeId) ?? null

  const href = (over: Record<string, string | number | boolean | null>) => {
    const p = new URLSearchParams()
    const merged: Record<string, string | number | boolean | null> = { tab, q: filters.q, industry: filters.industry, ready: filters.ready ? '1' : '', missing: filters.missingCountry ? 'country' : '', sort: filters.sort, page, ...over }
    for (const [k, v] of Object.entries(merged)) {
      if (v === '' || v === null || v === false || (k === 'page' && v === 1) || (k === 'tab' && v === 'todo') || (k === 'sort' && v === 'complete')) continue
      p.set(k, String(v))
    }
    const qs = p.toString()
    return qs ? `/admin/listing?${qs}` : '/admin/listing'
  }

  const move = (dir: -1 | 1) => {
    const list = rowsRef.current
    if (list.length === 0) return
    const i = list.findIndex(r => r.id === activeRef.current)
    const next = list[Math.min(Math.max(i + dir, 0), list.length - 1)]
    if (next) setActiveId(next.id)
  }

  const decide = async (payload: DecidePayload): Promise<boolean> => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decide', ...payload }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'That did not save. Try again.'); return false }

      const skipped: Array<{ id: string; title: string; missing: string[] }> = json.skipped ?? []
      const skippedIds = new Set(skipped.map(s => s.id))
      const doneIds = payload.ids.filter(id => !skippedIds.has(id))

      if (doneIds.length > 0) {
        const before = rowsRef.current
        const oldStatus = new Map(before.map(r => [r.id, r.listing_status]))
        const stays = (tabDef.statuses as readonly string[]).includes(payload.status)
        const idx = before.findIndex(r => r.id === activeRef.current)

        const after = before.flatMap(r =>
          doneIds.includes(r.id) ? (stays ? [{ ...r, listing_status: payload.status as ListingStatus }] : []) : [r],
        )
        setRows(after)
        setCounts(prev => {
          const c = { ...prev }
          for (const id of doneIds) {
            const o = oldStatus.get(id)
            if (o) c[o] = Math.max(0, c[o] - 1)
            c[payload.status as ListingStatus] = (c[payload.status as ListingStatus] ?? 0) + 1
          }
          return c
        })
        setChecked(prev => { const n = new Set(prev); doneIds.forEach(id => n.delete(id)); return n })
        if (doneIds.includes(activeRef.current ?? '')) {
          setActiveId(after[Math.min(Math.max(idx, 0), after.length - 1)]?.id ?? null)
        }
      }

      if (skipped.length > 0) {
        const first = skipped.slice(0, 3).map(s => `${s.title}: ${s.missing.join(', ')}`).join('. ')
        toast.warning(`${doneIds.length} listed, ${skipped.length} skipped. ${first}${skipped.length > 3 ? '...' : ''}`)
      } else {
        const verb: Record<string, string> = {
          approved: 'listed', needs_information: 'sent back for info', rejected: 'rejected',
          archived: 'archived', delisted: 'delisted', under_review: 'moved to under review', draft: 'moved to draft',
        }
        toast.success(`${doneIds.length} film${doneIds.length === 1 ? '' : 's'} ${verb[payload.status]}`)
      }
      return doneIds.length > 0
    } catch {
      toast.error('That did not go through. Check your connection and try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const resetBulk = () => { setBulk(null); setBulkConfirm(false); setBulkNote(''); setBulkReason(''); setBulkCountry('') }

  const fillCountry = async () => {
    const ids = [...checked]
    setBusy(true)
    try {
      const res = await fetch('/api/admin/listing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_country', ids, country: bulkCountry }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'That did not save. Try again.'); return false }

      // Re-read the checks from the database so each film shows whether it is now ready.
      const { data: fresh } = await supabase.from('movie_listing_queue_scored').select(QUEUE_COLUMNS).in('id', ids)
      const byId = new Map(((fresh ?? []) as QueueRow[]).map(r => [r.id, r]))
      setRows(prev => prev
        .map(r => byId.get(r.id) ?? r)
        .filter(r => !(filters.missingCountry && r.ok_country)))
      setChecked(new Set())

      const skipped = json.skipped ?? 0
      toast.success(`${bulkCountry} set on ${json.updated} film${json.updated === 1 ? '' : 's'}${skipped ? `. ${skipped} already had a country and were left alone.` : ''}`)
      return true
    } catch {
      toast.error('That did not go through. Check your connection and try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  const runBulk = async () => {
    const ids = [...checked]
    let ok = false
    if (bulk === 'country') ok = await fillCountry()
    if (bulk === 'approve') ok = await decide({ ids, status: 'approved', confirmed: bulkConfirm })
    if (bulk === 'needs') ok = await decide({ ids, status: 'needs_information', note: bulkNote })
    if (bulk === 'reject') ok = await decide({ ids, status: 'rejected', reason: bulkReason, note: bulkNote || undefined })
    if (ok) resetBulk()
  }

  const allChecked = rows.length > 0 && rows.every(r => checked.has(r.id))
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(rows.map(r => r.id)))
  const toggle = (id: string) => setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const readyChecked = rows.filter(r => checked.has(r.id) && r.hard_ready).length

  const listed = counts.approved
  const pct = Math.min(100, Math.round((listed / transitionMinPool) * 100))
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const ic = 'cinema-input text-sm py-2'

  return (
    <div className="space-y-5">
      <datalist id="listing-countries">{COUNTRIES.map(c => <option key={c} value={c} />)}</datalist>

      {/* Catalogue health */}
      <div className="cinema-card p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="text-2xl font-bold text-film-cream leading-none">{listed}</p>
          <p className="text-xs text-film-muted mt-1">films listed</p>
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="h-1.5 rounded-full bg-cinema-surface overflow-hidden" role="progressbar" aria-valuenow={Math.min(listed, transitionMinPool)} aria-valuemin={0} aria-valuemax={transitionMinPool} aria-label="Listed films toward the Swipe minimum">
            <div className="h-full bg-film-gold" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-film-muted mt-1.5">
            {listed < transitionMinPool
              ? `Swipe is mixing in drafts until ${transitionMinPool} films are listed. ${transitionMinPool - listed} to go.`
              : 'Swipe now draws from listed films only.'}
          </p>
        </div>
        <p className="text-xs text-film-subtle hidden xl:block">
          Keys: <kbd>V</kbd> preview &middot; <kbd>C</kbd> confirm &middot; <kbd>A</kbd> list &middot; <kbd>N</kbd> more info &middot; <kbd>R</kbd> reject &middot; <kbd>X</kbd> archive &middot; <kbd>J</kbd>/<kbd>K</kbd> next and back
        </p>
      </div>

      {/* Tabs */}
      <nav aria-label="Listing status" className="flex flex-wrap gap-1 border-b border-cinema-border">
        {QUEUE_TABS.map(t => {
          const n = t.statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
          const on = t.key === tab
          return (
            <Link
              key={t.key}
              href={href({ tab: t.key, page: 1 })}
              aria-current={on ? 'page' : undefined}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${on ? 'border-film-gold text-film-gold' : 'border-transparent text-film-muted hover:text-film-cream'}`}
            >
              {t.label} <span className="text-xs opacity-70">{n}</span>
            </Link>
          )
        })}
      </nav>

      {/* Filters */}
      <form method="get" action="/admin/listing" className="flex flex-wrap items-end gap-3">
        {tab !== 'todo' && <input type="hidden" name="tab" value={tab} />}
        <div>
          <label htmlFor="f-q" className="block text-xs text-film-muted mb-1">Title</label>
          <input id="f-q" name="q" defaultValue={filters.q} className={`${ic} w-56`} placeholder="Search by title" />
        </div>
        <div>
          <label htmlFor="f-ind" className="block text-xs text-film-muted mb-1">Industry</label>
          <select id="f-ind" name="industry" defaultValue={filters.industry} className={`${ic} w-44`}>
            <option value="">All industries</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="block text-xs text-film-muted mb-1">Order</label>
          <select id="f-sort" name="sort" defaultValue={filters.sort} className={`${ic} w-44`}>
            {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-film-muted pb-2 cursor-pointer">
          <input type="checkbox" name="ready" value="1" defaultChecked={filters.ready} className="w-4 h-4 accent-film-gold" />
          Ready to list only
        </label>
        <label className="flex items-center gap-2 text-sm text-film-muted pb-2 cursor-pointer">
          <input type="checkbox" name="missing" value="country" defaultChecked={filters.missingCountry} className="w-4 h-4 accent-film-gold" />
          No country yet
        </label>
        <button type="submit" className="btn-outline py-2 text-sm">Apply filters</button>
        {(filters.q || filters.industry || filters.ready || filters.missingCountry || filters.sort !== 'complete') && (
          <Link href={href({ q: '', industry: '', ready: false, missing: '', sort: 'complete', page: 1 })} className="btn-ghost py-2 text-sm">Clear filters</Link>
        )}
      </form>

      {/* Queue + panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-5 items-start">
        <div className="cinema-card overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-cinema-border text-xs text-film-muted">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Select every film on this page" className="w-4 h-4 accent-film-gold" disabled={rows.length === 0} />
            <span>{total} film{total === 1 ? '' : 's'}{total > pageSize ? `, page ${page} of ${totalPages}` : ''}</span>
          </div>

          {rows.length === 0 ? (
            <p className="px-4 py-14 text-center text-sm text-film-muted">
              {tab === 'todo' ? 'Nothing left to decide here. Nice work.' : 'No films in this list.'}
            </p>
          ) : (
            <ul className="divide-y divide-cinema-border">
              {rows.map(r => {
                const on = r.id === activeId
                return (
                  <li key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${on ? 'bg-cinema-surface' : 'hover:bg-cinema-surface/50'}`}>
                    <input type="checkbox" checked={checked.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.title}`} className="w-4 h-4 accent-film-gold shrink-0" />
                    <button type="button" onClick={() => setActiveId(r.id)} aria-current={on ? 'true' : undefined} className="flex flex-1 min-w-0 items-center gap-3 text-left">
                      {r.poster_url ? (
                        <img src={r.poster_url} alt="" width={32} height={48} loading="lazy" className="w-8 h-12 object-cover rounded bg-cinema-surface shrink-0" />
                      ) : (
                        <span className="w-8 h-12 rounded bg-cinema-surface shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-film-cream truncate">{r.title}</span>
                        <span className="block text-xs text-film-muted truncate">
                          {[r.release_year, r.country ?? 'No country', r.industry].filter(Boolean).join(' · ')}
                          {r.listing_status === 'rejected' && r.listing_rejection_reason ? ` · ${REJECTION_LABELS[r.listing_rejection_reason] ?? r.listing_rejection_reason}` : ''}
                        </span>
                      </span>
                      <Dots row={r} />
                      {tab === 'todo' && r.listing_status !== 'draft' && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${PILL[r.listing_status]}`}>{STATUS_LABELS[r.listing_status]}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-cinema-border text-sm">
              {page > 1 ? <Link href={href({ page: page - 1 })} className="text-film-cream">Previous page</Link> : <span />}
              {page < totalPages ? <Link href={href({ page: page + 1 })} className="text-film-cream">Next page</Link> : <span />}
            </div>
          )}
        </div>

        <div className="xl:sticky xl:top-4">
          {active ? (
            <DetailPanel
              key={active.id}
              row={active}
              adminId={adminId}
              busy={busy}
              onDecide={decide}
              onRowUpdated={r => setRows(prev => prev.map(x => (x.id === r.id ? r : x)))}
              onMove={move}
            />
          ) : (
            <div className="cinema-card p-8 text-center text-sm text-film-muted">Pick a film to review it.</div>
          )}
        </div>
      </div>

      {/* Bulk bar */}
      {checked.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-cinema-border bg-cinema-dark/95 backdrop-blur-sm lg:left-52">
          <div className="px-6 py-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-film-cream">{checked.size} selected</span>
            <span className="text-xs text-film-muted">{readyChecked} ready to list</span>
            <div className="flex-1" />
            {!bulk && (
              <>
                <button onClick={() => setBulk('approve')} className="btn-gold py-1.5 text-sm">List selected</button>
                <button onClick={() => setBulk('needs')} className="btn-outline py-1.5 text-sm">Ask for more info</button>
                <button onClick={() => setBulk('country')} className="btn-outline py-1.5 text-sm">Set country</button>
                <button onClick={() => setBulk('reject')} className="btn-outline py-1.5 text-sm">Reject selected</button>
                <button onClick={() => decide({ ids: [...checked], status: 'archived' })} disabled={busy} className="btn-ghost py-1.5 text-sm">Archive selected</button>
                <button onClick={() => setChecked(new Set())} className="btn-ghost py-1.5 text-sm">Clear selection</button>
              </>
            )}
            {bulk === 'approve' && (
              <>
                <label className="flex items-center gap-2 text-sm text-film-muted cursor-pointer">
                  <input type="checkbox" checked={bulkConfirm} onChange={e => setBulkConfirm(e.target.checked)} className="w-4 h-4 accent-film-gold" />
                  I have checked these are African films and real productions with no rights concerns
                </label>
                <button onClick={runBulk} disabled={!bulkConfirm || busy} className="btn-gold py-1.5 text-sm disabled:opacity-40">
                  List {readyChecked} film{readyChecked === 1 ? '' : 's'}
                </button>
                <button onClick={resetBulk} className="btn-ghost py-1.5 text-sm">Not now</button>
              </>
            )}
            {bulk === 'needs' && (
              <>
                <label htmlFor="bulk-note" className="sr-only">What information is missing</label>
                <input id="bulk-note" className={`${ic} w-72`} value={bulkNote} onChange={e => setBulkNote(e.target.value)} placeholder="What information is missing?" />
                <button onClick={runBulk} disabled={busy || bulkNote.trim().length < 3} className="btn-gold py-1.5 text-sm disabled:opacity-40">Send back for info</button>
                <button onClick={resetBulk} className="btn-ghost py-1.5 text-sm">Not now</button>
              </>
            )}
            {bulk === 'country' && (
              <>
                <label htmlFor="bulk-country" className="sr-only">Country to set</label>
                <input id="bulk-country" list="listing-countries" className={`${ic} w-56`} value={bulkCountry} onChange={e => setBulkCountry(e.target.value)} placeholder="Which country?" />
                <button onClick={runBulk} disabled={busy || !bulkCountry.trim()} className="btn-gold py-1.5 text-sm disabled:opacity-40">
                  Set {bulkCountry.trim() || 'country'} on films without one
                </button>
                <button onClick={resetBulk} className="btn-ghost py-1.5 text-sm">Not now</button>
              </>
            )}
            {bulk === 'reject' && (
              <>
                <label htmlFor="bulk-reason" className="sr-only">Reason for rejecting</label>
                <select id="bulk-reason" className={`${ic} w-64`} value={bulkReason} onChange={e => setBulkReason(e.target.value)}>
                  <option value="">Choose a reason</option>
                  {REJECTION_REASONS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
                <button onClick={runBulk} disabled={busy || !bulkReason} className="btn-gold py-1.5 text-sm disabled:opacity-40">Reject {checked.size}</button>
                <button onClick={resetBulk} className="btn-ghost py-1.5 text-sm">Not now</button>
              </>
            )}
          </div>
        </div>
      )}
      {checked.size > 0 && <div className="h-16" aria-hidden="true" />}
    </div>
  )
}

