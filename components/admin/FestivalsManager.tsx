'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Edit2, Trash2, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface Festival {
  id: string
  name: string
  short_name: string
  slug: string
  country: string
  city: string
  description: string
  founded: number | null
  frequency: string
  website: string
}

type FormState = {
  name: string; short_name: string; slug: string; country: string
  city: string; description: string; founded: string; frequency: string; website: string
}

const blank: FormState = {
  name: '', short_name: '', slug: '', country: '', city: '',
  description: '', founded: '', frequency: 'Annual', website: '',
}

interface Props { festivals: Festival[] }

export function FestivalsManager({ festivals: initial }: Props) {
  const [festivals, setFestivals] = useState(initial)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ ...blank })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient() as any
  const router = useRouter()

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      setForm(p => {
        const next = { ...p, [key]: val }
        if (key === 'short_name' && (!p.slug || p.slug === slugify(p.short_name))) {
          next.slug = slugify(val)
        }
        return next
      })
    }

  const startNew = () => { setForm({ ...blank }); setEditing('new') }
  const startEdit = (f: Festival) => {
    setForm({
      name: f.name, short_name: f.short_name, slug: f.slug,
      country: f.country ?? '', city: f.city ?? '',
      description: f.description ?? '', founded: f.founded ? String(f.founded) : '',
      frequency: f.frequency ?? 'Annual', website: f.website ?? '',
    })
    setEditing(f.id)
  }
  const cancel = () => setEditing(null)

  const save = async () => {
    if (!form.name.trim() || !form.short_name.trim() || !form.slug.trim()) {
      toast.error('Name, short name, and slug are required')
      return
    }
    setSaving(true)
    const payload = {
      name:        form.name.trim(),
      short_name:  form.short_name.trim().toUpperCase(),
      slug:        slugify(form.slug),
      country:     form.country.trim() || null,
      city:        form.city.trim() || null,
      description: form.description.trim() || null,
      founded:     form.founded ? Number(form.founded) : null,
      frequency:   form.frequency.trim() || null,
      website:     form.website.trim() || null,
    }

    if (editing === 'new') {
      const { data, error } = await supabase.from('festivals').insert(payload).select().single()
      if (error) { toast.error('Could not add festival'); setSaving(false); return }
      setFestivals(p => [...p, data as Festival].sort((a, b) => (a.founded ?? 9999) - (b.founded ?? 9999)))
      toast.success('Festival added')
    } else {
      const { error } = await supabase.from('festivals').update(payload).eq('id', editing)
      if (error) { toast.error('Could not update festival'); setSaving(false); return }
      setFestivals(p => p.map(f => f.id === editing ? { ...f, ...payload } as Festival : f))
      toast.success('Festival updated')
    }
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will not delete associated award entries.`)) return
    setDeleting(id)
    const { error } = await supabase.from('festivals').delete().eq('id', id)
    if (error) { toast.error('Could not delete festival'); setDeleting(null); return }
    setFestivals(p => p.filter(f => f.id !== id))
    toast.success('Festival deleted')
    setDeleting(null)
    router.refresh()
  }

  const ic = 'cinema-input text-sm py-2'

  const Form = () => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Full name *</label>
          <input className={ic} value={form.name} onChange={set('name')} placeholder="Africa Movie Academy Awards" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Short name / acronym *</label>
          <input className={ic} value={form.short_name} onChange={set('short_name')} placeholder="AMAA" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">URL slug * (auto-filled)</label>
          <input className={ic} value={form.slug} onChange={set('slug')} placeholder="amaa" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Country</label>
          <input className={ic} value={form.country} onChange={set('country')} placeholder="Nigeria" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">City</label>
          <input className={ic} value={form.city} onChange={set('city')} placeholder="Lagos" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Founded (year)</label>
          <input className={ic} type="number" value={form.founded} onChange={set('founded')} placeholder="2005" min="1900" max="2030" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Frequency</label>
          <select className={ic} value={form.frequency} onChange={set('frequency')}>
            <option value="Annual">Annual</option>
            <option value="Biennial">Biennial</option>
            <option value="Triennial">Triennial</option>
            <option value="Irregular">Irregular</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Website URL</label>
          <input className={ic} value={form.website} onChange={set('website')} placeholder="https://amaawards.com" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Description</label>
          <textarea className={ic} rows={3} value={form.description} onChange={set('description')} placeholder="Brief description of the festival..." />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving...' : editing === 'new' ? 'Add festival' : 'Save changes'}
        </button>
        <button onClick={cancel} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="cinema-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-cinema-border">
          <span className="text-sm text-film-muted">
            {festivals.length} {festivals.length === 1 ? 'festival' : 'festivals'}
          </span>
          {editing !== 'new' && (
            <button onClick={startNew} className="btn-gold py-1.5 text-xs">
              <Plus className="w-3.5 h-3.5 inline mr-1" />
              Add festival
            </button>
          )}
        </div>

        {editing === 'new' && <Form />}

        {festivals.length === 0 && editing !== 'new' ? (
          <div className="py-12 text-center text-film-muted text-sm">
            No festivals yet. Add the first one above.
          </div>
        ) : (
          <div className="divide-y divide-cinema-border">
            {festivals.map(fest => (
              <div key={fest.id}>
                {editing === fest.id ? (
                  <Form />
                ) : (
                  <div className="flex items-start gap-4 px-5 py-4 hover:bg-cinema-surface/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs font-bold text-film-gold font-mono tracking-wide uppercase">
                          {fest.short_name}
                        </span>
                        {fest.frequency && (
                          <span className="text-xs text-film-subtle font-mono">{fest.frequency}</span>
                        )}
                      </div>
                      <p className="font-medium text-film-cream text-sm">{fest.name}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {(fest.city || fest.country) && (
                          <span className="text-xs text-film-muted">
                            📍 {fest.city ? `${fest.city}, ` : ''}{fest.country}
                          </span>
                        )}
                        {fest.founded && (
                          <span className="text-xs text-film-muted font-mono">Est. {fest.founded}</span>
                        )}
                        {fest.website && (
                          <a
                            href={fest.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-film-muted hover:text-film-cream inline-flex items-center gap-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <Globe className="w-3 h-3" /> Site ↗
                          </a>
                        )}
                      </div>
                      {fest.description && (
                        <p className="text-xs text-film-subtle mt-1.5 line-clamp-1">{fest.description}</p>
                      )}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                      <button
                        onClick={() => startEdit(fest)}
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
                        title="Edit festival"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => remove(fest.id, fest.name)}
                        disabled={deleting === fest.id}
                        className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                        title="Delete festival"
                      >
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
    </div>
  )
}
