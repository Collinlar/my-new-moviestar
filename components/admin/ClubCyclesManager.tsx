'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Cycle {
  id: string
  cycle_number: number
  title_override?: string
  starts_at: string
  ends_at: string
  status: 'upcoming' | 'active' | 'completed'
  movie?: { id: string; title: string; poster_url?: string; release_year?: number }
}

interface MovieOption {
  id: string
  title: string
  release_year?: number
  poster_url?: string
}

interface Props {
  cycles: Cycle[]
  movieOptions: MovieOption[]
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  upcoming:  { bg: 'rgba(143,168,200,0.12)', color: '#8FA8C8', label: 'Upcoming'  },
  active:    { bg: 'rgba(127,168,139,0.12)', color: '#7FA88B', label: 'Active'    },
  completed: { bg: 'rgba(163,155,143,0.10)', color: '#A39B8F', label: 'Completed' },
}

const EMPTY_FORM = {
  cycle_number: '',
  movie_id: '',
  title_override: '',
  starts_at: '',
  ends_at: '',
  status: 'upcoming',
}

export function ClubCyclesManager({ cycles: initialCycles, movieOptions }: Props) {
  const [cycles, setCycles]         = useState<Cycle[]>(initialCycles)
  const [showForm, setShowForm]     = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [form, setForm]             = useState<typeof EMPTY_FORM>(EMPTY_FORM)
  const [error, setError]           = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient() as any
  const router   = useRouter()

  function openAdd() {
    setEditId(null)
    const nextNum = cycles.length > 0 ? Math.max(...cycles.map(c => c.cycle_number)) + 1 : 1
    setForm({ ...EMPTY_FORM, cycle_number: String(nextNum) })
    setShowForm(true)
    setError(null)
  }

  function openEdit(c: Cycle) {
    setEditId(c.id)
    setForm({
      cycle_number:   String(c.cycle_number),
      movie_id:       c.movie?.id ?? '',
      title_override: c.title_override ?? '',
      starts_at:      c.starts_at.slice(0, 16),
      ends_at:        c.ends_at.slice(0, 16),
      status:         c.status,
    })
    setShowForm(true)
    setError(null)
  }

  function cancel() {
    setShowForm(false)
    setEditId(null)
    setError(null)
  }

  async function save() {
    setError(null)
    if (!form.movie_id)   { setError('Pick a film for this cycle.');       return }
    if (!form.starts_at)  { setError('Set a start date.');                 return }
    if (!form.ends_at)    { setError('Set an end date.');                  return }
    if (form.ends_at <= form.starts_at) { setError('End must be after start.'); return }

    const payload = {
      cycle_number:   Number(form.cycle_number),
      movie_id:       form.movie_id,
      title_override: form.title_override.trim() || null,
      starts_at:      new Date(form.starts_at).toISOString(),
      ends_at:        new Date(form.ends_at).toISOString(),
      status:         form.status,
    }

    startTransition(async () => {
      if (editId) {
        const { error: err } = await supabase.from('club_cycles').update(payload).eq('id', editId)
        if (err) { setError(err.message); return }
      } else {
        const { error: err } = await supabase.from('club_cycles').insert(payload)
        if (err) { setError(err.message); return }
      }
      setShowForm(false)
      setEditId(null)
      router.refresh()
    })
  }

  async function updateStatus(id: string, status: Cycle['status']) {
    if (status === 'active') {
      await supabase.from('club_cycles').update({ status: 'completed' }).eq('status', 'active').neq('id', id)
    }
    const { error: err } = await supabase.from('club_cycles').update({ status }).eq('id', id)
    if (err) { setError(err.message); return }
    setCycles(prev => prev.map(c => {
      if (status === 'active' && c.status === 'active' && c.id !== id) return { ...c, status: 'completed' }
      if (c.id === id) return { ...c, status }
      return c
    }))
  }

  async function deleteCycle(id: string) {
    if (!confirm('Delete this cycle? This cannot be undone.')) return
    const { error: err } = await supabase.from('club_cycles').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setCycles(prev => prev.filter(c => c.id !== id))
  }

  const INPUT: React.CSSProperties = {
    width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
    border: '1px solid rgba(237,228,210,0.12)', background: '#15120E',
    color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  }
  const LABEL: React.CSSProperties = {
    display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: '#6A6258', marginBottom: '6px',
    fontFamily: '"Geist Mono", monospace',
  }

  return (
    <div>
      {/* Add button */}
      {!showForm && (
        <button
          onClick={openAdd}
          style={{
            height: '40px', padding: '0 20px', borderRadius: '10px',
            background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
            color: '#C8963E', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            marginBottom: '28px', fontFamily: '"Geist Mono", monospace',
          }}
        >
          + Add cycle
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div style={{
          marginBottom: '32px', padding: '24px', borderRadius: '16px',
          border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B',
        }}>
          <p style={{ margin: '0 0 20px', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>
            {editId ? 'Edit cycle' : 'New cycle'}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            <div>
              <label style={LABEL}>Cycle number</label>
              <input
                type="number"
                style={INPUT}
                value={form.cycle_number}
                onChange={e => setForm(f => ({ ...f, cycle_number: e.target.value }))}
              />
            </div>

            <div>
              <label style={LABEL}>Status</label>
              <select
                style={{ ...INPUT, cursor: 'pointer' }}
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>Film</label>
              <select
                style={{ ...INPUT, height: '44px', cursor: 'pointer' }}
                value={form.movie_id}
                onChange={e => setForm(f => ({ ...f, movie_id: e.target.value }))}
              >
                <option value="">Pick a film...</option>
                {movieOptions.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.title}{m.release_year ? ` (${m.release_year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={LABEL}>Title override (optional)</label>
              <input
                type="text"
                style={INPUT}
                value={form.title_override}
                placeholder="Displayed as the cycle name if set"
                onChange={e => setForm(f => ({ ...f, title_override: e.target.value }))}
              />
            </div>

            <div>
              <label style={LABEL}>Starts</label>
              <input
                type="datetime-local"
                style={INPUT}
                value={form.starts_at}
                onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))}
              />
            </div>

            <div>
              <label style={LABEL}>Ends</label>
              <input
                type="datetime-local"
                style={INPUT}
                value={form.ends_at}
                onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <p style={{ margin: '12px 0 0', fontSize: '13px', color: '#E0735A' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={save}
              disabled={isPending}
              style={{
                height: '40px', padding: '0 20px', borderRadius: '10px',
                background: isPending ? 'rgba(127,168,139,0.15)' : 'rgba(127,168,139,0.2)',
                border: '1px solid rgba(127,168,139,0.3)',
                color: '#7FA88B', fontSize: '14px', fontWeight: 600,
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              {isPending ? 'Saving...' : editId ? 'Save changes' : 'Create cycle'}
            </button>
            <button
              onClick={cancel}
              style={{
                height: '40px', padding: '0 16px', borderRadius: '10px',
                border: '1px solid rgba(237,228,210,0.1)', background: 'transparent',
                color: '#6A6258', fontSize: '14px', cursor: 'pointer',
                fontFamily: '"Geist Mono", monospace',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cycles list */}
      {cycles.length === 0 ? (
        <div style={{
          padding: '48px 24px', borderRadius: '16px',
          border: '1px solid rgba(237,228,210,0.06)',
          textAlign: 'center', color: '#6A6258', fontSize: '15px',
        }}>
          No club cycles yet. Add the first one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cycles.map(c => {
            const st = STATUS_STYLES[c.status]
            const movieTitle = c.movie?.title ?? 'Unknown film'
            const startDate = new Date(c.starts_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            const endDate   = new Date(c.ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

            return (
              <div
                key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', borderRadius: '14px',
                  background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)',
                }}
              >
                {/* Poster thumb */}
                <div style={{
                  width: '44px', height: '60px', borderRadius: '8px', flexShrink: 0,
                  background: '#15120E', overflow: 'hidden',
                }}>
                  {c.movie?.poster_url ? (
                    <img src={c.movie.poster_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', opacity: 0.3 }}>🎬</div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{
                      fontFamily: '"Geist Mono", monospace', fontSize: '11px', fontWeight: 700,
                      color: '#C8963E', letterSpacing: '0.1em',
                    }}>
                      CYCLE {c.cycle_number}
                    </span>
                    <span style={{
                      height: '22px', padding: '0 10px', borderRadius: '999px',
                      background: st.bg, color: st.color, fontSize: '11px', fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center',
                      fontFamily: '"Geist Mono", monospace',
                    }}>
                      {st.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#F6EFE2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.title_override || movieTitle}
                  </p>
                  {c.title_override && (
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6A6258' }}>{movieTitle}</p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6A6258', fontFamily: '"Geist Mono", monospace' }}>
                    {startDate} — {endDate}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {c.status !== 'active' && (
                    <button
                      onClick={() => updateStatus(c.id, 'active')}
                      title="Set as active"
                      style={{
                        height: '32px', padding: '0 12px', borderRadius: '8px',
                        background: 'rgba(127,168,139,0.12)', border: '1px solid rgba(127,168,139,0.25)',
                        color: '#7FA88B', fontSize: '12px', cursor: 'pointer',
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      Set active
                    </button>
                  )}
                  {c.status === 'active' && (
                    <button
                      onClick={() => updateStatus(c.id, 'completed')}
                      title="Mark completed"
                      style={{
                        height: '32px', padding: '0 12px', borderRadius: '8px',
                        background: 'rgba(163,155,143,0.1)', border: '1px solid rgba(163,155,143,0.2)',
                        color: '#A39B8F', fontSize: '12px', cursor: 'pointer',
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(c)}
                    style={{
                      height: '32px', width: '32px', borderRadius: '8px',
                      border: '1px solid rgba(237,228,210,0.1)', background: 'transparent',
                      color: '#8C857A', fontSize: '14px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Edit cycle"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteCycle(c.id)}
                    style={{
                      height: '32px', width: '32px', borderRadius: '8px',
                      border: '1px solid rgba(224,115,90,0.15)', background: 'transparent',
                      color: '#8C4A3A', fontSize: '14px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                    title="Delete cycle"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
