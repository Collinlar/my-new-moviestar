'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { EDITABLE_STAGES, MIN_REASON_LENGTH, NOT_AWARDED_COPY, STAGE_LABELS, formatMoment, type CycleStage } from '@/lib/awards-shared'

export interface WorkbenchRow {
  subjectType: string; subjectId: string; label: string; sub: string
  score: number | null; reason: string | null; metadata: Record<string, any>; override: boolean; eligible: boolean
}
export interface WorkbenchNominee {
  id: string; status: string; rank: number | null; reason: string | null
  subjectType: string; subjectId: string; label: string; sub: string
}
export interface WorkbenchCategory {
  id: string; name: string; slug: string; method: string; minNominees: number; maxNominees: number
  nominees: WorkbenchNominee[]; eligible: WorkbenchRow[]; eligibleTotal: number; ineligible: WorkbenchRow[]
}
interface Props {
  cycle: { id: string; status: string; qualificationStart: string; qualificationEnd: string; votingStart: string; votingEnd: string }
  categories: WorkbenchCategory[]
  /** Votes cast so far per category. Only awards administrators ever see this. */
  votes?: Record<string, number>
  audit: Array<{ id: string; action: string; entity: string; reason: string | null; at: string }>
}

const BTN: React.CSSProperties = {
  minHeight: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent',
  border: '1px solid rgba(237,228,210,0.18)', color: '#C7BFB2', fontSize: '14px', cursor: 'pointer',
}
const GOLD_BTN: React.CSSProperties = { ...BTN, background: 'rgba(200,150,62,0.15)', borderColor: 'rgba(200,150,62,0.4)', color: '#C8963E', fontWeight: 600 }
const INPUT: React.CSSProperties = {
  width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(237,228,210,0.12)',
  background: '#15120E', color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
}
const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

const METHOD_LABEL: Record<string, string> = { community: 'Community vote', hybrid: 'Community and jury', jury: 'Jury', editorial: 'Editorial' }
const NOMINEE_COLOUR: Record<string, string> = { proposed: '#8FA8C8', approved: '#7FA88B', withdrawn: '#8C857A', disqualified: '#E58A7B', winner: '#C8963E', runner_up: '#C8963E' }

/** A button that asks for a reason before it does anything. The reason goes into the permanent record. */
function ReasonAction({ label, confirmLabel, placeholder, onSubmit, tone }: {
  label: string; confirmLabel: string; placeholder: string; tone?: 'danger'
  onSubmit: (reason: string) => Promise<string | null>
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return <button style={{ ...BTN, ...(tone === 'danger' ? { color: '#E58A7B' } : {}) }} onClick={() => setOpen(true)}>{label}</button>
  return (
    <div style={{ display: 'grid', gap: '8px', minWidth: '260px', flexBasis: '100%' }}>
      <input aria-label={placeholder} style={INPUT} value={reason} placeholder={placeholder} onChange={(e) => setReason(e.target.value)} />
      {error && <p role="alert" style={{ margin: 0, fontSize: '13px', color: '#E58A7B' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={busy}
          style={{ ...GOLD_BTN, opacity: busy ? 0.6 : 1 }}
          onClick={async () => {
            if (reason.trim().length < MIN_REASON_LENGTH) { setError('Say why, in at least a few words. It is kept in the record of changes.'); return }
            setBusy(true); setError(null)
            const failure = await onSubmit(reason.trim())
            setBusy(false)
            if (failure) setError(failure); else { setOpen(false); setReason('') }
          }}
        >
          {busy ? 'Saving...' : confirmLabel}
        </button>
        <button style={BTN} onClick={() => { setOpen(false); setError(null) }}>Not now</button>
      </div>
    </div>
  )
}

const metricLine = (r: { score: number | null; metadata: Record<string, any> }) => {
  const m = r.metadata
  const bits: string[] = []
  if (r.score !== null) bits.push(`score ${r.score}`)
  if (m.picks !== undefined) bits.push(`${m.picks} picks`)
  if (m.unique_reviewers !== undefined) bits.push(`${m.unique_reviewers} reviewers`)
  if (m.avg_rating !== undefined) bits.push(`avg ${m.avg_rating}`)
  return bits.join(' · ')
}

export function CycleWorkbench({ cycle, categories, audit, votes = {} }: Props) {
  const router = useRouter()
  const supabase = createClient() as any
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const stage = cycle.status as CycleStage
  const editable = (EDITABLE_STAGES as readonly string[]).includes(stage)

  // Runs one award_* function. Its error messages are written for people, so they are shown as they are.
  async function rpc(fn: string, args: Record<string, unknown>, done?: string): Promise<string | null> {
    const { error } = await supabase.rpc(fn, args)
    if (error) return error.code === '42501' ? 'Only awards administrators can do that.' : error.message
    router.refresh()
    if (done) setNotice({ tone: 'ok', text: done })
    return null
  }
  async function run(key: string, fn: string, args: Record<string, unknown>, done: string) {
    setBusy(key); setNotice(null)
    const failure = await rpc(fn, args, done)
    setBusy(null)
    if (failure) setNotice({ tone: 'error', text: failure })
  }

  const proposedTotal = categories.reduce((n, k) => n + k.nominees.filter((x) => x.status === 'proposed').length, 0)

  return (
    <div style={{ display: 'grid', gap: '36px', maxWidth: '900px' }}>
      <section style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B' }}>
        <p style={{ ...MONO, margin: '0 0 6px', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C857A' }}>Stage</p>
        <p style={{ margin: '0 0 12px', fontSize: '22px', fontWeight: 600, color: '#C8963E' }}>{STAGE_LABELS[stage] ?? stage}</p>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#A39B8F', lineHeight: 1.7 }}>
          Qualification {formatMoment(cycle.qualificationStart)} to {formatMoment(cycle.qualificationEnd)}.<br />
          Voting {formatMoment(cycle.votingStart)} to {formatMoment(cycle.votingEnd)}.
        </p>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {stage === 'draft' && (
            <button style={GOLD_BTN} disabled={!!busy} onClick={() => run('q', 'award_run_qualification', { p_cycle: cycle.id }, 'Qualification has run. Check each category below.')}>
              {busy === 'q' ? 'Reading this month\'s takes...' : 'Start qualification'}
            </button>
          )}
          {editable && (
            <>
              <button style={BTN} disabled={!!busy} onClick={() => run('q', 'award_run_qualification', { p_cycle: cycle.id }, 'Qualification has been re-run with the latest takes.')}>
                {busy === 'q' ? 'Reading this month\'s takes...' : 'Re-run qualification'}
              </button>
              <button style={GOLD_BTN} disabled={!!busy} onClick={() => run('s', 'award_suggest_shortlist', { p_cycle: cycle.id }, 'Shortlist suggested. Review each nominee below.')}>
                {busy === 's' ? 'Building the shortlist...' : 'Suggest the shortlist'}
              </button>
            </>
          )}
          {stage === 'shortlist_review' && (
            <>
              <button style={BTN} disabled={!!busy || proposedTotal === 0} onClick={() => run('a', 'award_shortlist_approve_all', { p_cycle: cycle.id }, 'All proposed nominees approved.')}>
                {busy === 'a' ? 'Approving...' : `Approve all proposed (${proposedTotal})`}
              </button>
              <button style={GOLD_BTN} disabled={!!busy} onClick={() => run('p', 'award_advance_cycle', { p_cycle: cycle.id, p_to: 'shortlist_published', p_reason: null }, 'The shortlist is published.')}>
                {busy === 'p' ? 'Publishing...' : 'Publish the shortlist'}
              </button>
            </>
          )}
          {stage === 'shortlist_published' && (
            <button style={GOLD_BTN} disabled={!!busy} onClick={() => run('v', 'award_advance_cycle', { p_cycle: cycle.id, p_to: 'voting_open', p_reason: null }, 'Voting is open. People can vote while the dates allow it.')}>
              {busy === 'v' ? 'Opening the ballot...' : 'Open voting'}
            </button>
          )}
          {stage === 'voting_open' && (
            <button style={GOLD_BTN} disabled={!!busy} onClick={() => { if (confirm('Close voting? Votes lock and nobody can change theirs afterwards.')) run('c', 'award_advance_cycle', { p_cycle: cycle.id, p_to: 'voting_closed', p_reason: null }, 'Voting is closed and votes are locked.') }}>
              {busy === 'c' ? 'Closing the ballot...' : 'Close voting'}
            </button>
          )}
          {stage === 'shortlist_published' && (
            <ReasonAction
              label="Pull the shortlist back to review"
              confirmLabel="Pull it back"
              placeholder="Why is the shortlist coming back?"
              tone="danger"
              onSubmit={(reason) => rpc('award_advance_cycle', { p_cycle: cycle.id, p_to: 'shortlist_review', p_reason: reason }, 'The shortlist is back in review.')}
            />
          )}
        </div>
        {false && (
          <p style={{ margin: 0, fontSize: '13px', color: '#8C857A' }}>Voting, jury scoring and results are not part of this release yet.</p>
        )}
        {notice && <p role={notice.tone === 'error' ? 'alert' : 'status'} style={{ margin: '14px 0 0', fontSize: '14px', color: notice.tone === 'error' ? '#E58A7B' : '#7FA88B' }}>{notice.text}</p>}
      </section>

      {categories.map((k) => {
        const active = k.nominees.filter((n) => ['proposed', 'approved'].includes(n.status))
        const short = k.eligibleTotal < k.minNominees && active.length < k.minNominees
        return (
          <section key={k.id} aria-labelledby={`cat-${k.slug}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap', marginBottom: '6px' }}>
              <h2 id={`cat-${k.slug}`} style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: '#F6EFE2' }}>{k.name}</h2>
              <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>{METHOD_LABEL[k.method] ?? k.method} · shortlist of {k.minNominees} to {k.maxNominees}</span>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#8C857A' }}>
              {k.eligibleTotal} eligible, {k.ineligible.length} not eligible.
              {k.method === 'community' && ['voting_open', 'voting_closed'].includes(stage) ? ` ${votes[k.id] ?? 0} ${(votes[k.id] ?? 0) === 1 ? 'vote' : 'votes'} cast (private to awards administrators).` : ''}
            </p>

            {short && (stage === 'shortlist_review' || stage === 'qualification') && (
              <p style={{ margin: '0 0 12px', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(232,160,32,0.4)', background: 'rgba(232,160,32,0.07)', fontSize: '13px', color: '#E8A020', lineHeight: 1.5 }}>
                Only {k.eligibleTotal} eligible, and a shortlist needs at least {k.minNominees}. This category will not be awarded this month unless more qualify. Public copy: &ldquo;{NOT_AWARDED_COPY}&rdquo;
              </p>
            )}

            {k.nominees.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0 }}>
                {k.nominees.map((n) => (
                  <li key={n.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap', padding: '12px 0', borderTop: '1px solid rgba(237,228,210,0.08)', opacity: ['withdrawn', 'disqualified'].includes(n.status) ? 0.55 : 1 }}>
                    <span style={{ ...MONO, width: '24px', fontSize: '13px', color: '#6A6258', paddingTop: '2px' }}>{n.rank ?? ''}</span>
                    <span style={{ flex: 1, minWidth: '200px' }}>
                      <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>{n.label} <span style={{ fontWeight: 400, color: '#8C857A' }}>{n.sub}</span></span>
                      {n.reason && <span style={{ display: 'block', fontSize: '12px', color: '#8C857A', marginTop: '2px' }}>{n.reason}</span>}
                    </span>
                    <span style={{ ...MONO, fontSize: '12px', color: NOMINEE_COLOUR[n.status] ?? '#8C857A', paddingTop: '3px' }}>{n.status}</span>
                    {stage === 'shortlist_review' && n.status === 'proposed' && (
                      <button style={BTN} disabled={!!busy} onClick={async () => { const f = await rpc('award_shortlist_approve', { p_nominee: n.id }); if (f) setNotice({ tone: 'error', text: f }) }}>Approve</button>
                    )}
                    {stage === 'shortlist_review' && ['proposed', 'approved'].includes(n.status) && (
                      <ReasonAction label="Remove" confirmLabel="Remove from the shortlist" placeholder="Why is this nominee coming off?" tone="danger"
                        onSubmit={(reason) => rpc('award_shortlist_remove', { p_nominee: n.id, p_reason: reason })} />
                    )}
                  </li>
                ))}
              </ul>
            )}

            {k.eligible.length > 0 && (
              <details style={{ marginBottom: '10px' }}>
                <summary style={{ cursor: 'pointer', fontSize: '14px', color: '#C7BFB2', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                  Eligible and not on the shortlist ({k.eligible.length})
                </summary>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {k.eligible.map((r) => (
                    <li key={`${r.subjectType}:${r.subjectId}`} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.06)' }}>
                      <span style={{ flex: 1, minWidth: '200px' }}>
                        <span style={{ display: 'block', fontSize: '14px', color: '#EDE4D2' }}>{r.label} <span style={{ color: '#8C857A' }}>{r.sub}</span></span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#6A6258', ...MONO }}>{metricLine(r)}</span>
                      </span>
                      {stage === 'shortlist_review' && (
                        <ReasonAction label="Add to the shortlist" confirmLabel="Add to the shortlist" placeholder="Why is this nominee going on? Shown publicly"
                          onSubmit={(reason) => rpc('award_shortlist_add', { p_cycle: cycle.id, p_category: k.id, p_subject_type: r.subjectType, p_subject_id: r.subjectId, p_reason: reason })} />
                      )}
                      {editable && (
                        <ReasonAction label="Disqualify" confirmLabel="Disqualify" placeholder="Why is this not eligible?" tone="danger"
                          onSubmit={(reason) => rpc('award_set_eligibility', { p_cycle: cycle.id, p_category: k.id, p_subject_type: r.subjectType, p_subject_id: r.subjectId, p_eligible: false, p_reason: reason })} />
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {k.ineligible.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '14px', color: '#8C857A', minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                  Not eligible ({k.ineligible.length})
                </summary>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {k.ineligible.map((r) => (
                    <li key={`${r.subjectType}:${r.subjectId}`} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.06)' }}>
                      <span style={{ flex: 1, minWidth: '200px' }}>
                        <span style={{ display: 'block', fontSize: '14px', color: '#A39B8F' }}>{r.label} <span style={{ color: '#6A6258' }}>{r.sub}</span></span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#E58A7B' }}>{r.reason}{r.override ? ' (editor decision)' : ''}</span>
                      </span>
                      {editable && (
                        <ReasonAction label="Restore" confirmLabel="Make eligible" placeholder="Why is this eligible after all?"
                          onSubmit={(reason) => rpc('award_set_eligibility', { p_cycle: cycle.id, p_category: k.id, p_subject_type: r.subjectType, p_subject_id: r.subjectId, p_eligible: true, p_reason: reason })} />
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )
      })}

      <section aria-labelledby="audit-heading">
        <h2 id="audit-heading" style={{ margin: '0 0 6px', fontSize: '17px', fontWeight: 600, color: '#F6EFE2' }}>Record of changes</h2>
        <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#8C857A' }}>Every shortlist change, disqualification and stage move is written here and cannot be edited or deleted.</p>
        {audit.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#6A6258' }}>Nothing yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {audit.map((a) => (
              <li key={a.id} style={{ padding: '8px 0', borderTop: '1px solid rgba(237,228,210,0.06)', fontSize: '13px', color: '#A39B8F' }}>
                <span style={{ ...MONO, color: '#6A6258' }}>{formatMoment(a.at)}</span>{' '}
                {a.action.replace(/_/g, ' ')}{a.reason ? `: ${a.reason}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
