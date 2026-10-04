'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MIN_REASON_LENGTH } from '@/lib/awards-shared'

export interface DeskRecord {
  id: string
  code: string
  categoryName: string
  label: string
  sub: string
  status: string
  statusNote: string | null
  supersededBy: string | null
  story: string
  /** Other nominees on the same shortlist that a correction could name. */
  candidates: Array<{ id: string; label: string; sub: string }>
}

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }
const BTN: React.CSSProperties = { minHeight: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(237,228,210,0.18)', color: '#C7BFB2', fontSize: '14px', cursor: 'pointer' }
const GOLD: React.CSSProperties = { ...BTN, background: 'rgba(200,150,62,0.15)', borderColor: 'rgba(200,150,62,0.4)', color: '#C8963E', fontWeight: 600 }
const INPUT: React.CSSProperties = { width: '100%', minHeight: '40px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(237,228,210,0.12)', background: '#15120E', color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

const STATUS_COLOUR: Record<string, string> = { valid: '#7FA88B', under_review: '#E8A020', corrected: '#E8A020', revoked: '#E58A7B' }
const STATUS_WORD: Record<string, string> = { valid: 'Valid', under_review: 'Under review', corrected: 'Corrected', revoked: 'Revoked' }

type Mode = null | 'review' | 'story' | 'upheld' | 'corrected' | 'revoked'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: '#A39B8F' }}>
      {label}
      {children}
      {hint && <span style={{ fontSize: '12px', color: '#6E675E' }}>{hint}</span>}
    </label>
  )
}

function RecordCard({ rec }: { rec: DeskRecord }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [mode, setMode] = useState<Mode>(null)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [story, setStory] = useState(rec.story)
  const [nominee, setNominee] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function close() { setMode(null); setReason(''); setNote(''); setStory(rec.story); setNominee(''); setError(null) }

  async function send(fn: string, args: Record<string, unknown>, message: string) {
    if (reason.trim().length < MIN_REASON_LENGTH) { setError('Say why, in at least a few words. The reason is kept in the record of changes and is never shown publicly.'); return }
    setBusy(true); setError(null)
    const { error: err } = await supabase.rpc(fn, args)
    setBusy(false)
    if (err) { setError(err.code === '42501' ? 'Only awards administrators can do that.' : err.message); return }
    setDone(message)
    close()
    router.refresh()
  }

  const standing = rec.status === 'valid'
  const reviewing = rec.status === 'under_review'

  return (
    <li style={{ padding: '18px 0', borderTop: '1px solid rgba(237,228,210,0.08)', display: 'grid', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <div>
          <p style={{ margin: 0, fontSize: '16px', color: '#F6EFE2' }}>{rec.categoryName}: {rec.label} <span style={{ color: '#8C857A' }}>{rec.sub}</span></p>
          <p style={{ ...MONO, margin: '2px 0 0', fontSize: '12px', color: '#8C857A' }}>{rec.code}</p>
        </div>
        <span style={{ ...MONO, fontSize: '12px', color: STATUS_COLOUR[rec.status] ?? '#8C857A' }}>{STATUS_WORD[rec.status] ?? rec.status}</span>
      </div>

      {rec.statusNote && rec.status !== 'valid' && <p style={{ margin: 0, fontSize: '13px', color: '#A39B8F' }}>Public note: {rec.statusNote}</p>}
      {rec.supersededBy && <p style={{ margin: 0, fontSize: '13px', color: '#A39B8F' }}>Replaced by {rec.supersededBy}.</p>}
      {done && <p role="status" style={{ margin: 0, fontSize: '13px', color: '#7FA88B' }}>{done}</p>}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Link href={`/recognition/${rec.code}`} style={{ ...BTN, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Open the record</Link>
        {(standing || reviewing) && <Link href={`/recognition/${rec.code}/laurel`} style={{ ...BTN, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>Laurel files</Link>}
        {standing && mode === null && (
          <>
            <button style={BTN} onClick={() => { setMode('story'); setDone(null) }}>Edit the story</button>
            <button style={{ ...BTN, color: '#E8A020' }} onClick={() => { setMode('review'); setDone(null) }}>Open a review</button>
          </>
        )}
        {reviewing && mode === null && (
          <>
            <button style={GOLD} onClick={() => { setMode('upheld'); setDone(null) }}>Uphold it</button>
            <button style={BTN} onClick={() => { setMode('corrected'); setDone(null) }}>Correct to another winner</button>
            <button style={{ ...BTN, color: '#E58A7B' }} onClick={() => { setMode('revoked'); setDone(null) }}>Revoke it</button>
          </>
        )}
      </div>

      {mode && (
        <div style={{ display: 'grid', gap: '12px', padding: '16px', borderRadius: '12px', border: '1px solid rgba(237,228,210,0.12)', background: '#0F0D0B', maxWidth: '640px' }}>
          {mode === 'review' && <p style={{ margin: 0, fontSize: '13px', color: '#A39B8F' }}>The honour stays visible with a note while someone checks. New laurel downloads pause for everyone but administrators.</p>}
          {mode === 'corrected' && (
            <>
              <p style={{ margin: 0, fontSize: '13px', color: '#A39B8F' }}>The old record is kept, marked corrected, and points to a new record with its own verification ID. Nothing is rewritten in silence.</p>
              <Field label="Who should have won">
                <select value={nominee} onChange={(e) => setNominee(e.target.value)} style={INPUT} aria-label="Who should have won">
                  <option value="">Pick a nominee from this shortlist</option>
                  {rec.candidates.map((c) => <option key={c.id} value={c.id}>{c.label} {c.sub}</option>)}
                </select>
              </Field>
            </>
          )}
          {mode === 'revoked' && <p style={{ margin: 0, fontSize: '13px', color: '#A39B8F' }}>The record stays public, marked revoked, with your explanation. Its laurel stops being available.</p>}

          {(mode === 'story' || mode === 'corrected') && (
            <Field label={mode === 'story' ? 'The new story (80 characters or more)' : 'The new winner’s story (80 characters or more)'}>
              <textarea rows={4} value={story} onChange={(e) => setStory(e.target.value)} style={{ ...INPUT, lineHeight: 1.5, resize: 'vertical' }} />
            </Field>
          )}
          <Field
            label={mode === 'upheld' ? 'What the public will read (optional)' : mode === 'review' ? 'What the public will read (optional)' : mode === 'story' ? 'What changed, for the public note' : 'What the public will read (20 characters or more)'}
            hint={mode === 'review' ? 'If you leave it empty the page says the result is being checked.' : undefined}
          >
            <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ ...INPUT, lineHeight: 1.5, resize: 'vertical' }} />
          </Field>
          <Field label="Why you are doing this (private, kept in the record of changes)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} style={INPUT} />
          </Field>
          {error && <p role="alert" style={{ margin: 0, fontSize: '13px', color: '#E58A7B' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              disabled={busy}
              style={{ ...GOLD, opacity: busy ? 0.6 : 1 }}
              onClick={() => {
                if (mode === 'review') return send('award_open_recognition_review', { p_recognition: rec.id, p_reason: reason.trim(), p_public_note: note.trim() || null }, 'The honour is under review.')
                if (mode === 'story') return send('award_correct_recognition_story', { p_recognition: rec.id, p_story: story, p_reason: reason.trim(), p_public_note: note.trim() }, 'The story is updated and the page says it was edited.')
                if (mode === 'upheld') return send('award_resolve_recognition_review', { p_recognition: rec.id, p_outcome: 'upheld', p_reason: reason.trim(), p_public_note: note.trim() || null }, 'The review is closed and the honour stands.')
                if (mode === 'revoked') return send('award_resolve_recognition_review', { p_recognition: rec.id, p_outcome: 'revoked', p_reason: reason.trim(), p_public_note: note.trim() }, 'The honour is revoked and the page explains why.')
                return send('award_resolve_recognition_review', { p_recognition: rec.id, p_outcome: 'corrected', p_reason: reason.trim(), p_public_note: note.trim(), p_new_nominee: nominee || null, p_new_story: story }, 'The result is corrected. A new record has its own verification ID.')
              }}
            >
              {busy ? 'Saving...' : mode === 'review' ? 'Put it under review' : mode === 'story' ? 'Save the new story' : mode === 'upheld' ? 'Close the review, honour stands' : mode === 'revoked' ? 'Revoke this honour' : 'Issue the correction'}
            </button>
            <button style={BTN} onClick={close}>Not now</button>
          </div>
        </div>
      )}
    </li>
  )
}

/** Published honours for one cycle: look at them, edit a story, or put one through a review that ends on the record. */
export function RecognitionDesk({ records }: { records: DeskRecord[] }) {
  return (
    <section aria-labelledby="records-heading" style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B', maxWidth: '900px', marginTop: '36px' }}>
      <h2 id="records-heading" style={{ ...MONO, margin: '0 0 6px', fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E' }}>Published honours and corrections</h2>
      <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.6, color: '#A39B8F' }}>
        A published result is never edited in silence. A review puts a public note on the record, and how it ends is written there for everyone to read. Your private reasons go to the record of changes.
      </p>
      {records.length === 0 ? (
        <p style={{ margin: 0, fontSize: '14px', color: '#8C857A' }}>Nothing has been published for this cycle yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {records.map((r) => <RecordCard key={r.id} rec={r} />)}
        </ul>
      )}
    </section>
  )
}
