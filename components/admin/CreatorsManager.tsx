'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Film } from 'lucide-react'
import { toast } from 'sonner'

interface Creator {
  id: string
  name: string
  bio: string | null
  image_url: string | null
  movie_count?: number
}

const blank = { name: '', bio: '', image_url: '' }

interface Props { creators: Creator[] }

export function CreatorsManager({ creators: initial }: Props) {
  const [creators, setCreators] = useState(initial)
  const [adding, setAdding]     = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState({ ...blank })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient() as any

  const set = (k: keyof typeof blank) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }))

  const startAdd = () => { setForm({ ...blank }); setEditId(null); setAdding(true) }
  const startEdit = (c: Creator) => {
    setForm({ name: c.name, bio: c.bio ?? '', image_url: c.image_url ?? '' })
    setAdding(false); setEditId(c.id)
  }
  const cancel = () => { setAdding(false); setEditId(null) }

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    const payload = {
      name:      form.name.trim(),
      bio:       form.bio.trim()       || null,
      image_url: form.image_url.trim() || null,
    }
    if (editId) {
      const { error } = await supabase.from('creators').update(payload).eq('id', editId)
      if (error) { toast.error('Could not update'); setSaving(false); return }
      setCreators(p => p.map(c => c.id === editId ? { ...c, ...payload } : c))
      toast.success(`${payload.name} updated`)
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('creators').insert(payload).select().single()
      if (error) { toast.error('Could not add creator'); setSaving(false); return }
      setCreators(p => [{ ...(data as Creator), movie_count: 0 }, ...p])
      toast.success(`${payload.name} added`)
      setAdding(false)
    }
    setSaving(false)
    router.refresh()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    const { error } = await supabase.from('creators').delete().eq('id', id)
    if (error) { toast.error('Could not delete'); setDeleting(null); return }
    setCreators(p => p.filter(c => c.id !== id))
    toast.success(`${name} removed`)
    setDeleting(null)
    router.refresh()
  }

  const inputClass = 'cinema-input text-sm py-2'

  const CreatorForm = () => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-film-muted mb-1">Name *</label>
          <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Kunle Afolayan" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Profile image URL</label>
          <input className={inputClass} type="url" value={form.image_url} onChange={set('image_url')} placeholder="https://..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Bio</label>
          <textarea className={`${inputClass} resize-none`} rows={2} value={form.bio} onChange={set('bio')} placeholder="Short biography..." />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving...' : editId ? 'Save changes' : 'Add creator'}
        </button>
        <button onClick={cancel} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="cinema-card overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-cinema-border">
        <span className="text-sm text-film-muted">{creators.length} creators</span>
        {!adding && !editId && (
          <button onClick={startAdd} className="btn-gold py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add creator
          </button>
        )}
      </div>

      {adding && <CreatorForm />}

      {creators.length === 0 && !adding ? (
        <div className="text-center py-16 text-film-muted text-sm">No creators yet.</div>
      ) : (
        <div className="divide-y divide-cinema-border">
          {creators.map(creator => (
            <div key={creator.id}>
              {editId === creator.id ? <CreatorForm /> : (
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cinema-surface/40 transition-colors group">
                  {creator.image_url ? (
                    <img src={creator.image_url} alt={creator.name}
                      className="w-9 h-9 rounded-full object-cover bg-cinema-surface shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-cinema-surface shrink-0 flex items-center justify-center">
                      <Film className="w-4 h-4 text-film-subtle" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-film-cream text-sm">{creator.name}</div>
                    {creator.bio && <div className="text-xs text-film-muted truncate max-w-xs">{creator.bio}</div>}
                  </div>
                  {creator.movie_count !== undefined && (
                    <span className="text-xs text-film-subtle hidden sm:block shrink-0">
                      {creator.movie_count} {creator.movie_count === 1 ? 'film' : 'films'}
                    </span>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(creator)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(creator.id, creator.name)} disabled={deleting === creator.id}
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
  )
}
