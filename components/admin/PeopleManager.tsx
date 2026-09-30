'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, BadgeCheck, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { SOCIAL_KEYS, SOCIAL_LABELS, foldForSearch, type Socials } from '@/lib/people'

export interface AdminPerson {
  id: string
  slug: string
  full_name: string
  country: string | null
  bio: string | null
  verified: boolean
  is_featured: boolean
  profile_image: string | null
  imdb_id: string | null
  website: string | null
  date_of_birth: string | null
  date_of_death: string | null
  aliases: string[]
  socials: Socials
  credit_count: number
}

interface FormState {
  full_name: string
  country: string
  bio: string
  verified: boolean
  is_featured: boolean
  profile_image: string
  imdb_id: string
  website: string
  date_of_birth: string
  date_of_death: string
  aliases: string
  socials: Record<string, string>
}

const blank: FormState = {
  full_name: '', country: '', bio: '', verified: false, is_featured: false,
  profile_image: '', imdb_id: '', website: '', date_of_birth: '', date_of_death: '',
  aliases: '', socials: {},
}

const isHttp = (s: string) => /^https?:\/\/\S+$/i.test(s)

const SELECT =
  'id, slug, full_name, country, bio, verified, is_featured, profile_image, imdb_id, website, date_of_birth, date_of_death, aliases, socials'

interface Props {
  people: AdminPerson[]
  initialAdd?: string
}

export function PeopleManager({ people: initial, initialAdd }: Props) {
  const [people, setPeople]     = useState(initial)
  const [adding, setAdding]     = useState(!!initialAdd)
  const [editId, setEditId]     = useState<string | null>(null)
  const [form, setForm]         = useState<FormState>({ ...blank, full_name: initialAdd ?? '' })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter]     = useState('')
  const router = useRouter()
  const supabase = createClient() as any

  const set = (key: keyof Omit<FormState, 'socials' | 'verified' | 'is_featured'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const setSocial = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, socials: { ...prev.socials, [key]: e.target.value } }))

  const startAdd = () => { setForm({ ...blank }); setEditId(null); setAdding(true) }

  const startEdit = (p: AdminPerson) => {
    setForm({
      full_name:     p.full_name,
      country:       p.country ?? '',
      bio:           p.bio ?? '',
      verified:      p.verified,
      is_featured:   p.is_featured,
      profile_image: p.profile_image ?? '',
      imdb_id:       p.imdb_id ?? '',
      website:       p.website ?? '',
      date_of_birth: p.date_of_birth ?? '',
      date_of_death: p.date_of_death ?? '',
      aliases:       (p.aliases ?? []).join(', '),
      socials:       { ...(p.socials ?? {}) } as Record<string, string>,
    })
    setAdding(false)
    setEditId(p.id)
  }

  const cancel = () => { setAdding(false); setEditId(null) }

  const save = async () => {
    const name = form.full_name.trim()
    if (!name) { toast.error('A name is required.'); return }

    const clash = people.find(p => p.id !== editId && foldForSearch(p.full_name) === foldForSearch(name))
    if (clash) {
      toast.error(`${clash.full_name} already has a profile. Edit that one instead of adding a second.`)
      return
    }

    const socials: Record<string, string> = {}
    for (const k of SOCIAL_KEYS) {
      const v = (form.socials[k] ?? '').trim()
      if (!v) continue
      if (!isHttp(v)) { toast.error(`${SOCIAL_LABELS[k]} needs a full link starting with https://`); return }
      socials[k] = v
    }
    if (form.website.trim() && !isHttp(form.website.trim())) { toast.error('Website needs a full link starting with https://'); return }
    if (form.profile_image.trim() && !isHttp(form.profile_image.trim())) { toast.error('Profile image needs a full link starting with https://'); return }

    setSaving(true)
    const payload = {
      full_name:     name,
      country:       form.country.trim() || null,
      bio:           form.bio.trim() || null,
      verified:      form.verified,
      is_featured:   form.is_featured,
      profile_image: form.profile_image.trim() || null,
      imdb_id:       form.imdb_id.trim() || null,
      website:       form.website.trim() || null,
      date_of_birth: form.date_of_birth || null,
      date_of_death: form.date_of_death || null,
      aliases:       form.aliases.split(',').map(a => a.trim()).filter(Boolean),
      socials,
    }

    if (editId) {
      const { data, error } = await supabase.from('people').update(payload).eq('id', editId).select(SELECT).single()
      setSaving(false)
      if (error) { toast.error('That did not save. Check the details and try again.'); return }
      setPeople(prev => prev.map(p => (p.id === editId ? { ...p, ...(data as AdminPerson) } : p)))
      toast.success(`${payload.full_name} updated`)
      setEditId(null)
    } else {
      const { data, error } = await supabase.from('people').insert(payload).select(SELECT).single()
      setSaving(false)
      if (error) { toast.error('That did not save. Check the details and try again.'); return }
      setPeople(prev => [{ ...(data as AdminPerson), credit_count: 0 }, ...prev])
      toast.success(`${payload.full_name} added. Their profile is live at /person/${(data as AdminPerson).slug}`)
      setAdding(false)
    }
    router.refresh()
  }

  const remove = async (p: AdminPerson) => {
    const warning = p.credit_count > 0
      ? `Remove ${p.full_name}? They are credited on ${p.credit_count} film${p.credit_count === 1 ? '' : 's'}, and those credits will be removed too. This cannot be undone.`
      : `Remove ${p.full_name}? This cannot be undone.`
    if (!confirm(warning)) return
    setDeleting(p.id)
    const { error } = await supabase.from('people').delete().eq('id', p.id)
    setDeleting(null)
    if (error) { toast.error('Could not remove them. Try again.'); return }
    setPeople(prev => prev.filter(x => x.id !== p.id))
    toast.success(`${p.full_name} removed`)
    router.refresh()
  }

  const visible = useMemo(() => {
    const t = foldForSearch(filter.trim())
    if (!t) return people
    return people.filter(p => foldForSearch(`${p.full_name} ${(p.aliases ?? []).join(' ')}`).includes(t))
  }, [people, filter])

  const ic = 'cinema-input text-sm py-2'

  // Called as a function, not rendered as <PersonForm />. A component defined inside render
  // gets a new identity each time and would drop input focus on every keystroke.
  const renderForm = () => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label htmlFor="pf-name" className="block text-xs text-film-muted mb-1">Full name *</label>
          <input id="pf-name" className={ic} value={form.full_name} onChange={set('full_name')} placeholder="Genevieve Nnaji" />
        </div>
        <div>
          <label htmlFor="pf-country" className="block text-xs text-film-muted mb-1">Country</label>
          <input id="pf-country" className={ic} value={form.country} onChange={set('country')} placeholder="Nigeria" />
        </div>
        <div>
          <label htmlFor="pf-aliases" className="block text-xs text-film-muted mb-1">Also known as</label>
          <input id="pf-aliases" className={ic} value={form.aliases} onChange={set('aliases')} placeholder="Other spellings or stage names, separated by commas" />
        </div>
        <div>
          <label htmlFor="pf-image" className="block text-xs text-film-muted mb-1">Profile image link</label>
          <input id="pf-image" className={ic} type="url" value={form.profile_image} onChange={set('profile_image')} placeholder="https://..." />
        </div>
        <div>
          <label htmlFor="pf-dob" className="block text-xs text-film-muted mb-1">Date of birth</label>
          <input id="pf-dob" className={ic} type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
        </div>
        <div>
          <label htmlFor="pf-dod" className="block text-xs text-film-muted mb-1">Date of death</label>
          <input id="pf-dod" className={ic} type="date" value={form.date_of_death} onChange={set('date_of_death')} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pf-bio" className="block text-xs text-film-muted mb-1">Bio</label>
          <textarea id="pf-bio" className={`${ic} resize-none`} rows={4} value={form.bio} onChange={set('bio')}
            placeholder="Who they are, what they are known for, where they started. Two or three sentences is enough to be useful in search." />
        </div>
        <div>
          <label htmlFor="pf-imdb" className="block text-xs text-film-muted mb-1">IMDb ID</label>
          <input id="pf-imdb" className={ic} value={form.imdb_id} onChange={set('imdb_id')} placeholder="nm1234567" />
        </div>
        <div>
          <label htmlFor="pf-site" className="block text-xs text-film-muted mb-1">Website</label>
          <input id="pf-site" className={ic} type="url" value={form.website} onChange={set('website')} placeholder="https://..." />
        </div>
        {SOCIAL_KEYS.map(k => (
          <div key={k}>
            <label htmlFor={`pf-${k}`} className="block text-xs text-film-muted mb-1">{SOCIAL_LABELS[k]}</label>
            <input id={`pf-${k}`} className={ic} type="url" value={form.socials[k] ?? ''} onChange={setSocial(k)} placeholder="https://..." />
          </div>
        ))}
        <div className="sm:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-xs text-film-muted cursor-pointer">
            <input type="checkbox" checked={form.verified} onChange={e => setForm(p => ({ ...p, verified: e.target.checked }))} className="w-4 h-4 rounded accent-film-gold" />
            Verified profile
          </label>
          <label className="flex items-center gap-2 text-xs text-film-muted cursor-pointer">
            <input type="checkbox" checked={form.is_featured} onChange={e => setForm(p => ({ ...p, is_featured: e.target.checked }))} className="w-4 h-4 rounded accent-film-gold" />
            Featured on the People page
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving profile...' : editId ? 'Save profile' : 'Create profile'}
        </button>
        <button onClick={cancel} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="cinema-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 justify-between p-5 border-b border-cinema-border">
        <span className="text-sm text-film-muted">{people.length} profiles</span>
        <div className="flex items-center gap-3 flex-1 sm:flex-none justify-end">
          <label htmlFor="people-filter" className="sr-only">Filter profiles</label>
          <input
            id="people-filter"
            className={`${ic} sm:w-64`}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter by name"
          />
          {!adding && !editId && (
            <button onClick={startAdd} className="btn-gold py-1.5 text-xs shrink-0">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add person
            </button>
          )}
        </div>
      </div>

      {adding && renderForm()}

      {visible.length === 0 && !adding ? (
        <div className="text-center py-16 text-film-muted text-sm">
          {people.length === 0 ? 'No profiles yet. Add the first one above.' : `Nobody matches "${filter}".`}
        </div>
      ) : (
        <div className="divide-y divide-cinema-border">
          {visible.map(person => (
            <div key={person.id}>
              {editId === person.id ? (
                renderForm()
              ) : (
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-cinema-surface/40 transition-colors group">
                  {person.profile_image ? (
                    <img
                      src={person.profile_image}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover bg-cinema-surface shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-cinema-surface shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-film-cream text-sm">{person.full_name}</span>
                      {person.verified && <BadgeCheck className="w-3.5 h-3.5 text-film-gold shrink-0" aria-label="Verified" />}
                      {person.is_featured && <span className="text-[10px] font-semibold uppercase tracking-wide text-film-gold">Featured</span>}
                    </div>
                    <span className="text-xs text-film-muted">
                      {[person.country, `${person.credit_count} credit${person.credit_count === 1 ? '' : 's'}`, !person.bio ? 'No bio yet' : null]
                        .filter(Boolean).join('  ·  ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                    <Link
                      href={`/person/${person.slug}`}
                      target="_blank"
                      className="inline-flex items-center justify-center w-8 h-8 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
                      aria-label={`Open ${person.full_name}'s public profile`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                    <button
                      onClick={() => startEdit(person)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
                      aria-label={`Edit ${person.full_name}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => remove(person)}
                      disabled={deleting === person.id}
                      className="inline-flex items-center justify-center w-8 h-8 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      aria-label={`Remove ${person.full_name}`}
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
