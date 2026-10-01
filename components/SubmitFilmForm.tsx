'use client'

import { useEffect, useState } from 'react'
import { SUBMITTER_ROLES } from '@/lib/submissions'

const FIELD: React.CSSProperties = {
  width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '12px', boxSizing: 'border-box',
  border: '1px solid rgba(237,228,210,0.16)', background: '#15120E', color: '#EDE4D2',
  fontSize: '16px', fontFamily: 'inherit', outline: 'none',
}
const LABEL: React.CSSProperties = { display: 'block', fontSize: '14px', color: '#C7BFB2', marginBottom: '6px' }
const HINT: React.CSSProperties = { margin: '6px 0 0', fontSize: '13px', color: '#8C857A', lineHeight: 1.5 }

interface Props {
  defaultEmail?: string
}

export function SubmitFilmForm({ defaultEmail = '' }: Props) {
  const [busy, setBusy] = useState(false)
  // Until the page's scripts have loaded, a tap would submit the form the old way and put what was typed
  // in the address bar. Hold the button until the form can send itself.
  const [ready, setReady] = useState(false)
  useEffect(() => { setReady(true) }, [])
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const get = (k: string) => String(form.get(k) ?? '')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: get('title'), release_year: get('release_year'), country: get('country'), director: get('director'),
          synopsis: get('synopsis'), submitter_role: get('submitter_role'), organisation: get('organisation'),
          contact_email: get('contact_email'), evidence_url: get('evidence_url'), poster_url: get('poster_url'),
          rights_confirmed: form.get('rights_confirmed') === 'on',
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'Your film did not go through. Check your connection and tap Send again.')
        return
      }
      setSent(get('title').trim())
    } catch {
      setError('We could not reach MuvieStars just now. Check your connection and tap Send again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div role="status" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.4)', background: 'rgba(200,150,62,0.08)' }}>
        <p style={{ margin: '0 0 6px', fontSize: '20px', color: '#F6EFE2' }}>{sent} is with us.</p>
        <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#C7BFB2' }}>
          An editor will check it against our listing rules and write to you at the email you gave. Sending a film does not list it. You can follow its status below.
        </p>
      </div>
    )
  }

  return (
    <form method="post" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }} noValidate>
      <div>
        <label htmlFor="s-title" style={LABEL}>What is the film called?</label>
        <input id="s-title" name="title" required maxLength={120} style={FIELD} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="s-year" style={LABEL}>Year it was released or made</label>
          <input id="s-year" name="release_year" inputMode="numeric" required maxLength={4} placeholder="2023" style={FIELD} />
        </div>
        <div>
          <label htmlFor="s-country" style={LABEL}>Which country is it from?</label>
          <input id="s-country" name="country" required maxLength={80} placeholder="Ghana" style={FIELD} />
        </div>
      </div>

      <div>
        <label htmlFor="s-director" style={LABEL}>Who directed it? (optional)</label>
        <input id="s-director" name="director" maxLength={120} style={FIELD} />
      </div>

      <div>
        <label htmlFor="s-synopsis" style={LABEL}>What is it about?</label>
        <textarea id="s-synopsis" name="synopsis" required rows={5} maxLength={2000} style={{ ...FIELD, padding: '12px 14px', lineHeight: 1.55, resize: 'vertical' }} />
        <p style={HINT}>A few honest sentences, as you would tell a friend. At least 40 characters.</p>
      </div>

      <div>
        <label htmlFor="s-evidence" style={LABEL}>Where can we see that it has been released or shown?</label>
        <input id="s-evidence" name="evidence_url" type="url" required placeholder="https://" style={FIELD} />
        <p style={HINT}>A YouTube link, a streaming page or a festival page. An editor will look at it.</p>
      </div>

      <div>
        <label htmlFor="s-poster" style={LABEL}>Link to the poster (optional)</label>
        <input id="s-poster" name="poster_url" type="url" placeholder="https://" style={FIELD} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="s-role" style={LABEL}>How are you connected to it?</label>
          <select id="s-role" name="submitter_role" required defaultValue="" style={{ ...FIELD, cursor: 'pointer' }}>
            <option value="" disabled>Pick one</option>
            {SUBMITTER_ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="s-org" style={LABEL}>Company or collective (optional)</label>
          <input id="s-org" name="organisation" maxLength={120} style={FIELD} />
        </div>
      </div>

      <div>
        <label htmlFor="s-email" style={LABEL}>Which email can we reach you on?</label>
        <input id="s-email" name="contact_email" type="email" required defaultValue={defaultEmail} style={FIELD} />
        <p style={HINT}>Only our editors see this.</p>
      </div>

      <label style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', minHeight: '44px', cursor: 'pointer', fontSize: '15px', lineHeight: 1.5, color: '#EDE4D2' }}>
        <input type="checkbox" name="rights_confirmed" style={{ width: '22px', height: '22px', marginTop: '2px', accentColor: '#C8963E', flexShrink: 0 }} />
        <span>I own the rights to this film, or I am authorised by the people who do to put it forward.</span>
      </label>

      {error && <p role="alert" style={{ margin: 0, fontSize: '15px', color: '#E58A7B', lineHeight: 1.5 }}>{error}</p>}

      <div>
        <button
          type="submit"
          disabled={busy || !ready}
          style={{ minHeight: '56px', padding: '0 28px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '17px', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          {busy ? 'Sending your film...' : 'Send my film for review'}
        </button>
      </div>
    </form>
  )
}
