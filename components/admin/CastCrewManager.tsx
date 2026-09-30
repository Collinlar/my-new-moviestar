'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CreditsEditor } from '@/components/admin/CreditsEditor'
import { draftsFromRows, saveCredits, type CreditDraft, type CreditRow } from '@/lib/credits'

interface MovieOption { id: string; title: string; release_year: number }

export function CastCrewManager({ movies }: { movies: MovieOption[] }) {
  const supabase = createClient() as any

  const [movieId, setMovieId]   = useState('')
  const [credits, setCredits]   = useState<CreditDraft[]>([])
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)

  const load = async (id: string) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('movie_people')
      .select('id, role, character_name, billing_order, person:people(id, slug, full_name, profile_image, country)')
      .eq('movie_id', id)
    setLoading(false)
    if (error) { toast.error('Could not load the credits for this film. Try again.'); return }
    const drafts = draftsFromRows((data as CreditRow[]) || [])
    setCredits(drafts)
    setSavedIds(drafts.flatMap(d => (d.id ? [d.id] : [])))
    setDirty(false)
  }

  useEffect(() => {
    if (!movieId) { setCredits([]); setSavedIds([]); setDirty(false); return }
    load(movieId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieId])

  // Warn before leaving with unsaved credits.
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const changeMovie = (id: string) => {
    if (dirty && !confirm('You have unsaved credits for this film. Switch anyway?')) return
    setMovieId(id)
  }

  const save = async () => {
    setSaving(true)
    const err = await saveCredits(supabase, movieId, credits, savedIds)
    setSaving(false)
    if (err) { toast.error(err); return }
    toast.success('Cast and crew saved')
    await load(movieId)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <label htmlFor="cc-movie" className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">
          Film
        </label>
        <select
          id="cc-movie"
          className="cinema-input text-sm py-2"
          value={movieId}
          onChange={e => changeMovie(e.target.value)}
        >
          <option value="">Choose a film...</option>
          {movies.map(m => <option key={m.id} value={m.id}>{m.title} ({m.release_year})</option>)}
        </select>
      </div>

      {!movieId && (
        <div className="cinema-card p-10 text-center text-film-muted text-sm">
          Choose a film to manage its cast and crew.
        </div>
      )}

      {movieId && (
        <div className="cinema-card p-5">
          {loading ? (
            <p className="py-8 text-center text-film-muted text-sm">Loading this film&apos;s credits...</p>
          ) : (
            <>
              <CreditsEditor credits={credits} onChange={next => { setCredits(next); setDirty(true) }} />
              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-cinema-border">
                <button onClick={save} disabled={saving || !dirty} className="btn-gold disabled:opacity-50">
                  {saving ? 'Saving credits...' : 'Save cast and crew'}
                </button>
                {dirty && <span className="text-xs text-film-muted">Unsaved changes</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
