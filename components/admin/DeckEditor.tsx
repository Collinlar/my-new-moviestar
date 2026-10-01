'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MOOD_MAP } from '@/lib/mood'
import { MIN_DECK_FILMS } from '@/lib/decks-shared'

interface Item {
  position: number
  note: string | null
  movie: { id: string; title: string; release_year: number | null; poster_url: string | null; listing_status: string }
}

interface DeckData {
  id: string
  slug: string
  title: string
  description: string | null
  kind: 'curated' | 'mood'
  mood_slug: string | null
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  sponsor_name: string | null
  sponsor_url: string | null
  sort_order: number
  deck_items: Item[]
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

export function DeckEditor({ deck }: { deck: DeckData }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(deck.title)
  const [slug, setSlug] = useState(deck.slug)
  const [description, setDescription] = useState(deck.description ?? '')
  const [status, setStatus] = useState(deck.status)
  const [featured, setFeatured] = useState(deck.featured)
  const [sponsorName, setSponsorName] = useState(deck.sponsor_name ?? '')
  const [sponsorUrl, setSponsorUrl] = useState(deck.sponsor_url ?? '')
  const [sortOrder, setSortOrder] = useState(String(deck.sort_order))
  const [moodSlug, setMoodSlug] = useState(deck.mood_slug ?? '')
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [items, setItems] = useState<Item[]>([...deck.deck_items].sort((a, b) => a.position - b.position))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; title: string; release_year: number | null; poster_url: string | null; listing_status: string }>>([])
  const [searching, setSearching] = useState(false)
  const [filmError, setFilmError] = useState<string | null>(null)

  const listedCount = items.filter((i) => i.movie.listing_status === 'approved').length

  async function saveDetails() {
    setError(null); setSaved(null)
    if (!title.trim()) { setError('The deck needs a title.'); return }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) { setError('The link name can only use lowercase letters, numbers and single dashes.'); return }
    if (sponsorUrl.trim() && !sponsorName.trim()) { setError('Add the sponsor name, or clear the sponsor link. A sponsored deck always shows who sponsors it.'); return }
    if (sponsorUrl.trim() && !/^https?:\/\//i.test(sponsorUrl.trim())) { setError('The sponsor link has to start with https://'); return }
    if (status === 'published' && deck.kind === 'curated' && listedCount < MIN_DECK_FILMS) {
      setError(`Add at least ${MIN_DECK_FILMS} listed films before publishing this deck. It has ${listedCount}.`); return
    }
    if (deck.kind === 'mood' && !moodSlug) { setError('Pick which mood this deck wraps.'); return }

    startTransition(async () => {
      const { error: err } = await supabase
        .from('decks')
        .update({
          title: title.trim(),
          slug,
          description: description.trim() || null,
          status,
          featured,
          sponsor_name: sponsorName.trim() || null,
          sponsor_url: sponsorUrl.trim() || null,
          sort_order: Number(sortOrder) || 0,
          mood_slug: deck.kind === 'mood' ? moodSlug : null,
        })
        .eq('id', deck.id)
      if (err) {
        setError(err.code === '23505' ? 'Another deck already uses that link name.' : `The deck did not save: ${err.message}`)
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
      .select('id, title, release_year, poster_url, listing_status')
      .eq('listing_status', 'approved')
      .ilike('title', `%${q.replace(/[%_,()]/g, ' ')}%`)
      .order('title', { ascending: true })
      .limit(8)
    setSearching(false)
    if (err) { setFilmError('We could not search just now. Tap Find films again.'); return }
    const have = new Set(items.map((i) => i.movie.id))
    setResults(((data ?? []) as any[]).filter((m) => !have.has(m.id)))
  }

  async function addFilm(m: { id: string; title: string; release_year: number | null; poster_url: string | null; listing_status: string }) {
    setFilmError(null)
    const position = items.length > 0 ? Math.max(...items.map((i) => i.position)) + 1 : 1
    const { error: err } = await supabase.from('deck_items').insert({ deck_id: deck.id, movie_id: m.id, position })
    if (err) {
      setFilmError(err.code === '23514' ? 'Only listed films can go in a deck.' : `That film did not get added: ${err.message}`)
      return
    }
    setItems((prev) => [...prev, { position, note: null, movie: m }])
    setResults((prev) => prev.filter((r) => r.id !== m.id))
  }

  async function removeFilm(movieId: string) {
    setFilmError(null)
    const { error: err } = await supabase.from('deck_items').delete().eq('deck_id', deck.id).eq('movie_id', movieId)
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
      supabase.from('deck_items').update({ position: b.position }).eq('deck_id', deck.id).eq('movie_id', a.movie.id),
      supabase.from('deck_items').update({ position: a.position }).eq('deck_id', deck.id).eq('movie_id', b.movie.id),
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
    const value = note.trim().slice(0, 200) || null
    const { error: err } = await supabase.from('deck_items').update({ note: value }).eq('deck_id', deck.id).eq('movie_id', movieId)
    if (err) setFilmError('That note did not save. Tap out of the box and try again.')
  }

  async function deleteDeck() {
    if (!confirm('Delete this deck and its film list? The films themselves are not touched.')) return
    const { error: err } = await supabase.from('decks').delete().eq('id', deck.id)
    if (err) { setError(`The deck did not delete: ${err.message}`); return }
    router.push('/admin/decks')
  }

  return (
    <div style={{ display: 'grid', gap: '40px', maxWidth: '760px' }}>
      <section style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="d-title">Title</label>
            <input id="d-title" style={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="d-slug">Link name</label>
            <input id="d-slug" style={INPUT} value={slug} onChange={(e) => setSlug(e.target.value)} />
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6A6258' }}>muviestars.com/decks/{slug}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="d-desc">What is this deck about?</label>
            <textarea
              id="d-desc"
              value={description}
              maxLength={400}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...INPUT, height: 'auto', padding: '10px 12px', lineHeight: 1.5, resize: 'vertical' }}
            />
          </div>
          {deck.kind === 'mood' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL} htmlFor="d-mood">Mood</label>
              <select id="d-mood" style={{ ...INPUT, cursor: 'pointer' }} value={moodSlug} onChange={(e) => setMoodSlug(e.target.value)}>
                <option value="">Pick a mood</option>
                {Object.values(MOOD_MAP).map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={LABEL} htmlFor="d-status">Status</label>
            <select id="d-status" style={{ ...INPUT, cursor: 'pointer' }} value={status} onChange={(e) => setStatus(e.target.value as DeckData['status'])}>
              <option value="draft">Draft, only you see it</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div>
            <label style={LABEL} htmlFor="d-order">Order on the Decks page</label>
            <input id="d-order" type="number" style={INPUT} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', fontSize: '14px', color: '#EDE4D2', cursor: 'pointer' }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            Show on the homepage
          </label>

          <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
            <p style={{ margin: '12px 0 4px', fontSize: '13px', color: '#A39B8F', lineHeight: 1.5 }}>
              Sponsor (optional). The deck is labelled &ldquo;Sponsored by&rdquo; wherever it appears. A sponsor cannot add films that are not listed.
            </p>
          </div>
          <div>
            <label style={LABEL} htmlFor="d-sp-name">Sponsor name</label>
            <input id="d-sp-name" style={INPUT} value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} />
          </div>
          <div>
            <label style={LABEL} htmlFor="d-sp-url">Sponsor link</label>
            <input id="d-sp-url" style={INPUT} value={sponsorUrl} placeholder="https://" onChange={(e) => setSponsorUrl(e.target.value)} />
          </div>
        </div>

        {error && <p role="alert" style={{ margin: '16px 0 0', fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
        {saved && <p role="status" style={{ margin: '16px 0 0', fontSize: '14px', color: '#7FA88B' }}>{saved}</p>}

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={saveDetails}
            disabled={isPending}
            style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
          >
            {isPending ? 'Saving this deck...' : 'Save this deck'}
          </button>
          <button onClick={deleteDeck} style={{ ...SMALL_BTN, height: '40px', color: '#E58A7B' }}>Delete deck</button>
        </div>
      </section>

      {deck.kind === 'curated' ? (
        <section>
          <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#F6EFE2' }}>
            Films <span style={{ fontWeight: 400, color: '#8C857A' }}>({items.length})</span>
          </h2>
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#8C857A' }}>
            Film changes save as you make them. A deck needs {MIN_DECK_FILMS} listed films before it can be published.
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
            <button onClick={search} disabled={searching} style={{ ...SMALL_BTN, height: '40px', whiteSpace: 'nowrap' }}>
              {searching ? 'Looking...' : 'Find films'}
            </button>
          </div>

          {results.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, border: '1px solid rgba(237,228,210,0.1)', borderRadius: '10px' }}>
              {results.map((m) => (
                <li key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
                  <span style={{ flex: 1, fontSize: '14px', color: '#EDE4D2' }}>
                    {m.title} <span style={{ color: '#8C857A' }}>{m.release_year ?? ''}</span>
                  </span>
                  <button onClick={() => addFilm(m)} style={SMALL_BTN}>Add</button>
                </li>
              ))}
            </ul>
          )}
          {query.trim().length >= 2 && !searching && results.length === 0 && (
            <p style={{ fontSize: '13px', color: '#8C857A', margin: '0 0 16px' }}>No other listed film matches that. Only listed films can go in a deck.</p>
          )}

          {filmError && <p role="alert" style={{ margin: '0 0 12px', fontSize: '14px', color: '#E58A7B' }}>{filmError}</p>}

          <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {items.map((it, i) => (
              <li key={it.movie.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                <span style={{ width: '24px', fontSize: '13px', color: '#6A6258', fontFamily: '"Geist Mono", monospace' }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '14px', color: '#F6EFE2' }}>
                    {it.movie.title} <span style={{ color: '#8C857A' }}>{it.movie.release_year ?? ''}</span>
                    {it.movie.listing_status !== 'approved' && <span style={{ color: '#E58A7B' }}> (no longer listed, hidden from the deck)</span>}
                  </span>
                  <input
                    aria-label={`Note for ${it.movie.title}`}
                    defaultValue={it.note ?? ''}
                    maxLength={200}
                    placeholder="Why is this film here? (optional)"
                    onBlur={(e) => saveNote(it.movie.id, e.target.value)}
                    style={{ ...INPUT, height: '34px', marginTop: '6px', fontSize: '13px' }}
                  />
                </span>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${it.movie.title} up`} style={SMALL_BTN}>Up</button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move ${it.movie.title} down`} style={SMALL_BTN}>Down</button>
                <button onClick={() => removeFilm(it.movie.id)} aria-label={`Take ${it.movie.title} out`} style={{ ...SMALL_BTN, color: '#E58A7B' }}>Out</button>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p style={{ fontSize: '14px', color: '#8C857A', lineHeight: 1.6 }}>
          This deck wraps a mood, so its films are chosen by the mood&rsquo;s rules each time someone swipes it. Only listed films are ever used.
        </p>
      )}
    </div>
  )
}
