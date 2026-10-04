'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const RUBRIC = [
  { key: 'story', label: 'Story and screenplay' },
  { key: 'direction', label: 'Direction' },
  { key: 'performances', label: 'Performances' },
  { key: 'craft', label: 'Craft execution' },
  { key: 'impact', label: 'Cultural and thematic impact' },
  { key: 'cohesion', label: 'Overall cohesion' },
] as const

interface Existing { rubric: Record<string, number>; total: number | null; notes: string | null; recused: boolean; recusalReason: string | null }
interface Props {
  nomineeId: string
  title: string
  detail: string
  href: string
  existing: Existing | null
  open: boolean
}

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }
const FIELD: React.CSSProperties = { width: '100%', minHeight: '44px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(237,228,210,0.16)', background: '#15120E', color: '#EDE4D2', fontSize: '16px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

/** One nominee, one judge. Score every part of the rubric from 1 to 10, or step out with a reason. */
export function JuryScoreCard({ nomineeId, title, detail, href, existing, open }: Props) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(RUBRIC.map((r) => [r.key, existing?.rubric?.[r.key] ? String(existing.rubric[r.key]) : ''])))
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [recusing, setRecusing] = useState(false)
  const [reason, setReason] = useState(existing?.recusalReason ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(recused: boolean) {
    setError(null); setDone(null)
    const rubric: Record<string, number> = {}
    if (!recused) {
      for (const r of RUBRIC) {
        const n = Number(values[r.key])
        if (!Number.isFinite(n) || n < 1 || n > 10) { setError(`Score ${r.label.toLowerCase()} from 1 to 10.`); return }
        rubric[r.key] = n
      }
    } else if (reason.trim().length < 10) {
      setError('Say how you are connected to this nominee, in a few words.'); return
    }
    setBusy(true)
    const supabase = createClient() as any
    const { data, error: err } = await supabase.rpc('award_submit_jury_score', {
      p_nominee: nomineeId, p_rubric: rubric, p_notes: notes.trim() || null, p_recused: recused, p_recusal_reason: recused ? reason.trim() : null,
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setDone(recused ? 'You have stepped out of judging this nominee.' : `Saved. Your total for this nominee is ${data?.total}.`)
    setRecusing(false)
    router.refresh()
  }

  return (
    <li style={{ borderTop: '1px solid rgba(237,228,210,0.1)', padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'baseline' }}>
        <Link href={href} style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontSize: '30px', lineHeight: 1.1, color: '#F6EFE2', textDecoration: 'none' }}>{title}</Link>
        <span style={{ ...MONO, fontSize: '12px', color: existing?.recused ? '#E8A020' : existing ? '#7FA88B' : '#8C857A' }}>
          {existing?.recused ? 'You stepped out' : existing ? `Your score ${existing.total}` : 'Not scored yet'}
        </span>
      </div>
      <p style={{ margin: '4px 0 14px', fontSize: '14px', color: '#8C857A' }}>{detail}</p>

      {!open ? (
        <p style={{ margin: 0, fontSize: '14px', color: '#6E675E' }}>Scoring is closed.</p>
      ) : (
        <div style={{ display: 'grid', gap: '12px', maxWidth: '560px' }}>
          {existing?.recused && !recusing && (
            <p style={{ margin: 0, fontSize: '14px', color: '#A39B8F' }}>You stepped out of this nominee: {existing.recusalReason}. Score it below if that has changed.</p>
          )}
          {!recusing && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {RUBRIC.map((r) => (
                <label key={r.key} style={{ display: 'grid', gap: '4px', fontSize: '13px', color: '#A39B8F' }}>
                  {r.label}
                  <input
                    inputMode="numeric"
                    aria-label={`${title}: ${r.label}, 1 to 10`}
                    value={values[r.key]}
                    maxLength={2}
                    placeholder="1 to 10"
                    onChange={(e) => setValues({ ...values, [r.key]: e.target.value.replace(/[^0-9]/g, '') })}
                    style={FIELD}
                  />
                </label>
              ))}
            </div>
          )}
          {!recusing ? (
            <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: '#A39B8F' }}>
              Notes for the editors (private)
              <textarea rows={2} maxLength={1500} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...FIELD, padding: '10px 12px', lineHeight: 1.5, resize: 'vertical' }} />
            </label>
          ) : (
            <label style={{ display: 'grid', gap: '4px', fontSize: '14px', color: '#C7BFB2' }}>
              How are you connected to this nominee?
              <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} style={FIELD} placeholder="For example, I edited this film" />
            </label>
          )}
          {error && <p role="alert" style={{ margin: 0, fontSize: '14px', color: '#E58A7B' }}>{error}</p>}
          {done && <p role="status" style={{ margin: 0, fontSize: '14px', color: '#7FA88B' }}>{done}</p>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {!recusing ? (
              <>
                <button type="button" disabled={busy} onClick={() => submit(false)} style={{ minHeight: '48px', padding: '0 22px', borderRadius: '12px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Saving your score...' : existing && !existing.recused ? 'Update my score' : 'Save my score'}
                </button>
                <button type="button" onClick={() => { setRecusing(true); setError(null) }} style={{ minHeight: '48px', padding: '0 16px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(237,228,210,0.18)', color: '#C7BFB2', fontSize: '14px', cursor: 'pointer' }}>
                  I have a conflict, step me out
                </button>
              </>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={() => submit(true)} style={{ minHeight: '48px', padding: '0 22px', borderRadius: '12px', background: '#C8963E', color: '#0B0A09', border: 'none', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                  {busy ? 'Saving...' : 'Step me out of this nominee'}
                </button>
                <button type="button" onClick={() => { setRecusing(false); setError(null) }} style={{ minHeight: '48px', padding: '0 16px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(237,228,210,0.18)', color: '#C7BFB2', fontSize: '14px', cursor: 'pointer' }}>
                  Back to scoring
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
