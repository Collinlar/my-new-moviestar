'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { COUNTRIES, INDUSTRIES } from '@/lib/utils'

export type TabKey = 'country' | 'industry' | 'title' | 'year' | 'duplicates' | 'posters'

export interface PosterRow { id: string; title: string; year: number | null; status: string; url: string | null; kind: 'none' | 'thumbnail' | 'link' }

export interface CountryRow { id: string; title: string; year: number | null; status: string; language: string | null; guess: { country: string; from: 'title' | 'language' | 'description' } | null }
export interface IndustryRow { id: string; title: string; year: number | null; status: string; country: string; from: string | null; to: string }
export interface TitleRow { id: string; title: string; year: number | null; status: string; to: string; confidence: 'high' | 'review'; notes: string[]; trailer: boolean; yearFrom: number | null }
export interface YearRow { id: string; title: string; status: string; from: number | null; to: number | null }
export interface DupFilm { id: string; title: string; year: number | null; status: string; created: string }
export interface DupGroup { key: string; films: DupFilm[]; keeperId: string }
export interface BatchRow { id: string; at: string; changes: number; reverted: number; fields: string[] }

interface Counts {
  country: number; countryGuessed: number | null; industry: number; title: number; titleUnclean: number; year: number; duplicates: number; total: number
  /** Null when the poster upload migration has not been run, so the tab can say so instead of showing a wrong number. */
  posters: number | null
}

interface Props {
  tab: TabKey
  counts: Counts
  showMax: number
  countryRows: CountryRow[]
  industryRows: IndustryRow[]
  titleRows: TitleRow[]
  yearRows: YearRow[]
  dupGroups: DupGroup[]
  posterRows: PosterRow[]
  batches: BatchRow[]
  logReady: boolean
}

const ic = 'cinema-input text-sm py-2'
const STATUS: Record<string, string> = { approved: 'Listed', draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', needs_information: 'Needs information', rejected: 'Rejected', archived: 'Archived', delisted: 'Delisted' }
const FIELD_WORD: Record<string, string> = { title: 'titles', country: 'countries', release_year: 'years', industry: 'industries' }

interface Change { id: string; field: 'title' | 'country' | 'release_year' | 'industry'; from: string; to: string }

function useApply() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function apply(changes: Change[], note: string): Promise<boolean> {
    if (changes.length === 0) { toast.error('Tick at least one film that has a new value.'); return false }
    const send = changes.slice(0, 500)
    setBusy(true)
    const supabase = createClient() as any
    const { data, error } = await supabase.rpc('data_quality_apply', { p_changes: send, p_note: note })
    setBusy(false)
    if (error) {
      toast.error(
        error.code === '42501' ? 'Only admins can change films in bulk.'
        : /data_quality_apply|schema cache|does not exist/i.test(error.message ?? '') ? 'The data quality migration has not been run on this database yet. Run 20261001000011_data_quality.sql, then try again.'
        : error.code === '23514' ? error.message
        : 'That did not save, and nothing was changed. Check your connection and try again.',
      )
      return false
    }
    const skipped = data?.skipped ?? 0
    toast.success(
      `${data?.applied ?? 0} film${data?.applied === 1 ? '' : 's'} updated.` +
      (skipped ? ` ${skipped} skipped because someone changed them since you opened this page.` : '') +
      (changes.length > 500 ? ' Apply again for the rest.' : ''),
    )
    router.refresh()
    return true
  }
  return { apply, busy }
}

function FilmCell({ id, title, year, status, extra }: { id: string; title: string; year: number | null; status: string; extra?: string }) {
  return (
    <div className="min-w-0">
      <Link href={`/movie/${id}`} target="_blank" className="block text-sm text-film-cream truncate hover:text-film-gold" title={title}>{title}</Link>
      <span className="block text-xs text-film-muted truncate">{[year, STATUS[status] ?? status, extra].filter(Boolean).join(' · ')}</span>
    </div>
  )
}

function Tick({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} className="w-4 h-4 accent-film-gold" />
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="cinema-card p-6 text-sm text-film-muted">{children}</div>
}

function Capped({ shown, total, max }: { shown: number; total: number; max: number }) {
  if (total <= max) return null
  return <p className="text-xs text-film-muted">Showing the first {shown} of {total}. Apply these and the next ones appear.</p>
}

// ---- countries -------------------------------------------------------------------------------------------

function CountryTab({ rows, max }: { rows: CountryRow[]; max: number }) {
  const { apply, busy } = useApply()
  const shown = useMemo(() => rows.slice(0, max), [rows, max])
  const [value, setValue] = useState<Record<string, string>>(() => Object.fromEntries(shown.map((r) => [r.id, r.guess?.country ?? ''])))
  const [on, setOn] = useState<Set<string>>(() => new Set(shown.filter((r) => r.guess && r.guess.from !== 'description').map((r) => r.id)))
  const [bulk, setBulk] = useState('')

  const toggle = (id: string) => setOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ready = shown.filter((r) => on.has(r.id) && (value[r.id] ?? '').trim())

  if (rows.length === 0) return <Empty>Every film has a country. Nothing to fix here.</Empty>
  return (
    <div className="space-y-4">
      <datalist id="dq-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="cinema-card p-4 flex flex-wrap items-center gap-3">
        <button className="btn-outline py-1.5 text-sm" onClick={() => setOn(new Set(shown.filter((r) => r.guess && r.guess.from !== 'description').map((r) => r.id)))}>Tick the sure ones</button>
        <button className="btn-outline py-1.5 text-sm" onClick={() => setOn(new Set(shown.filter((r) => (value[r.id] ?? '').trim()).map((r) => r.id)))}>Tick every film with a country filled in</button>
        <button className="btn-ghost py-1.5 text-sm" onClick={() => setOn(new Set())}>Clear ticks</button>
        <span className="mx-2 h-5 w-px bg-cinema-border" aria-hidden="true" />
        <label htmlFor="dq-bulk-country" className="sr-only">Country to fill into ticked films with none</label>
        <input id="dq-bulk-country" list="dq-countries" className={`${ic} w-48`} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder="Which country?" />
        <button
          className="btn-outline py-1.5 text-sm disabled:opacity-40"
          disabled={!bulk.trim()}
          onClick={() => setValue((v) => { const n = { ...v }; for (const r of shown) if (on.has(r.id) && !(n[r.id] ?? '').trim()) n[r.id] = bulk.trim(); return n })}
        >
          Fill into ticked films that have none
        </button>
      </div>

      <div className="cinema-card divide-y divide-cinema-border">
        {shown.map((r) => (
          <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,14rem)] sm:grid-cols-[auto_minmax(0,1fr)_14rem_11rem] gap-3 items-center p-3">
            <Tick checked={on.has(r.id)} onChange={() => toggle(r.id)} label={`Apply to ${r.title}`} />
            <FilmCell id={r.id} title={r.title} year={r.year} status={r.status} extra={r.language ? `Language: ${r.language}` : undefined} />
            <div>
              <label htmlFor={`dq-c-${r.id}`} className="sr-only">Country for {r.title}</label>
              <input id={`dq-c-${r.id}`} list="dq-countries" className={`${ic} w-full`} value={value[r.id] ?? ''} onChange={(e) => { setValue((v) => ({ ...v, [r.id]: e.target.value })); if (e.target.value.trim()) setOn((s) => new Set(s).add(r.id)) }} placeholder="Country of origin" />
            </div>
            <p className="hidden sm:block text-xs text-film-muted">
              {r.guess ? `Going by the ${r.guess.from}${r.guess.from === 'description' ? ', so check it' : ''}` : 'Nothing in the text says. Open the film and look.'}
            </p>
          </div>
        ))}
      </div>
      <Capped shown={shown.length} total={rows.length} max={max} />
      <div className="flex items-center gap-3">
        <button
          className="btn-gold py-2 text-sm disabled:opacity-40"
          disabled={busy || ready.length === 0}
          onClick={() => apply(ready.map((r) => ({ id: r.id, field: 'country' as const, from: '', to: value[r.id].trim() })), 'Country filled in from the Data quality screen')}
        >
          {busy ? `Saving ${ready.length} countries...` : `Set ${ready.length} ${ready.length === 1 ? 'country' : 'countries'}`}
        </button>
        <span className="text-xs text-film-muted">Setting a country also sets the industry when it was Other.</span>
      </div>
    </div>
  )
}

// ---- industries ------------------------------------------------------------------------------------------

function IndustryTab({ rows, max }: { rows: IndustryRow[]; max: number }) {
  const { apply, busy } = useApply()
  const shown = useMemo(() => rows.slice(0, max), [rows, max])
  const [value, setValue] = useState<Record<string, string>>(() => Object.fromEntries(shown.map((r) => [r.id, r.to])))
  const [on, setOn] = useState<Set<string>>(() => new Set(shown.map((r) => r.id)))
  const toggle = (id: string) => setOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ready = shown.filter((r) => on.has(r.id) && value[r.id] && value[r.id] !== (r.from ?? ''))

  if (rows.length === 0) return <Empty>Every film with a country already has the industry that country points to.</Empty>
  return (
    <div className="space-y-4">
      <p className="text-sm text-film-muted max-w-2xl">
        These films have a country but their industry is still Other, so they are missing from Nollywood and Ghallywood moods and from taste matching. The suggestion follows the country.
      </p>
      <div className="cinema-card divide-y divide-cinema-border">
        {shown.map((r) => (
          <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,11rem)] sm:grid-cols-[auto_minmax(0,1fr)_8rem_12rem] gap-3 items-center p-3">
            <Tick checked={on.has(r.id)} onChange={() => toggle(r.id)} label={`Apply to ${r.title}`} />
            <FilmCell id={r.id} title={r.title} year={r.year} status={r.status} />
            <p className="hidden sm:block text-sm text-film-muted">{r.country}</p>
            <div>
              <label htmlFor={`dq-i-${r.id}`} className="sr-only">Industry for {r.title}</label>
              <select id={`dq-i-${r.id}`} className={`${ic} w-full`} value={value[r.id]} onChange={(e) => setValue((v) => ({ ...v, [r.id]: e.target.value }))}>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
      <Capped shown={shown.length} total={rows.length} max={max} />
      <div className="flex items-center gap-3">
        <button className="btn-gold py-2 text-sm disabled:opacity-40" disabled={busy || ready.length === 0}
          onClick={() => apply(ready.map((r) => ({ id: r.id, field: 'industry' as const, from: r.from ?? '', to: value[r.id] })), 'Industry brought in line with the country')}>
          {busy ? `Saving ${ready.length} industries...` : `Update ${ready.length} ${ready.length === 1 ? 'industry' : 'industries'}`}
        </button>
        <button className="btn-ghost py-2 text-sm" onClick={() => setOn(on.size ? new Set() : new Set(shown.map((r) => r.id)))}>{on.size ? 'Clear ticks' : 'Tick all'}</button>
      </div>
    </div>
  )
}

// ---- titles ----------------------------------------------------------------------------------------------

function TitleTab({ rows, max }: { rows: TitleRow[]; max: number }) {
  const { apply, busy } = useApply()
  const shown = useMemo(() => rows.slice(0, max), [rows, max])
  const [value, setValue] = useState<Record<string, string>>(() => Object.fromEntries(shown.map((r) => [r.id, r.to])))
  const [on, setOn] = useState<Set<string>>(() => new Set(shown.filter((r) => r.confidence === 'high' && !r.trailer).map((r) => r.id)))
  const [skipYear, setSkipYear] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ready = shown.filter((r) => on.has(r.id) && value[r.id].trim() && value[r.id].trim() !== r.title.trim())

  if (rows.length === 0) return <Empty>No title needs tidying.</Empty>
  const changes: Change[] = ready.flatMap((r) => {
    const out: Change[] = [{ id: r.id, field: 'title', from: r.title.trim(), to: value[r.id].trim() }]
    if (r.yearFrom && !skipYear.has(r.id)) out.push({ id: r.id, field: 'release_year', from: '', to: String(r.yearFrom) })
    return out
  })
  const sure = shown.filter((r) => r.confidence === 'high' && !r.trailer).length

  return (
    <div className="space-y-4">
      <div className="cinema-card p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-film-muted">{sure} look safe. The rest need your eye: a title found after the marketing, a very short result, or a film that may be a trailer.</span>
        <button className="btn-outline py-1.5 text-sm" onClick={() => setOn(new Set(shown.filter((r) => r.confidence === 'high' && !r.trailer).map((r) => r.id)))}>Tick the safe ones</button>
        <button className="btn-ghost py-1.5 text-sm" onClick={() => setOn(new Set())}>Clear ticks</button>
      </div>

      <div className="cinema-card divide-y divide-cinema-border">
        {shown.map((r) => (
          <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-3">
            <div className="pt-2"><Tick checked={on.has(r.id)} onChange={() => toggle(r.id)} label={`Apply to ${r.title}`} /></div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <Link href={`/movie/${r.id}`} target="_blank" className="text-sm text-film-muted line-through decoration-film-subtle break-words hover:text-film-cream">{r.title}</Link>
                <span className="text-xs text-film-subtle">{[r.year, STATUS[r.status] ?? r.status].filter(Boolean).join(' · ')}</span>
                {r.confidence === 'review' && <span className="text-xs text-film-gold">Check this one</span>}
                {r.trailer && <span className="text-xs text-red-400">May be a trailer, not a film</span>}
              </div>
              <label htmlFor={`dq-t-${r.id}`} className="sr-only">New title for {r.title}</label>
              <input id={`dq-t-${r.id}`} className={`${ic} w-full`} value={value[r.id]} onChange={(e) => { setValue((v) => ({ ...v, [r.id]: e.target.value })); setOn((s) => new Set(s).add(r.id)) }} />
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-film-muted">
                {r.notes.slice(0, 3).map((n, i) => <span key={i}>{n}</span>)}
                {r.yearFrom && (
                  <label className="inline-flex items-center gap-1.5">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-film-gold" checked={!skipYear.has(r.id)} onChange={() => setSkipYear((s) => { const n = new Set(s); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n })} />
                    Also set the year to {r.yearFrom}
                  </label>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Capped shown={shown.length} total={rows.length} max={max} />
      <button className="btn-gold py-2 text-sm disabled:opacity-40" disabled={busy || ready.length === 0}
        onClick={() => apply(changes, 'Title tidied from the Data quality screen')}>
        {busy ? `Saving ${ready.length} titles...` : `Tidy ${ready.length} ${ready.length === 1 ? 'title' : 'titles'}`}
      </button>
    </div>
  )
}

// ---- years -----------------------------------------------------------------------------------------------

function YearTab({ rows, max }: { rows: YearRow[]; max: number }) {
  const { apply, busy } = useApply()
  const shown = useMemo(() => rows.slice(0, max), [rows, max])
  const [value, setValue] = useState<Record<string, string>>(() => Object.fromEntries(shown.map((r) => [r.id, r.to ? String(r.to) : ''])))
  const [on, setOn] = useState<Set<string>>(() => new Set(shown.filter((r) => r.to).map((r) => r.id)))
  const toggle = (id: string) => setOn((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const ready = shown.filter((r) => on.has(r.id) && /^\d{4}$/.test(value[r.id] ?? ''))

  if (rows.length === 0) return <Empty>Every film has a believable release year.</Empty>
  return (
    <div className="space-y-4">
      <div className="cinema-card divide-y divide-cinema-border">
        {shown.map((r) => (
          <div key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)_7rem] sm:grid-cols-[auto_minmax(0,1fr)_7rem_14rem] gap-3 items-center p-3">
            <Tick checked={on.has(r.id)} onChange={() => toggle(r.id)} label={`Apply to ${r.title}`} />
            <FilmCell id={r.id} title={r.title} year={r.from} status={r.status} extra={r.from ? 'Year looks wrong' : 'No year'} />
            <div>
              <label htmlFor={`dq-y-${r.id}`} className="sr-only">Release year for {r.title}</label>
              <input id={`dq-y-${r.id}`} inputMode="numeric" className={`${ic} w-full`} value={value[r.id] ?? ''} onChange={(e) => { setValue((v) => ({ ...v, [r.id]: e.target.value.replace(/\D/g, '').slice(0, 4) })); setOn((s) => new Set(s).add(r.id)) }} placeholder="Year" />
            </div>
            <p className="hidden sm:block text-xs text-film-muted">{r.to ? 'The title carries this year' : 'No year in the title. Open the film and look.'}</p>
          </div>
        ))}
      </div>
      <Capped shown={shown.length} total={rows.length} max={max} />
      <button className="btn-gold py-2 text-sm disabled:opacity-40" disabled={busy || ready.length === 0}
        onClick={() => apply(ready.map((r) => ({ id: r.id, field: 'release_year' as const, from: r.from ? String(r.from) : '', to: value[r.id] })), 'Release year set from the Data quality screen')}>
        {busy ? `Saving ${ready.length} years...` : `Set ${ready.length} ${ready.length === 1 ? 'year' : 'years'}`}
      </button>
    </div>
  )
}

// ---- duplicates ------------------------------------------------------------------------------------------

function DuplicatesTab({ groups, max }: { groups: DupGroup[]; max: number }) {
  const router = useRouter()
  const shown = useMemo(() => groups.slice(0, max), [groups, max])
  const [keeper, setKeeper] = useState<Record<string, string>>(() => Object.fromEntries(shown.map((g) => [g.key, g.keeperId])))
  const [on, setOn] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const DONE = ['rejected', 'archived', 'delisted']

  const toggle = (k: string) => setOn((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const extrasOf = (g: DupGroup) => g.films.filter((f) => f.id !== keeper[g.key] && !DONE.includes(f.status))
  const ids = shown.filter((g) => on.has(g.key)).flatMap(extrasOf).map((f) => f.id)

  async function reject() {
    if (ids.length === 0) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/listing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ids.slice(0, 200), status: 'rejected', reason: 'duplicate', note: 'Rejected as a copy of another listing from the Data quality screen' }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'That did not save, and nothing was rejected. Try again.'); return }
      toast.success(`${ids.slice(0, 200).length} extra ${ids.length === 1 ? 'copy' : 'copies'} rejected as duplicates.`)
      setOn(new Set())
      router.refresh()
    } catch {
      toast.error('We could not reach the server. Nothing was rejected. Check your connection and tap again.')
    } finally {
      setBusy(false)
    }
  }

  if (groups.length === 0) return <Empty>No film shares its title and year with another.</Empty>
  return (
    <div className="space-y-4">
      <p className="text-sm text-film-muted max-w-2xl">
        These films have the same title once the marketing is stripped, and the same release year. Pick the copy to keep. The rest are rejected as duplicates.
        Their takes and reviews stay where they are.
      </p>
      <div className="space-y-3">
        {shown.map((g) => {
          const extras = extrasOf(g)
          return (
            <div key={g.key} className="cinema-card p-3">
              <div className="flex items-start gap-3">
                <div className="pt-1"><Tick checked={on.has(g.key)} onChange={() => toggle(g.key)} label={`Reject the extra copies of ${g.films[0].title}`} /></div>
                <div className="min-w-0 flex-1 space-y-2">
                  {g.films.map((f) => (
                    <label key={f.id} className="flex items-center gap-3 cursor-pointer">
                      <input type="radio" name={`keep-${g.key}`} className="accent-film-gold" checked={keeper[g.key] === f.id} onChange={() => setKeeper((k) => ({ ...k, [g.key]: f.id }))} aria-label={`Keep ${f.title}`} />
                      <FilmCell id={f.id} title={f.title} year={f.year} status={f.status} extra={`Added ${new Date(f.created).toLocaleDateString('en-GB')}`} />
                    </label>
                  ))}
                  <p className="text-xs text-film-muted">{extras.length === 0 ? 'The other copies are already rejected or archived.' : `Keeping the ticked radio. ${extras.length} to reject.`}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <Capped shown={shown.length} total={groups.length} max={max} />
      <button className="btn-gold py-2 text-sm disabled:opacity-40" disabled={busy || ids.length === 0} onClick={reject}>
        {busy ? `Rejecting ${ids.length} copies...` : `Reject ${ids.length} extra ${ids.length === 1 ? 'copy' : 'copies'}`}
      </button>
    </div>
  )
}

// ---- posters ---------------------------------------------------------------------------------------------

const POSTER_NOTE: Record<PosterRow['kind'], string> = {
  none: 'No picture at all',
  thumbnail: 'YouTube thumbnail, wide and low resolution',
  link: 'Pasted link, not uploaded',
}

function PostersTab({ rows, max, ready }: { rows: PosterRow[]; max: number; ready: boolean }) {
  if (!ready) return <Empty>Poster uploads are not set up on this database yet. Run <code className="text-film-gold">20261001000012_film_images.sql</code> in the Supabase SQL editor, then reload.</Empty>
  if (rows.length === 0) return <Empty>Every film has an uploaded poster.</Empty>
  const shown = rows.slice(0, max)
  return (
    <div className="space-y-4">
      <p className="text-sm text-film-muted max-w-2xl">
        These films have no uploaded poster. Listed films come first, and films with no picture at all come before those that use a thumbnail.
        Open one, upload a portrait poster, and it is saved in three sizes.
      </p>
      <div className="cinema-card divide-y divide-cinema-border">
        {shown.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3">
            <div style={{ width: 40, height: 60, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: '#15120E' }}>
              {r.url && <img src={r.url} alt="" width={40} height={60} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div className="min-w-0 flex-1">
              <FilmCell id={r.id} title={r.title} year={r.year} status={r.status} extra={POSTER_NOTE[r.kind]} />
            </div>
            <Link href={`/admin/movies/${r.id}/edit#poster-studio`} className="btn-outline py-1.5 text-sm shrink-0">Add the poster</Link>
          </div>
        ))}
      </div>
      <Capped shown={shown.length} total={rows.length} max={max} />
    </div>
  )
}

// ---- the desk --------------------------------------------------------------------------------------------

export function DataQualityDesk(p: Props) {
  const router = useRouter()
  const [undoing, setUndoing] = useState<string | null>(null)
  const tabs: Array<{ key: TabKey; label: string; n: number }> = [
    { key: 'country', label: 'No country', n: p.counts.country },
    { key: 'industry', label: 'Industry still Other', n: p.counts.industry },
    { key: 'title', label: 'Messy titles', n: p.counts.title },
    { key: 'year', label: 'Year missing or wrong', n: p.counts.year },
    { key: 'duplicates', label: 'Possible duplicates', n: p.counts.duplicates },
    { key: 'posters', label: 'No uploaded poster', n: p.counts.posters ?? 0 },
  ]

  async function undo(id: string) {
    setUndoing(id)
    const supabase = createClient() as any
    const { data, error } = await supabase.rpc('data_quality_undo', { p_batch: id })
    setUndoing(null)
    if (error) { toast.error(error.code === '42501' ? 'Only admins can undo a batch.' : error.code === '23514' ? error.message : 'That did not undo, and nothing was changed. Try again.'); return }
    toast.success(`${data?.restored ?? 0} restored.${data?.skipped ? ` ${data.skipped} left alone because they were edited after the batch.` : ''}`)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="cinema-card p-4 flex flex-wrap gap-x-8 gap-y-3">
        <div><p className="text-2xl font-bold text-film-cream leading-none">{p.counts.total}</p><p className="text-xs text-film-muted mt-1">films in the catalogue</p></div>
        <div><p className="text-2xl font-bold text-film-cream leading-none">{p.counts.country}</p><p className="text-xs text-film-muted mt-1">have no country</p></div>
        <div><p className="text-2xl font-bold text-film-cream leading-none">{p.counts.titleUnclean}</p><p className="text-xs text-film-muted mt-1">titles fail the clean-title check</p></div>
        <div><p className="text-2xl font-bold text-film-cream leading-none">{p.counts.duplicates}</p><p className="text-xs text-film-muted mt-1">groups of possible duplicates</p></div>
      </div>

      <nav aria-label="Kinds of fix" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link key={t.key} href={`/admin/data-quality?tab=${t.key}`} aria-current={p.tab === t.key ? 'page' : undefined}
            className={p.tab === t.key ? 'btn-gold py-2 text-sm' : 'btn-outline py-2 text-sm'}>
            {t.label} <span className="opacity-70">({t.n})</span>
          </Link>
        ))}
      </nav>

      {/* key forces fresh ticks after every apply, because the rows underneath have changed */}
      {p.tab === 'country' && <CountryTab key={`c-${p.countryRows.length}`} rows={p.countryRows} max={p.showMax} />}
      {p.tab === 'industry' && <IndustryTab key={`i-${p.industryRows.length}`} rows={p.industryRows} max={p.showMax} />}
      {p.tab === 'title' && <TitleTab key={`t-${p.titleRows.length}`} rows={p.titleRows} max={p.showMax} />}
      {p.tab === 'year' && <YearTab key={`y-${p.yearRows.length}`} rows={p.yearRows} max={p.showMax} />}
      {p.tab === 'duplicates' && <DuplicatesTab key={`d-${p.dupGroups.length}`} groups={p.dupGroups} max={p.showMax} />}
      {p.tab === 'posters' && <PostersTab rows={p.posterRows} max={p.showMax} ready={p.counts.posters != null} />}

      <section aria-labelledby="dq-batches" className="pt-4">
        <h2 id="dq-batches" className="section-label mb-2">Recent batches</h2>
        {!p.logReady ? (
          <Empty>The change log is not set up on this database yet. Run <code className="text-film-gold">20261001000011_data_quality.sql</code> in the Supabase SQL editor, then reload.</Empty>
        ) : p.batches.length === 0 ? (
          <Empty>Nothing has been changed from this screen yet.</Empty>
        ) : (
          <div className="cinema-card divide-y divide-cinema-border">
            {p.batches.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm text-film-cream">{b.changes} change{b.changes === 1 ? '' : 's'} to {b.fields.map((f) => FIELD_WORD[f] ?? f).join(', ')}</p>
                  <p className="text-xs text-film-muted">{new Date(b.at).toLocaleString('en-GB')}{b.reverted ? ` · ${b.reverted} undone` : ''}</p>
                </div>
                <button className="btn-outline py-1.5 text-sm disabled:opacity-40" disabled={undoing === b.id || b.reverted >= b.changes} onClick={() => undo(b.id)}>
                  {undoing === b.id ? 'Putting it back...' : b.reverted >= b.changes ? 'Undone' : 'Undo this batch'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
