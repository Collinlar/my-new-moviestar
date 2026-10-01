'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MIN_SELECTION_FILMS, SELECTION_LABELS } from '@/lib/selections-shared'

interface Item {
  position: number
  note: string | null
  movie: { id: string; title: string; release_year: number | null; poster_url: string | null; listing_status: string; why_listed: string | null }
}

interface SelectionData {
  id: string
  slug: string
  title: string
  label: string
  intro: string | null
  period: string | null
  status: 'draft' | 'published' | 'archived'
  sort_order: number
  selection_items: Item[]
}

const INPUT: React.CSSProperties = {
  width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
  border: '1px solid rgba(237,228,210,0.12)', background: '#15120E',
  color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#6A6258', marginBottom: '6px', fontFamily: '"Geist Mono", monospace',
}
const SMALL_BTN: React.CSSProperties = {
  minWidth: '44px', height: '36px', padding: '0 10px', borderRadius: '8px', background: 'transparent',
  border: '1px solid rgba(237,228,210,0.15)', color: '#A39B8F', fontSize: '13px', cursor: 'pointer',
}

export function SelectionEditor({ selection }: { selection: SelectionData }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(selection.title)
  const [slug, setSlug] = useState(selection.slug)
  const [label, setLabel] = useState(selection.label)
  const [intro, setIntro] = useState(selection.intro ?? '')
  const [period, setPeriod] = useState(selection.period ?? '')
  const [status, setStatus] = useState(selection.status)
  const [sortOrder, setSortOrder] = useState(String(selection.sort_order))
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<Item[]>([...selection.selection_items].sort((a, b) => a.position - b.position))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<Item['movie']>>([])
  const [searching, setSearching] = useState(false)
  const [filmError, setFilmError] = useState<string | null>(null)

  const listedCount = items.filter((i) => i.movie.listing_status === 'approved').length

  async function saveDetails() {
    setError(null); setSaved(null)
    if (!title.trim()) { setError('The Selection needs a title.'); return }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setError('The link name can only use lowercase letters, numbers and single dashes.'); return }
    if (period.trim() && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period.trim())) { setError('Set the month as year and month, like 2026-10.'); return }
    if (status === 'published' && listedCount < MIN_SELECTION_FILMS) {
      setError(`Add at least ${MIN_SELECTION_FILMS} listed films before publishing this Selection. It has ${listedCount}.`); return
    }
    const missingNote = items.filter((i) => i.movie.listing_status === 'approved' && !i.note?.trim() && !i.movie.why_listed?.trim())
    if (status === 'published' && missingNote.length > 0) {
      setError(`Say why each film is here before publishing. ${missingNote.map((i) => i.movie.title).slice(0, 3).join(', ')}${missingNote.length > 3 ? ' and more' : ''} still ${missingNote.length === 1 ? 'has' : 'have'} no note.`); return
    }

    startTransition(async () => {
      const { error: err } = await supabase
        .from('selections')
        .update({
          title: title.trim(), slug, label, intro: intro.trim() || null, period: period.trim() || null,
          status, sort_order: Number(sortOrder) || 0,
        })
        .eq('id', selection.id)
      if (err) {
        setError(err.code === '23505' ? 'Another Selection already uses that link name.' : `The Selection did not save: ${err.message}`)
        return
      }
      setSaved('Saved.')
      router.refresh()
    })
  }

  async function search() {
    const q = query.trim()
    setFilmError(null)
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const { data, error: err } = await supabase
      .from('movies')
      .select('id, title, release_year, poster_url, listing_status, why_listed')
      .eq('listing_status', 'approved')
      .ilike('title', `%${q.replace(/[%_,()]/g, ' ')}%`)
      .order('title', { ascending: true })
      .limit(8)
    setSearching(false)
    if (err) { setFilmError('We could not search just now. Tap Find films again.'); return }
    const have = new Set(items.map((i) => i.movie.id))
    setResults(((data ?? []) as Item['movie'][]).filter((m) => !have.has(m.id)))
  }

  async function addFilm(m: Item['movie']) {
    setFilmError(null)
    const position = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 1
    const { error: err } = await supabase.from('selection_items').insert({ selection_id: selection.id, movie_id: m.id, position })
    if (err) {
      setFilmError(err.code === '23514' ? 'Only listed films can go in a Selection.' : `That film did not get added: ${err.message}`)
      return
    }
    setItems((prev) => [...prev, { position, note: null, movie: m }])
    setResults((prev) => prev.filter((r) => r.id !== m.id))
  }

  async function removeFilm(movieId: string) {
    setFilmError(null)
    const { error: err } = await supabase.from('selection_items').delete().eq('selection_id', selection.id).eq('movie_id', movieId)
    if (err) { setFilmError(`That film did not come out: ${err.message}`); return }
    setItems((prev) => prev.filter((i) => i.movie.id !== movieId))
  }

  async function move(index: number, dir: -1 | 1) {
    const other = index + dir
    if (other < 0 || other >= items.length) return
    setFilmError(null)
    const a = items[index]
    const b = items[other]
    const [r1, r2] = await Promise.all([
      supabase.from('selection_items').update({ position: b.position }).eq('selection_id', selection.id).eq('movie_id', a.movie.id),
      supabase.from('selection_items').update({ position: a.position }).eq('selection_id', selection.id).eq('movie_id', b.movie.id),
    ])
    if (r1.error || r2.error) { setFilmError('The new order did not save. Tap the arrow again.'); return }
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...b, position: a.position }
      next[other] = { ...a, position: b.position }
      return next
    })
  }

  async function saveNote(movieId: string, note: string) {
    const value = note.trim().slice(0, 300) || null
    const { error: err } = await supabase.from('selection_items').update({ note: value }).eq('selection_id', selection.id).eq('movie_id', movieId)
    if (err) { setFilmError('That note did not save. Tap out of the box and try again.'); return }
    setItems((prev) => prev.map((i) => (i.movie.id === movieId ? { ...i, note: value } : i)))
  }

  async function deleteSelection() {
    if (!confirm('Delete this Selection and its film list? The films themselves are not touched.')) return
    const { error: err } = await supabase.from('selections').delete().eq('id', selection.id)
    if (err) { setError(`The Selection did not delete: ${err.message}`); return }
    router.push('/admin/selections')
  }

  return (
    <div style={{ display: 'grid', gap: '40px', maxWidth: '760px' }}>
      <section style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="s-title">Title</label>
            <input id="s-title" style={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="s-slug">Link name</label>
            <input id="s-slug" style={INPUT} value={slug} onChange={(e) => setSlug(e.target.value)} />
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6A6258' }}>muviestars.com/selections/{slug}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="s-intro">Introduction, in your words</label>
            <textarea id="s-intro" value={intro} maxLength={600} rows={3} onChange={(e) => setIntro(e.target.value)} style={{ ...INPUT, height: 'auto', padding: '10px 12px', lineHeight: 1.5, resize: 'vertical' }} />
          </div>
          <div>
            <label style={LABEL} htmlFor="s-label">Label</label>
            <select id="s-label" style={{ ...INPUT, cursor: 'pointer' }} value={label} onChange={(e) => setLabel(e.target.value)}>
              {SELECTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="s-period">Month</label>
            <input id="s-period" style={INPUT} value={period} placeholder="2026-10" onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div>
            <label style={LABEL} htmlFor="s-status">Status</label>
            <select id="s-status" style={{ ...INPUT, cursor: 'pointer' }} value={status} onChange={(e) => setStatus(e.target.value as SelectionData['status'])}>
              <option value="draft">Draft, only you see it</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="s-order">Order within the month</label>
            <input id="s-order" type="number" style={INPUT} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
        </div>

        {error && <p role="alert" style={{ margin: '16px 0 0', fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
        {saved && <p role="status" style={{ margin: '16px 0 0', fontSize: '14px', color: '#7FA88B' }}>{saved}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button onClick={saveDetails} disabled={isPending} style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
            {isPending ? 'Saving this Selection...' : 'Save this Selection'}
          </button>
          <button onClick={deleteSelection} style={{ ...SMALL_BTN, height: '40px', color: '#E58A7B' }}>Delete Selection</button>
        </div>
      </section>

      <section>
        <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#F6EFE2' }}>
          Films <span style={{ fontWeight: 400, color: '#8C857A' }}>({items.length})</span>
        </h2>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#8C857A' }}>
          Film changes save as you make them. Each film needs a note on why it is here, or a &ldquo;Why it&rsquo;s on MuvieStars&rdquo; line on the film itself, before you can publish. At least {MIN_SELECTION_FILMS} films.
        </p>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            style={INPUT}
            aria-label="Find a listed film"
            placeholder="Which listed film are you adding?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') search() }}
          />
          <button onClick={search} disabled={searching} style={{ ...SMALL_BTN, height: '40px', whiteSpace: 'nowrap' }}>{searching ? 'Looking...' : 'Find films'}</button>
        </div>

        {results.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, border: '1px solid rgba(237,228,210,0.1)', borderRadius: '10px' }}>
            {results.map((m) => (
              <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
                <span style={{ flex: 1, fontSize: '14px', color: '#EDE4D2' }}>{m.title} <span style={{ color: '#8C857A' }}>{m.release_year ?? ''}</span></span>
                <button onClick={() => addFilm(m)} style={SMALL_BTN}>Add</button>
              </li>
            ))}
          </ul>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p style={{ fontSize: '13px', color: '#8C857A', margin: '0 0 16px' }}>No other listed film matches that. Only listed films can go in a Selection.</p>
        )}
        {filmError && <p role="alert" style={{ margin: '0 0 12px', fontSize: '14px', color: '#E58A7B' }}>{filmError}</p>}

        <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map((it, i) => (
            <li key={it.movie.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
              <span style={{ width: '24px', paddingTop: '8px', fontSize: '13px', color: '#6A6258', fontFamily: '"Geist Mono", monospace' }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '14px', color: '#F6EFE2', paddingTop: '8px' }}>
                  {it.movie.title} <span style={{ color: '#8C857A' }}>{it.movie.release_year ?? ''}</span>
                  {it.movie.listing_status !== 'approved' && <span style={{ color: '#E58A7B' }}> (no longer listed, hidden from the Selection)</span>}
                </span>
                <textarea
                  aria-label={`Why ${it.movie.title} is in this Selection`}
                  defaultValue={it.note ?? ''}
                  maxLength={300}
                  rows={2}
                  placeholder={it.movie.why_listed ? `Leave blank to use: ${it.movie.why_listed.slice(0, 80)}` : 'Why is this film here? Be specific.'}
                  onBlur={(e) => saveNote(it.movie.id, e.target.value)}
                  style={{ ...INPUT, height: 'auto', padding: '8px 12px', marginTop: '6px', fontSize: '13px', lineHeight: 1.45, resize: 'vertical' }}
                />
              </span>
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${it.movie.title} up`} style={SMALL_BTN}>Up</button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${it.movie.title} down`} style={SMALL_BTN}>Down</button>
              <button onClick={() => removeFilm(it.movie.id)} aria-label={`Take ${it.movie.title} out`} style={{ ...SMALL_BTN, color: '#E58A7B' }}>Out</button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
