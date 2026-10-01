'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SELECTION_LABELS } from '@/lib/selections-shared'

interface Row {
  id: string
  slug: string
  title: string
  label: string
  period: string | null
  status: 'draft' | 'published' | 'archived'
  selection_items?: Array<{ count: number }>
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

const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function SelectionsManager({ selections }: { selections: Row[] }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [show, setShow] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [label, setLabel] = useState<string>(SELECTION_LABELS[0])
  const [period, setPeriod] = useState(thisMonth())
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function create() {
    setError(null)
    const finalSlug = slug || slugify(title)
    if (!title.trim()) { setError('Give the Selection a title.'); return }
    if (!finalSlug) { setError('The link name needs letters or numbers.'); return }
    if (period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) { setError('Set the month as year and month, like 2026-10.'); return }
    startTransition(async () => {
      const { data, error: err } = await supabase
        .from('selections')
        .insert({ title: title.trim(), slug: finalSlug, label, period: period || null, status: 'draft' })
        .select('id')
        .single()
      if (err) {
        setError(err.code === '23505' ? 'Another Selection already uses that link name. Change it and save again.' : `The Selection did not save: ${err.message}`)
        return
      }
      router.push(`/admin/selections/${data.id}`)
    })
  }

  return (
    <div>
      {!show && (
        <button
          onClick={() => setShow(true)}
          style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)', color: '#C8963E', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '28px', fontFamily: '"Geist Mono", monospace' }}
        >
          + Start a Selection
        </button>
      )}

      {show && (
        <div style={{ marginBottom: '32px', padding: '24px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B', maxWidth: '640px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL} htmlFor="sel-title">Title</label>
              <input id="sel-title" style={INPUT} value={title} placeholder="What is this Selection called?" onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL} htmlFor="sel-slug">Link name</label>
              <input id="sel-slug" style={INPUT} value={slug} placeholder={slugify(title) || 'october-2026'} onChange={(e) => setSlug(slugify(e.target.value))} />
            </div>
            <div>
              <label style={LABEL} htmlFor="sel-label">Label</label>
              <select id="sel-label" style={{ ...INPUT, cursor: 'pointer' }} value={label} onChange={(e) => setLabel(e.target.value)}>
                {SELECTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL} htmlFor="sel-period">Month</label>
              <input id="sel-period" style={INPUT} value={period} placeholder="2026-10" onChange={(e) => setPeriod(e.target.value)} />
            </div>
          </div>
          {error && <p role="alert" style={{ margin: '16px 0 0', fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button onClick={create} disabled={isPending} style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: isPending ? 0.6 : 1 }}>
              {isPending ? 'Starting your Selection...' : 'Start this Selection'}
            </button>
            <button onClick={() => { setShow(false); setError(null) }} style={{ height: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(237,228,210,0.15)', color: '#A39B8F', fontSize: '14px', cursor: 'pointer' }}>
              Not now
            </button>
          </div>
        </div>
      )}

      {selections.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#8C857A' }}>No Selections yet. Start one, add at least 3 listed films with a note on each, then publish it.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '860px' }}>
          {selections.map((s) => {
            const st = STATUS_STYLES[s.status]
            return (
              <li key={s.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                <Link href={`/admin/selections/${s.id}`} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 0', textDecoration: 'none', minHeight: '44px' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>{s.title}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#8C857A', fontFamily: '"Geist Mono", monospace' }}>
                      {s.label}{s.period ? ` · ${s.period}` : ''} · {s.selection_items?.[0]?.count ?? 0} films
                    </span>
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', background: st.bg, color: st.color }}>{s.status}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
