'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CHALLENGE_DEFAULT_DAYS } from '@/lib/challenges-shared'
import type { CycleOption, DeckOption } from '@/lib/admin-challenges'

interface ChallengeRow {
  id: string
  slug: string
  title: string
  description: string | null
  kind: 'deck' | 'club_paired'
  deck_id: string
  club_cycle_id: string | null
  goal: number
  starts_at: string
  ends_at: string
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  sponsor_name: string | null
  sponsor_url: string | null
  sort_order: number
}

interface Props {
  challenge: ChallengeRow | null
  decks: DeckOption[]
  cycles: CycleOption[]
  stats: { joined: number; completed: number } | null
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

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

// <input type="datetime-local"> works in local time without a zone: 2026-10-14T09:00
const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

function defaultWindow() {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + CHALLENGE_DEFAULT_DAYS * 86_400_000)
  return { starts: toLocalInput(start), ends: toLocalInput(end) }
}

export function ChallengeEditor({ challenge, decks, cycles, stats }: Props) {
  const router = useRouter()
  const supabase = createClient() as any
  const [isPending, startTransition] = useTransition()
  const w = defaultWindow()

  const [title, setTitle] = useState(challenge?.title ?? '')
  const [slug, setSlug] = useState(challenge?.slug ?? '')
  const [description, setDescription] = useState(challenge?.description ?? '')
  const [kind, setKind] = useState<'deck' | 'club_paired'>(challenge?.kind ?? 'deck')
  const [deckId, setDeckId] = useState(challenge?.deck_id ?? '')
  const [cycleId, setCycleId] = useState(challenge?.club_cycle_id ?? '')
  const [goal, setGoal] = useState(String(challenge?.goal ?? 3))
  const [starts, setStarts] = useState(challenge ? toLocalInput(new Date(challenge.starts_at)) : w.starts)
  const [ends, setEnds] = useState(challenge ? toLocalInput(new Date(challenge.ends_at)) : w.ends)
  const [status, setStatus] = useState(challenge?.status ?? 'draft')
  const [featured, setFeatured] = useState(challenge?.featured ?? false)
  const [sponsorName, setSponsorName] = useState(challenge?.sponsor_name ?? '')
  const [sponsorUrl, setSponsorUrl] = useState(challenge?.sponsor_url ?? '')
  const [sortOrder, setSortOrder] = useState(String(challenge?.sort_order ?? 0))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const deck = decks.find((d) => d.id === deckId)

  function save() {
    setError(null); setSaved(null)
    const goalNum = Number(goal)
    const finalSlug = slug || slugify(title)
    if (!title.trim()) { setError('The challenge needs a title.'); return }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(finalSlug)) { setError('The link name can only use lowercase letters, numbers and single dashes.'); return }
    if (!deckId) { setError('Pick the deck this challenge is built on.'); return }
    if (!Number.isInteger(goalNum) || goalNum < 1 || goalNum > 50) { setError('The goal has to be a whole number from 1 to 50.'); return }
    if (deck && goalNum > deck.listed) { setError(`That deck has ${deck.listed} listed films, so the goal cannot be ${goalNum}.`); return }
    if (kind === 'club_paired' && !cycleId) { setError('Pick which Club cycle film people also have to take.'); return }
    const s = new Date(starts)
    const e = new Date(ends)
    if (isNaN(+s) || isNaN(+e)) { setError('Set both a start and an end.'); return }
    if (e <= s) { setError('The challenge has to end after it starts.'); return }
    if (+e - +s > 120 * 86_400_000) { setError('A challenge can run for at most 120 days.'); return }
    if (sponsorUrl.trim() && !sponsorName.trim()) { setError('Add the sponsor name, or clear the sponsor link. A sponsored challenge always shows who sponsors it.'); return }
    if (sponsorUrl.trim() && !/^https?:\/\//i.test(sponsorUrl.trim())) { setError('The sponsor link has to start with https://'); return }

    const payload = {
      title: title.trim(),
      slug: finalSlug,
      description: description.trim() || null,
      kind,
      deck_id: deckId,
      club_cycle_id: kind === 'club_paired' ? cycleId : null,
      goal: goalNum,
      starts_at: s.toISOString(),
      ends_at: e.toISOString(),
      status,
      featured,
      sponsor_name: sponsorName.trim() || null,
      sponsor_url: sponsorUrl.trim() || null,
      sort_order: Number(sortOrder) || 0,
    }

    startTransition(async () => {
      if (challenge) {
        const { error: err } = await supabase.from('challenges').update(payload).eq('id', challenge.id)
        if (err) { setError(explain(err)); return }
        setSaved('Saved.')
        router.refresh()
      } else {
        const { data, error: err } = await supabase.from('challenges').insert(payload).select('id').single()
        if (err) { setError(explain(err)); return }
        router.push(`/admin/challenges/${data.id}`)
      }
    })
  }

  async function remove() {
    if (!challenge) return
    if (!confirm('Delete this challenge? People who joined lose their progress and any laurels earned from it are removed.')) return
    const { error: err } = await supabase.from('challenges').delete().eq('id', challenge.id)
    if (err) { setError(`The challenge did not delete: ${err.message}`); return }
    router.push('/admin/challenges')
  }

  return (
    <div style={{ maxWidth: '760px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B' }}>
      {stats && (
        <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#A39B8F' }}>
          {stats.joined} {stats.joined === 1 ? 'person has' : 'people have'} joined. {stats.completed} {stats.completed === 1 ? 'has' : 'have'} finished.
        </p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL} htmlFor="c-title">Title</label>
          <input id="c-title" style={INPUT} value={title} placeholder="What is this challenge called?" onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL} htmlFor="c-slug">Link name</label>
          <input id="c-slug" style={INPUT} value={slug} placeholder={slugify(title) || 'three-from-lagos'} onChange={(e) => setSlug(slugify(e.target.value))} />
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#6A6258' }}>muviestars.com/challenges/{slug || slugify(title) || '...'}</p>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL} htmlFor="c-desc">What is it about?</label>
          <textarea id="c-desc" value={description} maxLength={400} rows={3} onChange={(e) => setDescription(e.target.value)} style={{ ...INPUT, height: 'auto', padding: '10px 12px', lineHeight: 1.5, resize: 'vertical' }} />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={LABEL} htmlFor="c-deck">Built on this deck</label>
          <select id="c-deck" style={{ ...INPUT, cursor: 'pointer' }} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
            <option value="">Pick a published deck</option>
            {decks.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.listed} listed films)</option>)}
          </select>
          {decks.length === 0 && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#E58A7B' }}>No published hand-picked decks yet. Publish one first.</p>}
        </div>

        <div>
          <label style={LABEL} htmlFor="c-kind">Kind</label>
          <select id="c-kind" style={{ ...INPUT, cursor: 'pointer' }} value={kind} onChange={(e) => setKind(e.target.value as 'deck' | 'club_paired')}>
            <option value="deck">Deck only</option>
            <option value="club_paired">Deck plus a Club film</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="c-goal">Films to take</label>
          <input id="c-goal" type="number" min={1} max={50} style={INPUT} value={goal} onChange={(e) => setGoal(e.target.value)} />
        </div>
        {kind === 'club_paired' && (
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={LABEL} htmlFor="c-cycle">Club film they also take</label>
            <select id="c-cycle" style={{ ...INPUT, cursor: 'pointer' }} value={cycleId} onChange={(e) => setCycleId(e.target.value)}>
              <option value="">Pick a Club cycle</option>
              {cycles.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        )}

        <div>
          <label style={LABEL} htmlFor="c-start">Opens</label>
          <input id="c-start" type="datetime-local" style={INPUT} value={starts} onChange={(e) => setStarts(e.target.value)} />
        </div>
        <div>
          <label style={LABEL} htmlFor="c-end">Closes</label>
          <input id="c-end" type="datetime-local" style={INPUT} value={ends} onChange={(e) => setEnds(e.target.value)} />
        </div>

        <div>
          <label style={LABEL} htmlFor="c-status">Status</label>
          <select id="c-status" style={{ ...INPUT, cursor: 'pointer' }} value={status} onChange={(e) => setStatus(e.target.value as ChallengeRow['status'])}>
            <option value="draft">Draft, only you see it</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label style={LABEL} htmlFor="c-order">Order</label>
          <input id="c-order" type="number" style={INPUT} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </div>
        <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '44px', fontSize: '14px', color: '#EDE4D2', cursor: 'pointer' }}>
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} style={{ width: '18px', height: '18px' }} />
          Show on the homepage
        </label>

        <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
          <p style={{ margin: '12px 0 4px', fontSize: '13px', color: '#A39B8F', lineHeight: 1.5 }}>
            Sponsor (optional). The challenge is labelled &ldquo;Sponsored by&rdquo; wherever it appears, including on the laurel. A sponsor cannot add films that are not listed.
          </p>
        </div>
        <div>
          <label style={LABEL} htmlFor="c-sp-name">Sponsor name</label>
          <input id="c-sp-name" style={INPUT} value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} />
        </div>
        <div>
          <label style={LABEL} htmlFor="c-sp-url">Sponsor link</label>
          <input id="c-sp-url" style={INPUT} value={sponsorUrl} placeholder="https://" onChange={(e) => setSponsorUrl(e.target.value)} />
        </div>
      </div>

      {error && <p role="alert" style={{ margin: '16px 0 0', fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
      {saved && <p role="status" style={{ margin: '16px 0 0', fontSize: '14px', color: '#7FA88B' }}>{saved}</p>}

      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={save}
          disabled={isPending}
          style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? 'Saving this challenge...' : challenge ? 'Save this challenge' : 'Start this challenge'}
        </button>
        {challenge && (
          <button onClick={remove} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(237,228,210,0.15)', color: '#E58A7B', fontSize: '14px', cursor: 'pointer' }}>
            Delete challenge
          </button>
        )}
      </div>
    </div>
  )
}

function explain(err: { code?: string; message: string }): string {
  if (err.code === '23505') return 'Another challenge already uses that link name.'
  // The database's own messages for publishing rules are already written for people.
  if (err.code === '23514' && !/violates check constraint/.test(err.message)) return err.message
  if (/challenges_window_valid/.test(err.message)) return 'A challenge has to end after it starts and run for at most 120 days.'
  return `The challenge did not save: ${err.message}`
}
