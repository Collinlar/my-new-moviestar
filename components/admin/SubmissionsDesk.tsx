'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GENRES, INDUSTRIES } from '@/lib/utils'
import { REJECTION_REASONS } from '@/lib/listing'
import { SUBMITTER_ROLES } from '@/lib/submissions'

interface Sub {
  id: string
  status: string
  title: string
  release_year: number
  country: string
  director: string | null
  synopsis: string
  submitter_role: string
  organisation: string | null
  contact_email: string
  evidence_url: string
  poster_url: string | null
  public_note: string | null
  created_at: string
  dupes: Array<{ id: string; title: string; release_year: number | null; listing_status: string }>
}

interface Decided { id: string; title: string; release_year: number; status: string; decline_reason: string | null; movie_id: string | null }

const INPUT: React.CSSProperties = {
  width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px',
  border: '1px solid rgba(237,228,210,0.12)', background: '#15120E',
  color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const BTN: React.CSSProperties = {
  minHeight: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent',
  border: '1px solid rgba(237,228,210,0.18)', color: '#C7BFB2', fontSize: '14px', cursor: 'pointer',
}

function Card({ s }: { s: Sub }) {
  const router = useRouter()
  const [mode, setMode] = useState<null | 'accept' | 'info' | 'decline'>(null)
  const [genre, setGenre] = useState('')
  const [industry, setIndustry] = useState('')
  const [note, setNote] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(action: 'accept' | 'needs_information' | 'decline') {
    setBusy(true); setError(null)
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id, action, genre, industry, note, reason }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) { setError(json?.error ?? 'That did not go through. Check your connection and tap again.'); return }
      router.refresh()
    } catch {
      setError('We could not reach MuvieStars just now. Check your connection and tap again.')
    } finally {
      setBusy(false)
    }
  }

  const role = SUBMITTER_ROLES.find((r) => r.key === s.submitter_role)?.label ?? s.submitter_role

  return (
    <li style={{ padding: '20px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span style={{ fontSize: '17px', fontWeight: 600, color: '#F6EFE2' }}>
          {s.title} <span style={{ fontWeight: 400, color: '#8C857A' }}>{s.release_year} · {s.country}{s.director ? ` · Dir. ${s.director}` : ''}</span>
        </span>
        {s.status === 'needs_information' && <span style={{ fontSize: '12px', color: '#E8A020', fontFamily: '"Geist Mono", monospace' }}>WAITING ON THE SUBMITTER</span>}
      </div>
      <p style={{ margin: '8px 0', fontSize: '14px', lineHeight: 1.6, color: '#C7BFB2', maxWidth: '720px' }}>{s.synopsis}</p>
      <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#8C857A' }}>
        {role}{s.organisation ? `, ${s.organisation}` : ''} · {s.contact_email}
      </p>
      <p style={{ margin: 0, fontSize: '13px' }}>
        <a href={s.evidence_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8FA8C8' }}>Release evidence</a>
        {s.poster_url && <> · <a href={s.poster_url} target="_blank" rel="noopener noreferrer" style={{ color: '#8FA8C8' }}>Poster</a></>}
      </p>
      {s.dupes.length > 0 && (
        <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#E8A020' }}>
          Possible duplicate in the catalogue:{' '}
          {s.dupes.map((d, i) => (
            <span key={d.id}>{i > 0 && ', '}<Link href={`/movie/${d.id}`} style={{ color: '#E8A020', textDecoration: 'underline' }}>{d.title} ({d.release_year ?? '?'}, {d.listing_status})</Link></span>
          ))}
        </p>
      )}
      {s.public_note && <p style={{ margin: '10px 0 0', fontSize: '13px', color: '#A39B8F' }}>Your last note to them: {s.public_note}</p>}

      {!mode ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
          <button style={{ ...BTN, background: 'rgba(200,150,62,0.15)', borderColor: 'rgba(200,150,62,0.4)', color: '#C8963E', fontWeight: 600 }} onClick={() => setMode('accept')}>Add to the listing queue</button>
          <button style={BTN} onClick={() => setMode('info')}>Ask for more</button>
          <button style={{ ...BTN, color: '#E58A7B' }} onClick={() => setMode('decline')}>Turn down</button>
        </div>
      ) : (
        <div style={{ marginTop: '14px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.1)', background: '#0F0D0B', display: 'grid', gap: '12px', maxWidth: '560px' }}>
          {mode === 'accept' && (
            <>
              <select aria-label="Genre" style={{ ...INPUT, cursor: 'pointer' }} value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">Pick the genre</option>
                {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <select aria-label="Industry" style={{ ...INPUT, cursor: 'pointer' }} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">Industry (leave blank if unsure)</option>
                {INDUSTRIES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input aria-label="Note to the submitter" style={INPUT} value={note} maxLength={500} placeholder="A note for the submitter (optional)" onChange={(e) => setNote(e.target.value)} />
            </>
          )}
          {mode === 'info' && (
            <textarea aria-label="What you need from them" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What do you need from them? They will see this." style={{ ...INPUT, height: 'auto', padding: '10px 12px', lineHeight: 1.5 }} />
          )}
          {mode === 'decline' && (
            <>
              <select aria-label="Reason" style={{ ...INPUT, cursor: 'pointer' }} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Pick a reason</option>
                {REJECTION_REASONS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
              </select>
              <input aria-label="Note to the submitter" style={INPUT} value={note} maxLength={500} placeholder="A note for the submitter (optional)" onChange={(e) => setNote(e.target.value)} />
            </>
          )}
          {error && <p role="alert" style={{ margin: 0, fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={busy}
              onClick={() => send(mode === 'accept' ? 'accept' : mode === 'info' ? 'needs_information' : 'decline')}
              style={{ ...BTN, background: '#C8963E', borderColor: '#C8963E', color: '#0B0A09', fontWeight: 600, opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Saving your decision...' : mode === 'accept' ? 'Add this film to the queue' : mode === 'info' ? 'Send my question' : 'Turn this film down'}
            </button>
            <button style={BTN} onClick={() => { setMode(null); setError(null) }}>Not now</button>
          </div>
        </div>
      )}
    </li>
  )
}

export function SubmissionsDesk({ submissions, decided }: { submissions: Sub[]; decided: Decided[] }) {
  return (
    <div style={{ maxWidth: '860px' }}>
      <h2 className="text-lg font-semibold text-film-cream mb-2">Waiting for a decision</h2>
      {submissions.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#8C857A' }}>Nothing is waiting. New submissions appear here, oldest first.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{submissions.map((s) => <Card key={s.id} s={s} />)}</ul>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-film-cream mt-10 mb-2">Recently decided</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {decided.map((d) => (
              <li key={d.id} style={{ padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.06)', fontSize: '14px', color: '#A39B8F' }}>
                {d.title} ({d.release_year}): {d.status === 'accepted' ? 'in the queue' : `turned down${d.decline_reason ? `, ${d.decline_reason.replace(/_/g, ' ')}` : ''}`}
                {d.movie_id && <> · <Link href={`/admin/listing?q=${encodeURIComponent(d.title)}`} style={{ color: '#C8963E' }}>open in the queue</Link></>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
