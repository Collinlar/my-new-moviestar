'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GENRES, LANGUAGES, LANGUAGE_META, INDUSTRIES, STREAMING_PLATFORMS, capitalise } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import type { Movie, StreamingLink } from '@/lib/queries'

const COUNTRIES = [
  'Nigeria', 'Ghana', 'South Africa', 'Kenya', 'Ethiopia', 'Tanzania',
  'Uganda', 'Senegal', 'Côte d\'Ivoire', 'Cameroon', 'Zimbabwe',
  'Zambia', 'Rwanda', 'Egypt', 'Morocco', 'Tunisia', 'Other',
]

const DIST_STATUSES = ['streaming', 'theatrical', 'home_video', 'festival', 'limited', 'unknown']

interface Props {
  movie?: Movie
}

function field(label: string, children: React.ReactNode, required = false) {
  return (
    <div>
      <label className="block text-xs font-semibold text-film-muted uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export function MovieForm({ movie }: Props) {
  const isEdit = !!movie
  const router = useRouter()
  const supabase = createClient() as any

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title:               movie?.title               ?? '',
    original_title:      movie?.original_title      ?? '',
    description:         movie?.description         ?? '',
    synopsis:            movie?.synopsis            ?? '',
    genre:               movie?.genre               ?? '',
    language:            movie?.language            ?? '',
    industry:            movie?.industry            ?? '',
    release_year:        movie?.release_year        ? String(movie.release_year) : '',
    country:             movie?.country             ?? '',
    director:            movie?.director            ?? '',
    poster_url:          movie?.poster_url          ?? '',
    youtube_url:         movie?.youtube_url         ?? '',
    distribution_status: movie?.distribution_status ?? '',
    cultural_context:    movie?.cultural_context    ?? '',
    keywords:            movie?.keywords            ?? '',
    featured:            movie?.featured            ?? false,
    is_canon:            movie?.is_canon            ?? false,
    canon_essay:         movie?.canon_essay         ?? '',
    canon_essay_author:  movie?.canon_essay_author  ?? 'MuvieStars Editorial',
  })

  const [streamingLinks, setStreamingLinks] = useState<StreamingLink[]>(
    movie?.streaming_links ?? []
  )
  const [newLink, setNewLink] = useState<StreamingLink>({ platform: '', url: '', free: false })

  const addStreamingLink = () => {
    if (!newLink.platform || !newLink.url.trim()) return
    setStreamingLinks(prev => [...prev, { ...newLink, url: newLink.url.trim() }])
    setNewLink({ platform: '', url: '', free: false })
  }

  const removeStreamingLink = (i: number) =>
    setStreamingLinks(prev => prev.filter((_, idx) => idx !== i))

  const set = (key: keyof typeof form) => (
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.description.trim()) { toast.error('Description is required'); return }
    if (!form.genre) { toast.error('Genre is required'); return }
    if (!form.language) { toast.error('Language is required'); return }
    if (!form.release_year || isNaN(Number(form.release_year))) { toast.error('Valid release year is required'); return }
    if (!form.poster_url.trim()) { toast.error('Poster URL is required'); return }

    setSaving(true)

    const payload = {
      title:               form.title.trim(),
      original_title:      form.original_title.trim() || null,
      description:         form.description.trim(),
      synopsis:            form.synopsis.trim() || null,
      genre:               form.genre,
      language:            form.language,
      industry:            form.industry || null,
      release_year:        Number(form.release_year),
      country:             form.country.trim() || null,
      director:            form.director.trim() || null,
      poster_url:          form.poster_url.trim(),
      youtube_url:         form.youtube_url.trim() || null,
      distribution_status: form.distribution_status || null,
      cultural_context:    form.cultural_context.trim() || null,
      keywords:            form.keywords.trim() || null,
      featured:            form.featured,
      is_canon:            form.is_canon,
      canon_essay:         form.canon_essay.trim() || null,
      canon_essay_author:  form.canon_essay.trim() ? (form.canon_essay_author.trim() || 'MuvieStars Editorial') : null,
      streaming_links:     streamingLinks,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('movies').update(payload).eq('id', movie!.id))
    } else {
      ;({ error } = await supabase.from('movies').insert(payload))
    }

    setSaving(false)

    if (error) {
      toast.error(error.message || 'Something went wrong. Try again.')
      return
    }

    toast.success(isEdit ? `"${payload.title}" updated` : `"${payload.title}" added to the database`)
    router.push('/admin/movies')
    router.refresh()
  }

  const inputClass = 'cinema-input'
  const textareaClass = 'cinema-input resize-none'

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Basic info */}
      <section>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-4 pb-2 border-b border-cinema-border">
          Basic info
        </h2>
        <div className="space-y-4">
          {field('Title', (
            <input className={inputClass} value={form.title} onChange={set('title')} placeholder="Lionheart" />
          ), true)}
          {field('Original title', (
            <input className={inputClass} value={form.original_title} onChange={set('original_title')} placeholder="Leave blank if same as title" />
          ))}
          {field('Short description', (
            <textarea className={textareaClass} rows={3} value={form.description} onChange={set('description')} placeholder="One or two sentences that appear in search results and movie cards." />
          ), true)}
          {field('Full synopsis', (
            <textarea className={textareaClass} rows={5} value={form.synopsis} onChange={set('synopsis')} placeholder="Detailed plot summary visible on the movie page." />
          ))}
        </div>
      </section>

      {/* Classification */}
      <section>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-4 pb-2 border-b border-cinema-border">
          Classification
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {field('Genre', (
            <select className={inputClass} value={form.genre} onChange={set('genre')}>
              <option value="">Select genre</option>
              {GENRES.map(g => <option key={g} value={g}>{capitalise(g)}</option>)}
            </select>
          ), true)}
          {field('Language', (
            <select className={inputClass} value={form.language} onChange={set('language')}>
              <option value="">Select language</option>
              {LANGUAGES.map(l => (
                <option key={l} value={l}>
                  {capitalise(l)}{LANGUAGE_META[l] ? ` — ${LANGUAGE_META[l]}` : ''}
                </option>
              ))}
            </select>
          ), true)}
          {field('Industry', (
            <select className={inputClass} value={form.industry} onChange={set('industry')}>
              <option value="">Select industry</option>
              {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          ))}
          {field('Release year', (
            <input className={inputClass} type="number" min="1960" max="2030" value={form.release_year} onChange={set('release_year')} placeholder="2024" />
          ), true)}
          {field('Country', (
            <select className={inputClass} value={form.country} onChange={set('country')}>
              <option value="">Select country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ))}
          {field('Director', (
            <input className={inputClass} value={form.director} onChange={set('director')} placeholder="Genevieve Nnaji" />
          ))}
          {field('Distribution status', (
            <select className={inputClass} value={form.distribution_status} onChange={set('distribution_status')}>
              <option value="">Select status</option>
              {DIST_STATUSES.map(s => <option key={s} value={s}>{capitalise(s.replace('_', ' '))}</option>)}
            </select>
          ))}
        </div>
      </section>

      {/* Media */}
      <section>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-4 pb-2 border-b border-cinema-border">
          Media
        </h2>
        <div className="space-y-4">
          {field('Poster URL', (
            <input className={inputClass} type="url" value={form.poster_url} onChange={set('poster_url')} placeholder="https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg" />
          ), true)}
          {form.poster_url && (
            <img
              src={form.poster_url}
              alt="Poster preview"
              className="w-24 rounded border border-cinema-border object-cover"
              style={{ aspectRatio: '2/3' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          {field('YouTube URL (trailer/watch link)', (
            <input className={inputClass} type="url" value={form.youtube_url} onChange={set('youtube_url')} placeholder="https://www.youtube.com/watch?v=VIDEO_ID" />
          ))}
        </div>
      </section>

      {/* Context */}
      <section>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-4 pb-2 border-b border-cinema-border">
          Context and discovery
        </h2>
        <div className="space-y-4">
          {field('Cultural context', (
            <textarea className={textareaClass} rows={3} value={form.cultural_context} onChange={set('cultural_context')} placeholder="Historical background, cultural significance, filming locations, etc." />
          ))}
          {field('Keywords', (
            <input className={inputClass} value={form.keywords} onChange={set('keywords')} placeholder="nollywood, family drama, lagos, 2024" />
          ))}
        </div>
      </section>

      {/* Streaming availability */}
      <section>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-4 pb-2 border-b border-cinema-border">
          Streaming availability
        </h2>

        {/* Existing links */}
        {streamingLinks.length > 0 && (
          <div className="space-y-2 mb-4">
            {streamingLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-cinema-surface rounded-lg border border-cinema-border">
                <span className="text-sm font-medium text-film-cream flex-1">{link.platform}</span>
                {link.free && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-film-gold/15 text-film-amber border border-film-gold/20">
                    FREE
                  </span>
                )}
                <span className="text-xs text-film-muted truncate max-w-[200px]">{link.url}</span>
                <button
                  type="button"
                  onClick={() => removeStreamingLink(i)}
                  className="p-1 text-film-subtle hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label={`Remove ${link.platform}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new link */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto_auto] gap-2 items-end">
          <div>
            <label className="block text-xs text-film-muted mb-1">Platform</label>
            <select
              className={inputClass}
              value={newLink.platform}
              onChange={e => setNewLink(prev => ({ ...prev, platform: e.target.value }))}
            >
              <option value="">Select</option>
              {STREAMING_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-film-muted mb-1">URL</label>
            <input
              className={inputClass}
              type="url"
              value={newLink.url}
              onChange={e => setNewLink(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>
          <label className="flex items-center gap-2 pb-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newLink.free}
              onChange={e => setNewLink(prev => ({ ...prev, free: e.target.checked }))}
              className="w-4 h-4 rounded accent-film-gold"
            />
            <span className="text-sm text-film-muted whitespace-nowrap">Free</span>
          </label>
          <button
            type="button"
            onClick={addStreamingLink}
            disabled={!newLink.platform || !newLink.url.trim()}
            className="btn-outline p-2 disabled:opacity-40 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="text-sm">Add</span>
          </button>
        </div>
      </section>

      {/* Flags */}
      <section>
        <h2 className="text-xs font-semibold text-film-muted uppercase tracking-widest mb-4 pb-2 border-b border-cinema-border">
          Editorial flags
        </h2>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))}
              className="w-4 h-4 rounded accent-film-gold"
            />
            <div>
              <span className="text-sm font-medium text-film-cream">Featured on homepage</span>
              <p className="text-xs text-film-muted">Appears in the Featured section on the MuvieStars homepage.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_canon}
              onChange={e => setForm(prev => ({ ...prev, is_canon: e.target.checked }))}
              className="w-4 h-4 rounded accent-film-gold"
            />
            <div>
              <span className="text-sm font-medium text-film-cream">African Film Canon</span>
              <p className="text-xs text-film-muted">Marks this film as part of the curated essential African cinema list.</p>
            </div>
          </label>
        </div>

        {/* Canon Essay — only shown when is_canon is checked */}
        {form.is_canon && (
          <div className="mt-5 space-y-4 border-l-2 border-film-gold/30 pl-5">
            <div>
              <label className="block text-xs font-semibold text-film-gold uppercase tracking-wider mb-2">
                Canon Essay
              </label>
              <p className="text-xs text-film-muted mb-3">
                Why this film belongs in the Canon. Write about its cultural significance, artistic achievement,
                and lasting impact. This appears on the film detail page and the Canon listing.
              </p>
              <textarea
                value={form.canon_essay}
                onChange={e => setForm(prev => ({ ...prev, canon_essay: e.target.value }))}
                placeholder="Write about what makes this film essential to African cinema history..."
                rows={10}
                className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2.5 text-sm text-film-cream placeholder-film-subtle outline-none focus:border-film-gold/50 transition-colors resize-y leading-relaxed"
              />
              <p className="text-xs text-film-subtle mt-1.5 text-right">
                {form.canon_essay.length} characters
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-film-muted mb-1.5">
                Essay author
              </label>
              <input
                type="text"
                value={form.canon_essay_author}
                onChange={e => setForm(prev => ({ ...prev, canon_essay_author: e.target.value }))}
                placeholder="MuvieStars Editorial"
                className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2.5 text-sm text-film-cream placeholder-film-subtle outline-none focus:border-film-gold/50 transition-colors"
              />
            </div>
          </div>
        )}
      </section>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2 border-t border-cinema-border">
        <button type="submit" disabled={saving} className="btn-gold disabled:opacity-50">
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add to database'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
