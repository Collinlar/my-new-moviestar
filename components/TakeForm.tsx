'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { SharePanel } from '@/components/SharePanel'
import {
  FULL_REVIEW_MAX, MAX_TAGS, QUICK_TAKE_MAX, REACTIONS, TAGS,
  type ReactionKey,
} from '@/lib/reactions'

interface Props {
  movieId: string
  movieTitle: string
}

interface Saved {
  token: string | null
  review: 'submitted' | 'updated' | 'unchanged' | null
  /** Movie DNA has unlocked and the person has not opened it yet. */
  dnaReady: boolean
  /** Challenges this take finished. */
  completed: Array<{ slug: string; title: string }>
  /** What the take contained, so the share panel only offers choices that change something. */
  snapshot: { rating: number | null; words: string | null; tags: number }
}

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

/** Everything a person can say about a film in one place: reaction, stars, standout tags, a one-liner and an optional longer review. */
export function TakeForm({ movieId, movieTitle }: Props) {
  const supabase = useMemo(() => createClient() as any, [])

  const [loading, setLoading]   = useState(true)
  const [userId, setUserId]     = useState<string | null>(null)
  const [hasTake, setHasTake]   = useState(false)
  const [reviewStatus, setReviewStatus] = useState<string | null>(null)

  const [reaction, setReaction] = useState<ReactionKey | null>(null)
  const [rating, setRating]     = useState(0)
  const [hover, setHover]       = useState(0)
  const [tags, setTags]         = useState<string[]>([])
  const [oneLiner, setOneLiner] = useState('')
  const [longText, setLongText] = useState('')
  const [showLong, setShowLong] = useState(false)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState<Saved | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { setLoading(false); return }
      setUserId(user.id)

      const [{ data: rx }, { data: rv }] = await Promise.all([
        supabase
          .from('movie_reactions')
          .select('reaction, rating, one_liner, movie_reaction_tags(reaction_tags(slug))')
          .eq('movie_id', movieId).eq('user_id', user.id).maybeSingle(),
        supabase
          .from('reviews')
          .select('rating, content, status')
          .eq('movie_id', movieId).eq('user_id', user.id).maybeSingle(),
      ])
      if (cancelled) return

      if (rx) {
        setHasTake(true)
        setReaction(rx.reaction)
        setRating(rx.rating ?? rv?.rating ?? 0)
        setOneLiner(rx.one_liner ?? '')
        setTags(((rx.movie_reaction_tags ?? []) as any[]).map(t => t.reaction_tags?.slug).filter(Boolean))
      } else if (rv) {
        setRating(rv.rating)
      }
      if (rv?.content) {
        setLongText(rv.content)
        setShowLong(true)
        setReviewStatus(rv.status)
        setHasTake(true)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [movieId, supabase])

  const toggleTag = (slug: string) =>
    setTags(prev => prev.includes(slug) ? prev.filter(t => t !== slug) : prev.length < MAX_TAGS ? [...prev, slug] : prev)

  const submit = async () => {
    if (!reaction) { toast.error('Pick how the film left you feeling first.'); return }
    if (longText.trim() && !rating) { toast.error('Add a star rating to go with your longer review.'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movieId,
          reaction,
          rating: rating || null,
          tags,
          one_liner: oneLiner.trim() || null,
          review_text: longText.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.saved) {
        toast.error(json.error ?? 'Your take did not save. Check your connection and tap Save again.')
        return
      }
      setSaved({
        token: json.shareToken ?? null,
        review: json.review ?? null,
        completed: Array.isArray(json.completed) ? json.completed : [],
        dnaReady: !!json.dnaReady,
        snapshot: { rating: rating || null, words: oneLiner.trim() || null, tags: tags.length },
      })
      setHasTake(true)
      if (json.review === 'submitted' || json.review === 'updated') setReviewStatus('pending')
    } catch {
      toast.error('Your take did not save. Check your connection and tap Save again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  if (!userId) {
    return (
      <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-film-muted">Sign in to say what you thought of {movieTitle}.</p>
        <Link href={`/auth?next=/movie/${movieId}`} className="btn-gold text-sm flex-shrink-0">
          Sign in to add my take
        </Link>
      </div>
    )
  }

  if (saved) {
    return (
      <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6 space-y-3" role="status">
        <p className="text-base font-semibold text-film-cream">Your take is saved.</p>
        {saved.review === 'submitted' || saved.review === 'updated' ? (
          <p className="text-sm text-film-muted">Your longer review is with our moderators. It appears once approved.</p>
        ) : null}
        {saved.completed.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {saved.completed.map(c => (
                  <Link
                    key={c.slug}
                    href={`/challenges/${c.slug}`}
                    style={{ display: 'block', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.45)', background: 'rgba(200,150,62,0.1)', textDecoration: 'none', minHeight: '44px' }}
                  >
                    <span style={{ display: 'block', fontSize: '13px', color: '#C8963E', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"Geist Mono", monospace' }}>Challenge finished</span>
                    <span style={{ display: 'block', fontSize: '16px', color: '#F6EFE2', marginTop: '2px' }}>{c.title}. Tap to collect your laurel.</span>
                  </Link>
                ))}
              </div>
            )}

        {saved.dnaReady && (
              <Link
                href="/dna"
                style={{ display: 'block', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.45)', background: 'rgba(200,150,62,0.1)', textDecoration: 'none', minHeight: '44px' }}
              >
                <span style={{ display: 'block', fontSize: '13px', color: '#C8963E', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"Geist Mono", monospace' }}>Movie DNA</span>
                <span style={{ display: 'block', fontSize: '16px', color: '#F6EFE2', marginTop: '2px' }}>Your Movie DNA is ready. Tap to see it.</span>
              </Link>
            )}

        {saved.token && (
          <div className="pt-2">
            <p className="text-xs text-film-muted mb-3">Share it with people who love African cinema. You choose what shows.</p>
            <SharePanel
              token={saved.token}
              title={movieTitle}
              has={{ rating: !!saved.snapshot.rating, words: !!saved.snapshot.words, tags: saved.snapshot.tags > 0 }}
              words={saved.snapshot.words ?? undefined}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3 items-center">
          <button type="button" onClick={() => setSaved(null)} className="btn-ghost text-sm">Edit my take</button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-cinema-dark border border-cinema-border rounded-xl p-5 mb-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-film-cream">{hasTake ? 'Edit your take' : `What did you think of ${movieTitle}?`}</h3>
        <p className="text-xs text-film-muted mt-1">Takes five seconds. Add as much or as little as you like.</p>
      </div>

      {/* Reaction */}
      <div role="radiogroup" aria-label="How did it leave you feeling" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {REACTIONS.map(r => {
          const on = reaction === r.key
          return (
            <button
              key={r.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setReaction(r.key)}
              className={`min-h-[56px] rounded-xl border px-3 py-2 flex items-center justify-center gap-2 text-sm transition-colors ${
                on ? 'border-film-gold bg-film-gold/10 text-film-cream' : 'border-cinema-border bg-cinema-surface text-film-muted hover:text-film-cream'
              }`}
            >
              <span aria-hidden="true" className="text-xl leading-none">{r.emoji}</span>
              {r.label}
            </button>
          )
        })}
      </div>

      {/* Stars */}
      <div>
        <p className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Your rating</p>
        <div className="flex items-center gap-1" role="group" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(rating === n ? 0 : n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="w-11 h-11 flex items-center justify-center focus:outline-none focus-visible:ring-2 ring-film-gold rounded"
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
            >
              <Star className={`w-7 h-7 transition-colors ${n <= (hover || rating) ? 'text-film-amber fill-current' : 'text-cinema-border'}`} />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-sm text-film-muted" style={MONO}>{rating}/5</span>}
        </div>
      </div>

      {/* Tags */}
      <div>
        <p className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">
          What stood out <span className="normal-case font-normal text-film-subtle">(up to {MAX_TAGS})</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(t => {
            const on = tags.includes(t.slug)
            const maxed = !on && tags.length >= MAX_TAGS
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleTag(t.slug)}
                disabled={maxed}
                aria-pressed={on}
                className={`min-h-[44px] px-4 rounded-full text-sm border transition-colors ${
                  on ? 'bg-film-gold text-cinema-black border-film-gold font-semibold'
                    : maxed ? 'border-cinema-border text-film-subtle opacity-50'
                    : 'border-cinema-border bg-cinema-surface text-film-muted hover:text-film-cream'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* One sentence */}
      <div>
        <label htmlFor={`qt-${movieId}`} className="text-xs font-semibold text-film-muted uppercase tracking-wide block mb-2">In one sentence</label>
        <div className="relative">
          <textarea
            id={`qt-${movieId}`}
            value={oneLiner}
            onChange={e => setOneLiner(e.target.value.slice(0, QUICK_TAKE_MAX))}
            rows={2}
            placeholder="Great chemistry, but the ending felt rushed."
            className="cinema-input w-full resize-none text-base"
          />
          <span className="absolute bottom-2 right-3 text-[11px] text-film-subtle" style={MONO}>{QUICK_TAKE_MAX - oneLiner.length}</span>
        </div>
      </div>

      {/* Longer review */}
      {showLong ? (
        <div>
          <label htmlFor={`fr-${movieId}`} className="text-xs font-semibold text-film-muted uppercase tracking-wide block mb-2">
            Your longer review
          </label>
          <textarea
            id={`fr-${movieId}`}
            value={longText}
            onChange={e => setLongText(e.target.value.slice(0, FULL_REVIEW_MAX))}
            rows={6}
            placeholder="What worked, what did not, and who should watch it."
            className="cinema-input w-full resize-y text-base"
          />
          <p className="text-xs text-film-subtle mt-1">
            {reviewStatus === 'pending'
              ? 'Your longer review is with our moderators.'
              : reviewStatus === 'approved'
                ? 'Your longer review is published. Editing it sends it back for approval.'
                : 'Longer reviews are checked by a moderator before they appear.'}
          </p>
        </div>
      ) : (
        <button type="button" onClick={() => setShowLong(true)} className="text-sm text-film-gold hover:underline min-h-[44px]">
          Want to say more? Write a longer review
        </button>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !reaction}
          className="btn-gold text-sm min-h-[48px] disabled:opacity-50"
        >
          {saving ? 'Saving your take...' : hasTake ? 'Update my take' : 'Save my take'}
        </button>
        {!reaction && <span className="text-xs text-film-subtle">Pick a reaction to save.</span>}
      </div>
    </div>
  )
}
