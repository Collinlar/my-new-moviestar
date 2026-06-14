'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Trophy } from 'lucide-react'
import { toast } from 'sonner'

interface Award { id: string; name: string; category: string; year: number; won: boolean }
interface MovieOption { id: string; title: string; release_year: number }

const AWARD_NAMES = [
  'Africa Movie Academy Awards (AMAA)',
  'African Magic Viewers Choice Awards (AMVCA)',
  'Ghana Movie Awards',
  'Golden Horn Awards',
  'Nollywood & African Film Critics Awards (NAFCA)',
  'Cannes Film Festival',
  'Toronto International Film Festival (TIFF)',
  'Tribeca Film Festival',
  'Berlin International Film Festival',
  'Sundance Film Festival',
  'Other',
]

const blank = { name: '', category: '', year: new Date().getFullYear(), won: false }

interface Props { movies: MovieOption[] }

export function AwardsManager({ movies }: Props) {
  const [movieId, setMovieId]   = useState('')
  const [awards, setAwards]     = useState<Award[]>([])
  const [loading, setLoading]   = useState(false)
  const [adding, setAdding]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState({ ...blank })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient() as any

  useEffect(() => {
    if (!movieId) { setAwards([]); return }
    setLoading(true)
    supabase.from('movie_awards').select('*').eq('movie_id', movieId).order('year', { ascending: false })
      .then(({ data }: { data: Award[] }) => { setAwards(data || []); setLoading(false) })
  }, [movieId])

  const startAdd = () => { setForm({ ...blank }); setEditId(null); setAdding(true) }
  const startEdit = (a: Award) => { setForm({ name: a.name, category: a.category, year: a.year, won: a.won }); setAdding(false); setEditId(a.id) }
  const cancel = () => { setAdding(false); setEditId(null) }

  const save = async () => {
    if (!form.name || !form.category || !form.year) { toast.error('Name, category and year are required'); return }
    setSaving(true)
    const payload = { movie_id: movieId, name: form.name, category: form.category.trim(), year: Number(form.year), won: form.won }

    if (editId) {
      const { error } = await supabase.from('movie_awards').update(payload).eq('id', editId)
      if (error) { toast.error('Could not update'); setSaving(false); return }
      setAwards(p => p.map(a => a.id === editId ? { ...a, ...payload } : a))
      toast.success('Award updated')
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('movie_awards').insert(payload).select().single()
      if (error) { toast.error('Could not add award'); setSaving(false); return }
      setAwards(p => [data as Award, ...p])
      toast.success('Award added')
      setAdding(false)
    }
    setSaving(false)
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" award entry?`)) return
    setDeleting(id)
    const { error } = await supabase.from('movie_awards').delete().eq('id', id)
    if (error) { toast.error('Could not delete'); setDeleting(null); return }
    setAwards(p => p.filter(a => a.id !== id))
    toast.success('Award removed')
    setDeleting(null)
  }

  const ic = 'cinema-input text-sm py-2'

  const AwardForm = () => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-film-muted mb-1">Festival / Award name *</label>
          <select className={ic} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}>
            <option value="">Select award</option>
            {AWARD_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Category *</label>
          <input className={ic} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Best Picture" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Year *</label>
          <input className={ic} type="number" min="1980" max="2030" value={form.year}
            onChange={e => setForm(p => ({ ...p, year: Number(e.target.value) }))} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.won} onChange={e => setForm(p => ({ ...p, won: e.target.checked }))}
              className="w-4 h-4 rounded accent-film-gold" />
            <span className="text-sm text-film-cream">Won (not just nominated)</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving...' : editId ? 'Save changes' : 'Add award'}
        </button>
        <button onClick={cancel} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Movie selector */}
      <div>
        <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">Select movie</label>
        <select className={ic} value={movieId} onChange={e => { setMovieId(e.target.value); setAdding(false); setEditId(null) }}>
          <option value="">Choose a movie...</option>
          {movies.map(m => <option key={m.id} value={m.id}>{m.title} ({m.release_year})</option>)}
        </select>
      </div>

      {!movieId ? (
        <div className="cinema-card p-10 text-center text-film-muted text-sm">
          Select a movie above to manage its awards and nominations.
        </div>
      ) : (
        <div className="cinema-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-cinema-border">
            <span className="text-sm text-film-muted">{awards.length} {awards.length === 1 ? 'entry' : 'entries'}</span>
            {!adding && !editId && (
              <button onClick={startAdd} className="btn-gold py-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" /> Add award
              </button>
            )}
          </div>

          {adding && <AwardForm />}

          {loading ? (
            <div className="py-10 text-center text-film-muted text-sm">Loading...</div>
          ) : awards.length === 0 && !adding ? (
            <div className="py-12 text-center text-film-muted text-sm">No awards or nominations recorded for this film.</div>
          ) : (
            <div className="divide-y divide-cinema-border">
              {awards.map(award => (
                <div key={award.id}>
                  {editId === award.id ? <AwardForm /> : (
                    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cinema-surface/40 transition-colors group">
                      <Trophy className={`w-4 h-4 shrink-0 ${award.won ? 'text-film-gold' : 'text-film-subtle'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-film-cream text-sm">
                          {award.category}
                          {award.won && <span className="ml-2 text-xs text-film-gold font-medium">Won</span>}
                        </div>
                        <div className="text-xs text-film-muted">{award.name} · {award.year}</div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(award)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(award.id, award.category)} disabled={deleting === award.id}
                          className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
