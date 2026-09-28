'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Edit2, X, CheckCircle, AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

interface CanonFilm {
  id: string
  title: string
  release_year: number
  poster_url: string | null
  is_canon: boolean
  canon_essay: string | null
  canon_essay_author: string | null
  director: string | null
}

interface MovieOption {
  id: string
  title: string
  release_year: number
  poster_url: string | null
  director: string | null
}

interface Props {
  films: CanonFilm[]
  allMovies: MovieOption[]
}

export function CanonManager({ films: initial, allMovies }: Props) {
  const [films, setFilms] = useState(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [essayDraft, setEssayDraft] = useState('')
  const [authorDraft, setAuthorDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [addQuery, setAddQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const supabase = createClient() as any
  const router = useRouter()

  const openEssay = (film: CanonFilm) => {
    setExpandedId(film.id)
    setEssayDraft(film.canon_essay || '')
    setAuthorDraft(film.canon_essay_author || '')
  }

  const closeEssay = () => setExpandedId(null)

  const saveEssay = async (id: string) => {
    setSaving(true)
    const { error } = await supabase
      .from('movies')
      .update({
        canon_essay:        essayDraft.trim() || null,
        canon_essay_author: authorDraft.trim() || null,
      })
      .eq('id', id)
    if (error) { toast.error('Could not save essay'); setSaving(false); return }
    setFilms(p => p.map(f => f.id === id
      ? { ...f, canon_essay: essayDraft.trim() || null, canon_essay_author: authorDraft.trim() || null }
      : f
    ))
    toast.success('Essay saved')
    setSaving(false)
    setExpandedId(null)
    router.refresh()
  }

  const removeFromCanon = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from the canon? The essay will also be cleared.`)) return
    setRemoving(id)
    const { error } = await supabase
      .from('movies')
      .update({ is_canon: false, canon_essay: null, canon_essay_author: null })
      .eq('id', id)
    if (error) { toast.error('Could not remove from canon'); setRemoving(null); return }
    setFilms(p => p.filter(f => f.id !== id))
    toast.success(`"${title}" removed from canon`)
    setRemoving(null)
    router.refresh()
  }

  const addToCanon = async (movie: MovieOption) => {
    setAdding(true)
    const { error } = await supabase
      .from('movies')
      .update({ is_canon: true })
      .eq('id', movie.id)
    if (error) { toast.error('Could not add to canon'); setAdding(false); return }
    setFilms(p => [...p, { ...movie, is_canon: true, canon_essay: null, canon_essay_author: null }]
      .sort((a, b) => a.title.localeCompare(b.title)))
    setAddQuery('')
    toast.success(`"${movie.title}" added to canon`)
    setAdding(false)
    router.refresh()
  }

  const canonIds = new Set(films.map(f => f.id))
  const searchResults = addQuery.trim().length >= 2
    ? allMovies
        .filter(m => !canonIds.has(m.id) && m.title.toLowerCase().includes(addQuery.toLowerCase()))
        .slice(0, 6)
    : []

  const wordCount = (text: string) =>
    text.trim().split(/\s+/).filter(Boolean).length

  const ic = 'cinema-input text-sm py-2'

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="cinema-card p-4 text-center">
          <div className="text-2xl font-bold text-film-gold" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>
            {films.length}
          </div>
          <div className="text-xs text-film-muted mt-1 font-mono">Canon films</div>
        </div>
        <div className="cinema-card p-4 text-center">
          <div className="text-2xl font-bold text-film-cream" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>
            {films.filter(f => f.canon_essay).length}
          </div>
          <div className="text-xs text-film-muted mt-1 font-mono">With essays</div>
        </div>
        <div className="cinema-card p-4 text-center">
          <div className="text-2xl font-bold text-film-subtle" style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}>
            {films.filter(f => !f.canon_essay).length}
          </div>
          <div className="text-xs text-film-muted mt-1 font-mono">No essay yet</div>
        </div>
      </div>

      {/* Add to canon */}
      <div className="cinema-card p-5">
        <p className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-3">Add film to canon</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-film-subtle pointer-events-none" />
          <input
            className="cinema-input text-sm py-2 pl-9"
            value={addQuery}
            onChange={e => setAddQuery(e.target.value)}
            placeholder="Search by title..."
            disabled={adding}
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 border border-cinema-border rounded-lg overflow-hidden divide-y divide-cinema-border">
            {searchResults.map(m => (
              <button
                key={m.id}
                onClick={() => addToCanon(m)}
                disabled={adding}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cinema-surface text-left transition-colors disabled:opacity-50"
              >
                {m.poster_url ? (
                  <img
                    src={m.poster_url}
                    alt={m.title}
                    style={{ width: 28, height: 40, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{ width: 28, height: 40, borderRadius: 4, background: '#15120E', flexShrink: 0 }} />
                )}
                <div>
                  <div className="text-sm text-film-cream font-medium">{m.title}</div>
                  <div className="text-xs text-film-muted font-mono">
                    {m.release_year}{m.director ? ` · ${m.director}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {addQuery.trim().length >= 2 && searchResults.length === 0 && (
          <p className="text-xs text-film-subtle mt-2">
            No results. The film may already be in the canon, or try a different spelling.
          </p>
        )}
      </div>

      {/* Canon list */}
      <div className="cinema-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-cinema-border">
          <span className="text-sm text-film-muted">
            {films.length} {films.length === 1 ? 'film' : 'films'} in the canon
          </span>
        </div>

        {films.length === 0 ? (
          <div className="py-12 text-center text-film-muted text-sm">
            No canon films yet. Use the search above to add films.
          </div>
        ) : (
          <div className="divide-y divide-cinema-border">
            {films.map(film => (
              <div key={film.id}>
                {/* Film row */}
                <div className="flex items-start gap-4 px-5 py-4 group">
                  {film.poster_url ? (
                    <img
                      src={film.poster_url}
                      alt={film.title}
                      style={{ width: 44, height: 64, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 64, borderRadius: 6, background: '#15120E', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.2, fontSize: 18 }}>
                      🎬
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-film-cream text-sm">{film.title}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-film-muted font-mono">{film.release_year}</span>
                      {film.director && (
                        <span className="text-xs text-film-muted">Dir. {film.director}</span>
                      )}
                    </div>

                    <div className="mt-1.5">
                      {film.canon_essay ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          Essay by {film.canon_essay_author || 'unknown'} · {wordCount(film.canon_essay)} words
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-500/70">
                          <AlertCircle className="w-3 h-3" />
                          No essay yet
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => expandedId === film.id ? closeEssay() : openEssay(film)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
                      title="Edit essay"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => removeFromCanon(film.id, film.title)}
                      disabled={removing === film.id}
                      className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                      title="Remove from canon"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Essay editor (inline expand) */}
                {expandedId === film.id && (
                  <div className="px-5 pb-5 pt-4 bg-cinema-surface border-t border-cinema-border">
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs text-film-muted mb-1">Essay author</label>
                        <input
                          className={ic}
                          value={authorDraft}
                          onChange={e => setAuthorDraft(e.target.value)}
                          placeholder="e.g. Collins Larbi"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-film-muted mb-1">Canon essay</label>
                        <textarea
                          className={ic}
                          rows={8}
                          value={essayDraft}
                          onChange={e => setEssayDraft(e.target.value)}
                          placeholder="Write the canonical essay for this film..."
                        />
                        {essayDraft && (
                          <p className="text-xs text-film-subtle mt-1">
                            {wordCount(essayDraft)} words
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEssay(film.id)}
                          disabled={saving}
                          className="btn-gold py-1.5 text-xs disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save essay'}
                        </button>
                        <button onClick={closeEssay} className="btn-ghost py-1.5 text-xs">
                          Cancel
                        </button>
                      </div>
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
