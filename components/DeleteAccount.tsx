'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

/**
 * Delete your own account. Closed by default, spells out what goes, and only unlocks once the word is typed.
 * The database does the erasing; this just asks for it and signs the person out afterwards.
 */
export function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = word.trim().toUpperCase() === 'DELETE'

  async function erase() {
    if (!ready || busy) return
    setBusy(true)
    setError(null)
    const supabase = createClient() as any
    const { error: err } = await supabase.rpc('delete_own_account', { p_confirm: word.trim() })
    if (err) {
      setBusy(false)
      setError(
        err.code === '42501'
          ? 'Your session timed out. Sign in again, then come back here.'
          : err.message?.startsWith('An administrator')
            ? err.message
            : 'That did not go through, and nothing was deleted. Check your connection and tap the button again.',
      )
      return
    }
    // The account no longer exists, so end the session on this device and say goodbye.
    try { await supabase.auth.signOut() } catch { /* the session is already dead */ }
    window.location.assign('/goodbye')
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ minHeight: '44px', padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(229,138,123,0.4)', background: 'transparent', color: '#E58A7B', fontSize: '14px', cursor: 'pointer', ...MONO }}
      >
        Delete my account
      </button>
    )
  }

  return (
    <div style={{ maxWidth: '560px', display: 'grid', gap: '14px', padding: '20px', borderRadius: '14px', border: '1px solid rgba(229,138,123,0.35)', background: '#120E0D' }}>
      <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.6, color: '#EDE4D2' }}>
        This removes your profile, takes, reviews, lists, watchlist, votes and activity, for good. We cannot bring them back.
      </p>
      <ul style={{ margin: 0, padding: '0 0 0 20px', display: 'grid', gap: '6px', fontSize: '15px', lineHeight: 1.6, color: '#A39B8F' }}>
        <li>Films you got listed stay on MuvieStars. Your film submissions go.</li>
        <li>Honours already published stay, because they belong to the films and the people in them.</li>
        <li>If you are a named judge, your name stays on the panel and your sign-in is detached.</li>
      </ul>
      <label style={{ display: 'grid', gap: '6px', fontSize: '14px', color: '#C7BFB2' }}>
        Type DELETE to confirm
        <input
          value={word}
          onChange={(e) => setWord(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          style={{ height: '48px', padding: '0 14px', borderRadius: '10px', border: '1px solid rgba(237,228,210,0.18)', background: '#15120E', color: '#EDE4D2', fontSize: '16px', fontFamily: 'inherit', outline: 'none' }}
        />
      </label>
      {error && <p role="alert" style={{ margin: 0, fontSize: '14px', lineHeight: 1.5, color: '#E58A7B' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={erase}
          style={{ minHeight: '48px', padding: '0 20px', borderRadius: '12px', border: 'none', background: ready ? '#C4553F' : 'rgba(196,85,63,0.25)', color: ready ? '#FFF6F0' : '#8C6A62', fontSize: '15px', fontWeight: 600, cursor: ready && !busy ? 'pointer' : 'not-allowed' }}
        >
          {busy ? 'Removing your takes and profile...' : 'Delete my account for good'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setWord(''); setError(null) }}
          disabled={busy}
          style={{ minHeight: '48px', padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.18)', background: 'transparent', color: '#C7BFB2', fontSize: '15px', cursor: 'pointer' }}
        >
          Keep my account
        </button>
      </div>
    </div>
  )
}
