'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MOOD_MAP } from '@/lib/mood'

interface DeckRow {
  id: string
  slug: string
  title: string
  kind: 'curated' | 'mood'
  mood_slug: string | null
  status: 'draft' | 'published' | 'archived'
  featured: boolean
  sponsor_name: string | null
  deck_items?: Array<{ count: number }>
}

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft:     { bg: 'rgba(143,168,200,0.12)', color: '#8FA8C8' },
  published: { bg: 'rgba(127,168,139,0.12)', color: '#7FA88B' },
  archived:  { bg: 'rgba(163,155,143,0.10)', color: '#A39B8F' },
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

export function DecksManager({ decks }: { decks: DeckRow[] }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [kind, setKind] = useState<'curated' | 'mood'>('curated')
  const [moodSlug, setMoodSlug] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function create() {
    setError(null)
    const finalSlug = slug || slugify(title)
    if (!title.trim()) { setError('Give the deck a title.'); return }
    if (!finalSlug) { setError('The link name needs letters or numbers.'); return }
    if (kind === 'mood' && !moodSlug) { setError('Pick which mood this deck wraps.'); return }

    startTransition(async () => {
      const { data, error: err } = await supabase
        .from('decks')
        .insert({
          title: title.trim(),
          slug: finalSlug,
          kind,
          mood_slug: kind === 'mood' ? moodSlug : null,
          status: 'draft',
        })
        .select('id')
        .single()
      if (err) {
        setError(err.code === '23505' ? 'Another deck already uses that link name. Change it and save again.' : `The deck did not save: ${err.message}`)
        return
      }
      router.push(`/admin/decks/${data.id}`)
    })
  }

  return (
    <div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          style={{
            height: '40px', padding: '0 20px', borderRadius: '10px', background: 'rgba(200,150,62,0.15)',
            border: '1px solid rgba(200,150,62,0.3)', color: '#C8963E', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', marginBottom: '28px', fontFamily: '"Geist Mono", monospace',
          }}
        >
          + Start a deck
        </button>
      )}

      {showForm && (
        <div style={{ marginBottom: '32px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B', maxWidth: '640px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL} htmlFor="deck-title">Title</label>
              <input
                id="deck-title"
                style={INPUT}
                value={title}
                placeholder="What is this deck called?"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL} htmlFor="deck-slug">Link name</label>
              <input
                id="deck-slug"
                style={INPUT}
                value={slug}
                placeholder={slugify(title) || 'ghana-heist-films'}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
            </div>
            <div>
              <label style={LABEL} htmlFor="deck-kind">Kind</label>
              <select id="deck-kind" style={{ ...INPUT, cursor: 'pointer' }} value={kind} onChange={(e) => setKind(e.target.value as 'curated' | 'mood')}>
                <option value="curated">Hand-picked films</option>
                <option value="mood">Wraps a mood</option>
              </select>
            </div>
            {kind === 'mood' && (
              <div>
                <label style={LABEL} htmlFor="deck-mood">Mood</label>
                <select id="deck-mood" style={{ ...INPUT, cursor: 'pointer' }} value={moodSlug} onChange={(e) => setMoodSlug(e.target.value)}>
                  <option value="">Pick a mood</option>
                  {Object.values(MOOD_MAP).map((m) => <option key={m.slug} value={m.slug}>{m.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && <p role="alert" style={{ margin: '16px 0 0', fontSize: '14px', color: '#E58A7B' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={create}
              disabled={isPending}
              style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}
            >
              {isPending ? 'Starting your deck...' : 'Start this deck'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(237,228,210,0.15)', color: '#A39B8F', fontSize: '14px', cursor: 'pointer' }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {decks.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#8C857A' }}>No decks yet. Start one above, add listed films, then publish it.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '860px' }}>
          {decks.map((d) => {
            const st = STATUS_STYLES[d.status]
            const count = d.deck_items?.[0]?.count ?? 0
            return (
              <li key={d.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                <Link href={`/admin/decks/${d.id}`} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 0', textDecoration: 'none', minHeight: '44px' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>{d.title}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#8C857A', fontFamily: '"Geist Mono", monospace' }}>
                      /decks/{d.slug} · {d.kind === 'mood' ? `mood: ${MOOD_MAP[d.mood_slug ?? '']?.label ?? d.mood_slug}` : `${count} films`}
                      {d.sponsor_name ? ` · sponsored by ${d.sponsor_name}` : ''}
                      {d.featured ? ' · featured' : ''}
                    </span>
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', background: st.bg, color: st.color }}>{d.status}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
