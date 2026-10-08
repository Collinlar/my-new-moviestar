'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDuration, isShort, type WatchCheck } from '@/lib/youtube'

const STATE_LINE: Record<WatchCheck['state'], string> = {
  ok: 'Plays. No region block found for Ghana.',
  ghana_blocked: 'Blocked in Ghana. It plays in some other countries.',
  gone: 'This video is gone, private or removed. Viewers no longer see this link.',
  not_a_video: 'This is a channel or playlist link, not one video.',
  unchecked: 'Not checked yet.',
}

/** What the last link check found for this film, and a button to run it again. Only for a film that is already saved. */
export function YouTubeCheck({ movieId, savedUrl, formUrl, check }: { movieId: string; savedUrl: string | null; formUrl: string; check: WatchCheck | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const changed = formUrl.trim() !== (savedUrl ?? '').trim()
  const empty = !formUrl.trim()

  async function run() {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/watch-checks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movie_id: movieId }) })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(json.error ?? 'That check did not go through. Try again.'); return }
      if (json.unreachable) { toast.error('We could not reach YouTube just now. Try again in a moment.'); return }
      toast.success('Link checked.')
      router.refresh()
    } catch {
      toast.error('We could not reach the server. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  const facts = check ? [check.channel_title, formatDuration(check.duration_seconds), check.captions ? 'Captions' : null, check.definition === 'hd' ? 'HD' : null].filter(Boolean) : []
  return (
    <div className="rounded-lg border border-cinema-border bg-cinema-surface p-3 text-sm">
      <p className={check?.state === 'ok' ? 'text-film-cream' : check ? 'text-film-amber' : 'text-film-muted'}>{check ? STATE_LINE[check.state] : STATE_LINE.unchecked}</p>
      {check && facts.length > 0 && <p className="text-film-muted mt-1">{facts.join(' · ')}</p>}
      {check && isShort(check.duration_seconds) && <p className="text-film-amber mt-1">Only {formatDuration(check.duration_seconds)}. This may be a trailer, not the film.</p>}
      {check?.note && check.state !== 'gone' && check.state !== 'ghana_blocked' && check.state !== 'not_a_video' && <p className="text-film-muted mt-1">{check.note}</p>}
      {check && <p className="text-xs text-film-muted mt-1">Checked {new Date(check.checked_at).toLocaleString('en-GB')}{check.source === 'oembed' ? '. Without a YouTube key we only know the video exists and who owns it.' : ''}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-outline py-1.5 text-sm disabled:opacity-40" disabled={busy || empty || changed} onClick={run}>
          {busy ? 'Asking YouTube...' : check ? 'Check this link again' : 'Check this link'}
        </button>
        {changed && !empty && <span className="text-xs text-film-muted">Save the film first so the new link is the one we check.</span>}
      </div>
    </div>
  )
}
