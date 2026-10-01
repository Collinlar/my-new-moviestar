'use client'

import { useEffect, useState } from 'react'

const FIELD: React.CSSProperties = {
  width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '12px', boxSizing: 'border-box',
  border: '1px solid rgba(237,228,210,0.16)', background: '#15120E', color: '#EDE4D2',
  fontSize: '16px', fontFamily: 'inherit', outline: 'none',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: '14px', color: '#C7BFB2', marginBottom: '6px' }

/** Nominate a film we do not have yet, by name. */
export function NominateForm() {
  const [busy, setBusy] = useState(false)
  // Until the page's scripts have loaded, a tap would submit the form the old way and put what was typed
  // in the address bar. Hold the button until the form can send itself.
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const get = (k: string) => String(form.get(k) ?? '')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: get('title'), release_year: get('release_year'), link: get('link'), reason: get('reason') }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'That nomination did not go through. Check your connection and tap again.')
        return
      }
      setDone(get('title').trim())
      formEl.reset()
    } catch {
      setError('We could not reach MuvieStars just now. Check your connection and tap again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form method="post" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
      <div>
        <label htmlFor="n-title" style={LABEL}>What is the film called?</label>
        <input id="n-title" name="title" required maxLength={120} style={FIELD} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="n-year" style={LABEL}>Year (leave blank if unsure)</label>
          <input id="n-year" name="release_year" inputMode="numeric" maxLength={4} style={FIELD} />
        </div>
        <div>
          <label htmlFor="n-link" style={LABEL}>Where can we watch it? (optional)</label>
          <input id="n-link" name="link" type="url" placeholder="https://" style={FIELD} />
        </div>
      </div>
      <div>
        <label htmlFor="n-reason" style={LABEL}>Why does it belong here? (optional)</label>
        <input id="n-reason" name="reason" maxLength={300} style={FIELD} />
      </div>
      {error && <p role="alert" style={{ margin: 0, fontSize: '15px', color: '#E58A7B' }}>{error}</p>}
      {done && <p role="status" style={{ margin: 0, fontSize: '15px', color: '#7FA88B' }}>{done} is nominated. When enough people nominate a film, an editor looks at it.</p>}
      <div>
        <button
          type="submit"
          disabled={busy || !ready}
          style={{ minHeight: '52px', padding: '0 24px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.6)', background: 'transparent', color: '#C8963E', fontSize: '16px', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Sending your nomination...' : 'Nominate this film'}
        </button>
      </div>
    </form>
  )
}
