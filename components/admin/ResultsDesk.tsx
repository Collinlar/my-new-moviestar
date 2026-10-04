'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MIN_REASON_LENGTH, NOT_AWARDED_COPY, formatMoment } from '@/lib/awards-shared'

export interface DeskCategory { id: string; name: string; slug: string; method: string; minNominees: number }
export interface DeskJuror { id: string; categoryId: string; name: string; organisation: string | null; bio: string | null; hasAccount: boolean }
export interface DeskResult {
  nomineeId: string; categoryId: string; label: string; sub: string; rank: number | null; status: string
  final: number | null; jury: number | null; community: number | null; engagement: number | null; confidence: number | null
  components: Record<string, any>
}
export interface DeskOutcome { categoryId: string; outcome: string; reason: string | null; manual: boolean; story: string | null }

interface Props {
  cycleId: string
  stage: string
  categories: DeskCategory[]
  jurors: DeskJuror[]
  results: DeskResult[]
  outcomes: DeskOutcome[]
}

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }
const BTN: React.CSSProperties = { minHeight: '40px', padding: '0 16px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(237,228,210,0.18)', color: '#C7BFB2', fontSize: '14px', cursor: 'pointer' }
const GOLD: React.CSSProperties = { ...BTN, background: 'rgba(200,150,62,0.15)', borderColor: 'rgba(200,150,62,0.4)', color: '#C8963E', fontWeight: 600 }
const INPUT: React.CSSProperties = { width: '100%', height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(237,228,210,0.12)', background: '#15120E', color: '#EDE4D2', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }

function Reason({ label, confirm, placeholder, onSubmit, danger }: { label: string; confirm: string; placeholder: string; danger?: boolean; onSubmit: (reason: string) => Promise<string | null> }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!open) return <button style={{ ...BTN, ...(danger ? { color: '#E58A7B' } : {}) }} onClick={() => setOpen(true)}>{label}</button>
  return (
    <div style={{ display: 'grid', gap: '8px', minWidth: '260px', flexBasis: '100%' }}>
      <input aria-label={placeholder} style={INPUT} value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
      {error && <p role="alert" style={{ margin: 0, fontSize: '13px', color: '#E58A7B' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={busy}
          style={{ ...GOLD, opacity: busy ? 0.6 : 1 }}
          onClick={async () => {
            if (text.trim().length < MIN_REASON_LENGTH) { setError('Say why, in at least a few words. It is kept in the record of changes.'); return }
            setBusy(true); setError(null)
            const failure = await onSubmit(text.trim())
            setBusy(false)
            if (failure) setError(failure); else { setOpen(false); setText('') }
          }}
        >
          {busy ? 'Saving...' : confirm}
        </button>
        <button style={BTN} onClick={() => { setOpen(false); setError(null) }}>Not now</button>
      </div>
    </div>
  )
}

const num = (n: number | null) => (n === null ? 'n/a' : String(Math.round(n * 100) / 100))

export function ResultsDesk({ cycleId, stage, categories, jurors, results, outcomes }: Props) {
  const router = useRouter()
  const supabase = createClient() as any
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [stories, setStories] = useState<Record<string, string>>(() => Object.fromEntries(outcomes.map((o) => [o.categoryId, o.story ?? ''])))
  const [flags, setFlags] = useState<Array<{ vote_id: string; category_id: string; score: number; signals: string[] }> | null>(null)
  const [jf, setJf] = useState<{ categoryId: string; name: string; org: string; bio: string; username: string } | null>(null)

  async function rpc(fn: string, args: Record<string, unknown>, done?: string): Promise<string | null> {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) return error.code === '42501' ? 'Only awards administrators can do that.' : error.message
    router.refresh()
    if (done) setNotice({ tone: 'ok', text: done })
    return data === undefined ? null : null
  }
  async function run(key: string, fn: string, args: Record<string, unknown>, done: string) {
    setBusy(key); setNotice(null)
    const failure = await rpc(fn, args, done)
    setBusy(null)
    if (failure) setNotice({ tone: 'error', text: failure })
  }

  async function runFraud() {
    setBusy('fraud'); setNotice(null)
    const { data, error } = await supabase.rpc('award_fraud_report', { p_cycle: cycleId })
    setBusy(null)
    if (error) { setNotice({ tone: 'error', text: error.message }); return }
    setFlags(data ?? [])
  }

  async function addJuror() {
    if (!jf) return
    setNotice(null)
    let userId: string | null = null
    if (jf.username.trim()) {
      const { data } = await supabase.from('profiles').select('user_id').eq('username', jf.username.trim()).maybeSingle()
      if (!data?.user_id) { setNotice({ tone: 'error', text: `No account has the username ${jf.username.trim()}. Leave it blank for a judge who will not score on the site.` }); return }
      userId = data.user_id
    }
    const failure = await rpc('award_add_juror', { p_cycle: cycleId, p_category: jf.categoryId, p_user: userId, p_name: jf.name, p_bio: jf.bio || null, p_org: jf.org || null }, 'Judge added. Judges are named on the public page.')
    if (failure) setNotice({ tone: 'error', text: failure }); else setJf(null)
  }

  const showResults = ['voting_closed', 'jury_review', 'results_locked', 'published', 'archived'].includes(stage)
  const judged = categories.filter((k) => k.method === 'hybrid' || k.method === 'jury')

  return (
    <div style={{ display: 'grid', gap: '36px', maxWidth: '900px', marginTop: '36px' }}>
      <section style={{ padding: '20px', borderRadius: '16px', border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B' }}>
        <p style={{ ...MONO, margin: '0 0 12px', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8C857A' }}>Judging and results</p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {stage === 'voting_closed' && (
            <button style={GOLD} disabled={!!busy} onClick={() => run('j', 'award_advance_cycle', { p_cycle: cycleId, p_to: 'jury_review', p_reason: null }, 'Jury review has started. Judges can now score.')}>
              {busy === 'j' ? 'Opening jury review...' : 'Start jury review'}
            </button>
          )}
          {['voting_closed', 'jury_review'].includes(stage) && (
            <button style={stage === 'jury_review' ? BTN : GOLD} disabled={!!busy} onClick={() => run('c', 'award_compute_results', { p_cycle: cycleId }, 'Results calculated. Check each category below.')}>
              {busy === 'c' ? 'Counting votes and scores...' : 'Calculate results'}
            </button>
          )}
          {stage === 'jury_review' && (
            <button style={GOLD} disabled={!!busy} onClick={() => { if (confirm('Lock the results? Votes, scores and judges freeze. You can still unlock with a reason before publishing.')) run('l', 'award_lock_results', { p_cycle: cycleId }, 'Results are locked.') }}>
              {busy === 'l' ? 'Locking...' : 'Lock the results'}
            </button>
          )}
          {stage === 'results_locked' && (
            <>
              <button style={GOLD} disabled={!!busy} onClick={() => { if (confirm('Publish the results? Winners, their stories and permanent verification records go live.')) run('p', 'award_publish_results', { p_cycle: cycleId }, 'Results are published. Verification records are live.') }}>
                {busy === 'p' ? 'Publishing...' : 'Publish the results'}
              </button>
              <Reason label="Unlock the results" confirm="Unlock" placeholder="Why are the results being unlocked?" danger
                onSubmit={(reason) => rpc('award_advance_cycle', { p_cycle: cycleId, p_to: 'jury_review', p_reason: reason }, 'Results unlocked and back in jury review.')} />
            </>
          )}
          {stage === 'published' && (
            <button style={BTN} disabled={!!busy} onClick={() => run('a', 'award_advance_cycle', { p_cycle: cycleId, p_to: 'archived', p_reason: null }, 'The cycle is archived. Its records stay public.')}>Archive this cycle</button>
          )}
        </div>
        {notice && <p role={notice.tone === 'error' ? 'alert' : 'status'} style={{ margin: '14px 0 0', fontSize: '14px', color: notice.tone === 'error' ? '#E58A7B' : '#7FA88B' }}>{notice.text}</p>}
      </section>

      <section aria-labelledby="judges-heading">
        <h2 id="judges-heading" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#F6EFE2' }}>Judges</h2>
        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#8C857A' }}>Judges are named on the public category pages. A judge with an account can score from the Jury page. Add yourself if you are scoring.</p>
        {judged.map((k) => {
          const list = jurors.filter((j) => j.categoryId === k.id)
          return (
            <div key={k.id} style={{ padding: '12px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
              <p style={{ margin: '0 0 6px', fontSize: '15px', color: '#EDE4D2' }}>{k.name}</p>
              {list.length === 0 && <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#E8A020' }}>No judge yet. Jury review cannot start until there is one.</p>}
              <ul style={{ listStyle: 'none', margin: '0 0 8px', padding: 0 }}>
                {list.map((j) => (
                  <li key={j.id} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', padding: '4px 0' }}>
                    <span style={{ flex: 1, minWidth: '200px', fontSize: '14px', color: '#C7BFB2' }}>{j.name}{j.organisation ? `, ${j.organisation}` : ''}{j.hasAccount ? '' : ' (no account, cannot score on the site)'}</span>
                    {['voting_closed', 'jury_review', 'voting_open', 'shortlist_published', 'shortlist_review', 'qualification', 'draft'].includes(stage) && (
                      <Reason label="Remove" confirm="Remove this judge" placeholder="Why is this judge coming off?" danger
                        onSubmit={(reason) => rpc('award_remove_juror', { p_juror: j.id, p_reason: reason })} />
                    )}
                  </li>
                ))}
              </ul>
              {jf?.categoryId === k.id ? (
                <div style={{ display: 'grid', gap: '8px', maxWidth: '460px' }}>
                  <input aria-label="Judge name" style={INPUT} placeholder="Name, shown publicly" value={jf.name} onChange={(e) => setJf({ ...jf, name: e.target.value })} />
                  <input aria-label="Organisation" style={INPUT} placeholder="Organisation (optional)" value={jf.org} onChange={(e) => setJf({ ...jf, org: e.target.value })} />
                  <input aria-label="Short bio" style={INPUT} placeholder="One line about them (optional)" value={jf.bio} onChange={(e) => setJf({ ...jf, bio: e.target.value })} />
                  <input aria-label="Account username" style={INPUT} placeholder="Their MuvieStars username, so they can score (optional)" value={jf.username} onChange={(e) => setJf({ ...jf, username: e.target.value })} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={GOLD} onClick={addJuror}>Add this judge</button>
                    <button style={BTN} onClick={() => setJf(null)}>Not now</button>
                  </div>
                </div>
              ) : (
                <button style={BTN} onClick={() => setJf({ categoryId: k.id, name: '', org: '', bio: '', username: '' })}>Add a judge</button>
              )}
            </div>
          )
        })}
      </section>

      {showResults && categories.map((k) => {
        const o = outcomes.find((x) => x.categoryId === k.id)
        const rows = results.filter((r) => r.categoryId === k.id).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
        const locked = ['results_locked', 'published', 'archived'].includes(stage)
        return (
          <section key={k.id} aria-labelledby={`res-${k.slug}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'baseline', marginBottom: '6px' }}>
              <h2 id={`res-${k.slug}`} style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#F6EFE2' }}>{k.name}</h2>
              <span style={{ ...MONO, fontSize: '12px', color: o?.outcome === 'awarded' ? '#7FA88B' : o?.outcome === 'not_awarded' ? '#E8A020' : '#8C857A' }}>
                {o ? o.outcome.replace('_', ' ') : 'not calculated'}
              </span>
            </div>
            {o?.reason && <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#A39B8F' }}>{o.reason}{o.outcome === 'not_awarded' ? `. Public wording: "${NOT_AWARDED_COPY}"` : ''}</p>}

            {rows.length > 0 && (
              <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0 }}>
                {rows.map((r) => (
                  <li key={r.nomineeId} style={{ padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                      <span style={{ ...MONO, width: '24px', fontSize: '13px', color: '#6A6258' }}>{r.rank ?? ''}</span>
                      <span style={{ flex: 1, fontSize: '15px', color: '#F6EFE2' }}>{r.label} <span style={{ color: '#8C857A' }}>{r.sub}</span></span>
                      <span style={{ ...MONO, fontSize: '13px', color: '#C8963E' }}>{r.final === null ? 'waiting for the jury' : num(r.final)}</span>
                      {r.status !== 'ranked' && <span style={{ ...MONO, fontSize: '12px', color: '#8C857A' }}>{r.status.replace('_', ' ')}</span>}
                    </div>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#6A6258', minHeight: '32px', display: 'flex', alignItems: 'center' }}>How this was scored</summary>
                      <p style={{ ...MONO, margin: '4px 0 0 36px', fontSize: '12px', color: '#8C857A', lineHeight: 1.7 }}>
                        {Object.entries(r.components.components ?? {}).map(([key, v]) => `${key.replace(/_/g, ' ')} ${v === null ? 'n/a' : num(Number(v))}`).join(' · ') || `${r.components.votes ?? 0} votes`}
                        <br />
                        {r.components.raw ? `${r.components.raw.qualified_takes} qualified takes · ${r.components.raw.unique_reviewers} reviewers · ${r.components.jury_count} judges scored` : `${r.components.qualified_reviews ?? 0} qualified reviews`}
                      </p>
                    </details>
                  </li>
                ))}
              </ul>
            )}

            {['voting_closed', 'jury_review'].includes(stage) && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {o?.manual ? (
                  <button style={BTN} onClick={() => run('o' + k.id, 'award_set_category_outcome', { p_cycle: cycleId, p_category: k.id, p_outcome: 'pending', p_reason: null }, 'Back to pending. Calculate the results again.')}>Put back to pending</button>
                ) : (
                  <Reason label="Declare not awarded" confirm="Declare not awarded" placeholder="Why is no award being given?" danger
                    onSubmit={(reason) => rpc('award_set_category_outcome', { p_cycle: cycleId, p_category: k.id, p_outcome: 'not_awarded', p_reason: reason }, 'Marked not awarded.')} />
                )}
              </div>
            )}

            {o?.outcome === 'awarded' && ['jury_review', 'results_locked'].includes(stage) && (
              <div style={{ display: 'grid', gap: '8px' }}>
                <label htmlFor={`story-${k.slug}`} style={{ ...MONO, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6A6258' }}>Why it won. Public, in the editors&rsquo; words (80 characters or more)</label>
                <textarea id={`story-${k.slug}`} rows={4} maxLength={3000} value={stories[k.id] ?? ''} onChange={(e) => setStories({ ...stories, [k.id]: e.target.value })}
                  style={{ ...INPUT, height: 'auto', padding: '10px 12px', lineHeight: 1.5, resize: 'vertical' }} />
                <div>
                  <button style={BTN} disabled={!!busy} onClick={() => run('s' + k.id, 'award_set_story', { p_cycle: cycleId, p_category: k.id, p_story: stories[k.id] ?? '' }, `Story saved for ${k.name}.`)}>
                    {busy === 's' + k.id ? 'Saving...' : 'Save the story'}
                  </button>
                  <span style={{ marginLeft: '12px', fontSize: '12px', color: (stories[k.id] ?? '').trim().length >= 80 ? '#7FA88B' : '#E8A020' }}>{(stories[k.id] ?? '').trim().length} characters</span>
                </div>
              </div>
            )}
          </section>
        )
      })}

      {['voting_open', 'voting_closed', 'jury_review'].includes(stage) && (
        <section aria-labelledby="fraud-heading">
          <h2 id="fraud-heading" style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#F6EFE2' }}>Fraud checks</h2>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#8C857A' }}>These flag votes for a person to look at. They never remove a vote by themselves. Invalidating one needs a reason and is kept on the record.</p>
          <button style={BTN} disabled={!!busy} onClick={runFraud}>{busy === 'fraud' ? 'Checking the votes...' : 'Run fraud checks'}</button>
          {flags && (
            <div style={{ marginTop: '12px' }}>
              {flags.length === 0 ? <p style={{ fontSize: '14px', color: '#7FA88B' }}>Nothing was flagged.</p> : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {flags.map((f) => (
                    <li key={f.vote_id} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                      <span style={{ flex: 1, minWidth: '220px' }}>
                        <span style={{ ...MONO, fontSize: '12px', color: '#E8A020' }}>risk {num(f.score)}</span>
                        <span style={{ display: 'block', fontSize: '13px', color: '#A39B8F', lineHeight: 1.5 }}>{f.signals.join('. ')}.</span>
                      </span>
                      {!['results_locked', 'published', 'archived'].includes(stage) && (
                        <Reason label="Invalidate this vote" confirm="Invalidate" placeholder="Why is this vote not valid?" danger
                          onSubmit={(reason) => rpc('award_set_vote_qualified', { p_vote: f.vote_id, p_qualified: false, p_reason: reason }, 'Vote invalidated and recorded.')} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p style={{ ...MONO, margin: '8px 0 0', fontSize: '11px', color: '#6A6258' }}>Checked {formatMoment(new Date().toISOString())}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
