'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, User } from 'lucide-react'
import { toast } from 'sonner'

/* ─── Types ──────────────────────────────────────────────────────── */

interface PersonLink {
  id: string
  role: string
  character_name: string | null
  department: string | null
  billing_order: number
  person: { id: string; full_name: string; profile_image: string | null } | null
}

interface MovieOption { id: string; title: string; release_year: number }

/* ─── Constants ──────────────────────────────────────────────────── */

const CAST_ROLES = ['actor', 'director', 'writer'] as const
const CREW_ROLES = ['director', 'writer', 'producer', 'cinematographer', 'editor', 'composer', 'costume_designer', 'production_designer'] as const

const ROLE_LABELS: Record<string, string> = {
  actor:               'Actor / Actress',
  director:            'Director',
  writer:              'Writer',
  producer:            'Producer',
  cinematographer:     'Cinematographer',
  editor:              'Editor',
  composer:            'Composer',
  costume_designer:    'Costume Designer',
  production_designer: 'Production Designer',
}

const DEPARTMENTS = ['Direction', 'Production', 'Writing', 'Camera', 'Editing', 'Music', 'Costume', 'Art', 'Sound', 'Visual Effects']

const blankCast = { name: '', role: 'actor', character: '', billing: 0 }
const blankCrew = { name: '', role: 'director', department: 'Direction', billing: 0 }

/* ─── Helpers ────────────────────────────────────────────────────── */

async function findOrCreatePerson(supabase: any, fullName: string): Promise<string | null> {
  const trimmed = fullName.trim()
  if (!trimmed) return null

  // Search for existing person (case-insensitive)
  const { data: existing } = await supabase
    .from('people')
    .select('id')
    .ilike('full_name', trimmed)
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  // Create new person
  const { data: created, error } = await supabase
    .from('people')
    .insert({ full_name: trimmed })
    .select('id')
    .single()

  if (error) { toast.error(`Could not create person "${trimmed}"`); return null }
  return created.id
}

/* ─── Component ──────────────────────────────────────────────────── */

interface Props { movies: MovieOption[] }

export function CastCrewManager({ movies }: Props) {
  const [movieId, setMovieId]   = useState('')
  const [links, setLinks]       = useState<PersonLink[]>([])
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState<'cast' | 'crew'>('cast')

  const [addingCast, setAddingCast] = useState(false)
  const [editId, setEditId]         = useState<string | null>(null)
  const [castForm, setCastForm]     = useState({ ...blankCast })

  const [addingCrew, setAddingCrew] = useState(false)
  const [crewId, setCrewId]         = useState<string | null>(null)
  const [crewForm, setCrewForm]     = useState({ ...blankCrew })

  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const supabase = createClient() as any

  useEffect(() => {
    if (!movieId) { setLinks([]); return }
    setLoading(true)
    supabase
      .from('movie_people')
      .select('id, role, character_name, department, billing_order, person:people(id, full_name, profile_image)')
      .eq('movie_id', movieId)
      .order('billing_order', { ascending: true })
      .then(({ data }: any) => { setLinks(data || []); setLoading(false) })
  }, [movieId])

  const cast = links.filter(l => l.role === 'actor')
  const crew = links.filter(l => l.role !== 'actor')

  /* ── Cast actions ── */
  const saveCast = async () => {
    if (!castForm.name.trim() || !castForm.role) { toast.error('Name and role are required'); return }
    setSaving(true)

    if (editId) {
      const personId = await findOrCreatePerson(supabase, castForm.name)
      if (!personId) { setSaving(false); return }
      const { error } = await supabase.from('movie_people').update({
        person_id: personId, role: castForm.role,
        character_name: castForm.character.trim() || null,
        billing_order: Number(castForm.billing),
      }).eq('id', editId)
      if (error) { toast.error('Could not update'); setSaving(false); return }
      setLinks(p => p.map(l => l.id === editId
        ? { ...l, role: castForm.role, character_name: castForm.character.trim() || null, person: l.person }
        : l
      ))
      toast.success('Updated')
      setEditId(null)
    } else {
      const personId = await findOrCreatePerson(supabase, castForm.name)
      if (!personId) { setSaving(false); return }
      const { data, error } = await supabase.from('movie_people').insert({
        movie_id: movieId, person_id: personId, role: castForm.role,
        character_name: castForm.character.trim() || null,
        billing_order: Number(castForm.billing),
      }).select('id, role, character_name, department, billing_order, person:people(id, full_name, profile_image)').single()
      if (error) { toast.error('Could not add — check for duplicate'); setSaving(false); return }
      setLinks(p => [...p, data as PersonLink])
      toast.success('Cast member added')
      setAddingCast(false)
      setCastForm({ ...blankCast })
    }
    setSaving(false)
  }

  /* ── Crew actions ── */
  const saveCrew = async () => {
    if (!crewForm.name.trim() || !crewForm.role) { toast.error('Name and role are required'); return }
    setSaving(true)

    if (crewId) {
      const personId = await findOrCreatePerson(supabase, crewForm.name)
      if (!personId) { setSaving(false); return }
      const { error } = await supabase.from('movie_people').update({
        person_id: personId, role: crewForm.role,
        department: crewForm.department || null,
        billing_order: Number(crewForm.billing),
      }).eq('id', crewId)
      if (error) { toast.error('Could not update'); setSaving(false); return }
      setLinks(p => p.map(l => l.id === crewId
        ? { ...l, role: crewForm.role, department: crewForm.department || null }
        : l
      ))
      toast.success('Updated')
      setCrewId(null)
    } else {
      const personId = await findOrCreatePerson(supabase, crewForm.name)
      if (!personId) { setSaving(false); return }
      const { data, error } = await supabase.from('movie_people').insert({
        movie_id: movieId, person_id: personId, role: crewForm.role,
        department: crewForm.department || null,
        billing_order: Number(crewForm.billing),
      }).select('id, role, character_name, department, billing_order, person:people(id, full_name, profile_image)').single()
      if (error) { toast.error('Could not add — check for duplicate'); setSaving(false); return }
      setLinks(p => [...p, data as PersonLink])
      toast.success('Crew member added')
      setAddingCrew(false)
      setCrewForm({ ...blankCrew })
    }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this credit?')) return
    setDeleting(id)
    const { error } = await supabase.from('movie_people').delete().eq('id', id)
    if (error) { toast.error('Could not remove'); setDeleting(null); return }
    setLinks(p => p.filter(l => l.id !== id))
    toast.success('Removed')
    setDeleting(null)
  }

  const ic = 'cinema-input text-sm py-2'

  /* ── Cast form ── */
  const CastForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-film-muted mb-1">Full name *</label>
          <input className={ic} value={castForm.name}
            onChange={e => setCastForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Genevieve Nnaji" />
          <p className="text-[10px] text-film-subtle mt-0.5">New names are created automatically in People.</p>
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Role *</label>
          <select className={ic} value={castForm.role}
            onChange={e => setCastForm(p => ({ ...p, role: e.target.value }))}>
            {CAST_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Character name</label>
          <input className={ic} value={castForm.character}
            onChange={e => setCastForm(p => ({ ...p, character: e.target.value }))}
            placeholder="Ada" />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Billing order</label>
          <input className={ic} type="number" min="0" value={castForm.billing}
            onChange={e => setCastForm(p => ({ ...p, billing: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={saveCast} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add cast member'}
        </button>
        <button onClick={() => { setAddingCast(false); setEditId(null) }} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  /* ── Crew form ── */
  const CrewForm = ({ isEdit }: { isEdit: boolean }) => (
    <div className="p-5 bg-cinema-surface border-b border-cinema-border">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-xs text-film-muted mb-1">Full name *</label>
          <input className={ic} value={crewForm.name}
            onChange={e => setCrewForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Kemi Adetiba" />
          <p className="text-[10px] text-film-subtle mt-0.5">New names are created automatically in People.</p>
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Role *</label>
          <select className={ic} value={crewForm.role}
            onChange={e => setCrewForm(p => ({ ...p, role: e.target.value }))}>
            {CREW_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Department</label>
          <select className={ic} value={crewForm.department}
            onChange={e => setCrewForm(p => ({ ...p, department: e.target.value }))}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Billing order</label>
          <input className={ic} type="number" min="0" value={crewForm.billing}
            onChange={e => setCrewForm(p => ({ ...p, billing: Number(e.target.value) }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={saveCrew} disabled={saving} className="btn-gold py-1.5 text-xs disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add crew member'}
        </button>
        <button onClick={() => { setAddingCrew(false); setCrewId(null) }} className="btn-ghost py-1.5 text-xs">Cancel</button>
      </div>
    </div>
  )

  /* ── Person row ── */
  const PersonRow = ({ link, isCast }: { link: PersonLink; isCast: boolean }) => (
    <div className="flex items-center gap-4 px-5 py-3 hover:bg-cinema-surface/40 transition-colors group">
      {link.person?.profile_image ? (
        <img src={link.person.profile_image} alt={link.person.full_name}
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-cinema-border" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-cinema-surface border border-cinema-border flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-film-subtle" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-film-cream text-sm">{link.person?.full_name ?? '—'}</div>
        <div className="text-xs text-film-muted">
          {ROLE_LABELS[link.role] ?? link.role}
          {link.character_name && ` — ${link.character_name}`}
          {!isCast && link.department && ` · ${link.department}`}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => {
            if (isCast) {
              setCastForm({ name: link.person?.full_name ?? '', role: link.role, character: link.character_name ?? '', billing: link.billing_order })
              setEditId(link.id); setAddingCast(false)
            } else {
              setCrewForm({ name: link.person?.full_name ?? '', role: link.role, department: link.department ?? 'Direction', billing: link.billing_order })
              setCrewId(link.id); setAddingCrew(false)
            }
          }}
          className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => remove(link.id)} disabled={deleting === link.id}
          className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Movie selector */}
      <div>
        <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">Select movie</label>
        <select className={ic} value={movieId} onChange={e => {
          setMovieId(e.target.value)
          setAddingCast(false); setAddingCrew(false)
          setEditId(null); setCrewId(null)
        }}>
          <option value="">Choose a movie...</option>
          {movies.map(m => <option key={m.id} value={m.id}>{m.title} ({m.release_year})</option>)}
        </select>
      </div>

      {!movieId && (
        <div className="cinema-card p-10 text-center text-film-muted text-sm">
          Select a movie above to manage its cast and crew.
        </div>
      )}

      {movieId && (
        <div className="cinema-card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-cinema-border">
            {(['cast', 'crew'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${tab === t ? 'text-film-gold border-b-2 border-film-gold' : 'text-film-muted hover:text-film-cream'}`}>
                {t} ({t === 'cast' ? cast.length : crew.length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-10 text-center text-film-muted text-sm">Loading credits...</div>
          ) : tab === 'cast' ? (
            <div>
              {(addingCast || editId) ? <CastForm isEdit={!!editId} /> : (
                <div className="p-4 border-b border-cinema-border">
                  <button onClick={() => { setCastForm({ ...blankCast }); setEditId(null); setAddingCast(true) }}
                    className="btn-gold py-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add cast member
                  </button>
                </div>
              )}
              {cast.length === 0 && !addingCast ? (
                <div className="py-10 text-center text-film-muted text-sm">No cast members yet.</div>
              ) : (
                <div className="divide-y divide-cinema-border">
                  {cast.map(link => (
                    editId === link.id ? null : <PersonRow key={link.id} link={link} isCast />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              {(addingCrew || crewId) ? <CrewForm isEdit={!!crewId} /> : (
                <div className="p-4 border-b border-cinema-border">
                  <button onClick={() => { setCrewForm({ ...blankCrew }); setCrewId(null); setAddingCrew(true) }}
                    className="btn-gold py-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add crew member
                  </button>
                </div>
              )}
              {crew.length === 0 && !addingCrew ? (
                <div className="py-10 text-center text-film-muted text-sm">No crew members yet.</div>
              ) : (
                <div className="divide-y divide-cinema-border">
                  {crew.map(link => (
                    crewId === link.id ? null : <PersonRow key={link.id} link={link} isCast={false} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
