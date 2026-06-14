'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Check, X, BadgeCheck } from 'lucide-react'
import { toast } from 'sonner'

interface Person {
  id: string
  full_name: string
  country: string | null
  bio: string | null
  verified: boolean
  profile_image: string | null
  imdb_id: string | null
  website: string | null
}

const blank: Omit<Person, 'id'> = {
  full_name: '', country: '', bio: '', verified: false,
  profile_image: '', imdb_id: '', website: '',
}

interface Props { people: Person[] }

export function PeopleManager({ people: initial }: Props) {
  const [people, setPeople] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...blank })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient() as any

  const set = (key: keyof typeof blank) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const startAdd = () => {
    setForm({ ...blank })
    setEditId(null)
    setAdding(true)
  }

  const startEdit = (p: Person) => {
    setForm({
      full_name:     p.full_name,
      country:       p.country    ?? '',
      bio:           p.bio        ?? '',
      verified:      p.verified,
      profile_image: p.profile_image ?? '',
      imdb_id:       p.imdb_id   ?? '',
      website:       p.website   ?? '',
    })
    setAdding(false)
    setEditId(p.id)
  }

  const cancel = () => { setAdding(false); setEditId(null) }

  const save = async () => {
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)

    const payload = {
      full_name:     form.full_name.trim(),
      country:       form.country.trim()       || null,
      bio:           form.bio.trim()           || null,
      verified:      form.verified,
      profile_image: form.profile_image.trim() || null,
      imdb_id:       form.imdb_id.trim()       || null,
      website:       form.website.trim()       || null,
    }

    if (editId) {
      const { error } = await supabase.from('people').update(payload).eq('id', editId)
      if (error) { toast.error('Could not update'); setSaving(false); return }
      setPeople(prev => prev.map(p => p.id === editId ? { ...p, ...payload } : p))
      toast.success(`${payload.full_name} updated`)
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('people').insert(payload).select().single()
      if (error) { toast.error('Could not add person'); setSaving(false); return }
      setPeople(prev => [data as Person, ...prev])
      toast.success(`${payload.full_name} added`)
      setAdding(false)
    }

    setSaving(false)
    router.refresh()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    setDeleting(id)
    const { error } = await supabase.from('people').delete().eq('id', id)
    if (error) { toast.error('Could not delete'); setDeleting(null); return }
    setPeople(prev => prev.filter(p => p.id !== id))
    toast.success(`${name} removed`)
    setDeleting(null)
    router.refresh()
  }

  const inputClass = 'cinema-input text-sm py-2'

  const PersonForm = () => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-film-muted mb-1">Full name *</label>
          <input className={inputClass} value={form.full_name} onChange={set('full_name')} placeholder="Genevieve Nnaji" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Country</label>
          <input className={inputClass} value={form.country} onChange={set('country')} placeholder="Nigeria" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Profile image URL</label>
          <input className={inputClass} type="url" value={form.profile_image} onChange={set('profile_image')} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">IMDb ID</label>
          <input className={inputClass} value={form.imdb_id} onChange={set('imdb_id')} placeholder="nm1234567" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Bio</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={form.bio}
            onChange={set('bio')}
            placeholder="Short biography..."
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <input
            type="checkbox"
            id="verified-cb"
            checked={form.verified}
            onChange={e => setForm(prev => ({ ...prev, verified: e.target.checked }))}
            className="w-4 h-4 rounded accent-film-gold"
          />
          <label htmlFor="verified-cb" className="text-xs text-film-muted cursor-pointer">Mark as verified</label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving...' : editId ? 'Save changes' : 'Add person'}
        </button>
        <button onClick={cancel} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="cinema-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-cinema-border">
        <span className="text-sm text-film-muted">{people.length} people</span>
        {!adding && !editId && (
          <button onClick={startAdd} className="btn-gold py-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Add person
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && <PersonForm />}

      {/* List */}
      {people.length === 0 && !adding ? (
        <div className="text-center py-16 text-film-muted text-sm">
          No people yet. Add the first one above.
        </div>
      ) : (
        <div className="divide-y divide-cinema-border">
          {people.map(person => (
            <div key={person.id}>
              {editId === person.id ? (
                <PersonForm />
              ) : (
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cinema-surface/40 transition-colors group">
                  {person.profile_image ? (
                    <img
                      src={person.profile_image}
                      alt={person.full_name}
                      className="w-8 h-8 rounded-full object-cover bg-cinema-surface shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cinema-surface shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-film-cream text-sm">{person.full_name}</span>
                      {person.verified && (
                        <BadgeCheck className="w-3.5 h-3.5 text-film-gold shrink-0" aria-label="Verified" />
                      )}
                    </div>
                    {person.country && (
                      <span className="text-xs text-film-muted">{person.country}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(person)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => remove(person.id, person.full_name)}
                      disabled={deleting === person.id}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
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
