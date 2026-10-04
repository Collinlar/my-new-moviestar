'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/awards-shared'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

interface NomineeCard { id: string; movieId: string; title: string; year: number | null; posterUrl: string | null }

interface Status {
  stage: string
  open: boolean
  voting_start: string
  voting_end: string
  signed_in: boolean
  account_ok: boolean
  account_eligible_from: string | null
  min_account_age_days: number
  my_vote: string | null
  nominees: Array<{ nominee_id: string; movie_id: string; taken: boolean }>
}

interface Props {
  cycleId: string
  categoryId: string
  categoryName: string
  nominees: NomineeCard[]
  signInHref: string
}

/** The Audience Choice ballot. The rules live in the database; this shows them and sends the vote. */
export function Ballot({ cycleId, categoryId, categoryName, nominees, signInHref }: Props) {
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const supabase = createClient() as any
      const { data } = await supabase.rpc('award_ballot_status', { p_cycle: cycleId, p_category: categoryId })
      setStatus((data as Status) ?? null)
    } catch {
      setStatus(null)
    }
  }, [cycleId, categoryId])

  useEffect(() => { load() }, [load])

  const vote = async (nomineeId: string, title: string) => {
    setBusy(nomineeId); setError(null); setNote(null)
    try {
      const res = await fetch('/api/awards/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nominee_id: nomineeId }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? 'Your vote did not go through. Check your connection and tap again.')
        return
      }
      setNote(json.changed ? `Your vote moved to ${title}.` : `Your vote for ${title} is in.`)
      await load()
    } catch {
      setError('We could not reach MuvieStars just now. Check your connection and tap again.')
    } finally {
      setBusy(null)
    }
  }

  if (!status) return null
  const byId = new Map(status.nominees.map((n) => [n.nominee_id, n]))
  const takenCount = status.nominees.filter((n) => n.taken).length
  const closed = !status.open && ['voting_closed', 'jury_review', 'results_locked', 'published', 'archived'].includes(status.stage)
  const notYet = !status.open && !closed

  return (
    <section aria-labelledby="ballot-heading" style={{ borderTop: '1px solid rgba(237,228,210,0.1)', paddingTop: '40px' }}>
      <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: '0 0 10px' }}>
        {status.open ? 'Voting is open' : closed ? 'Voting is closed' : 'Voting opens soon'}
      </p>
      <h2 id="ballot-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 10px' }}>
        {status.open ? `Cast your ${categoryName} vote.` : closed ? 'The votes are in.' : `${categoryName} voting has not opened yet.`}
      </h2>

      {status.open && (
        <p style={{ margin: '0 0 6px', fontSize: '16px', color: '#C7BFB2', lineHeight: 1.6 }}>
          Voting closes {formatDate(status.voting_end)}. You can change your vote until then. Results are shown once the award is decided, never while voting runs.
        </p>
      )}
      {notYet && <p style={{ margin: 0, fontSize: '16px', color: '#C7BFB2' }}>Voting runs from {formatDate(status.voting_start)} to {formatDate(status.voting_end)}.</p>}
      {closed && <p style={{ margin: 0, fontSize: '16px', color: '#C7BFB2' }}>Thank you to everyone who took part.</p>}

      {status.open && status.signed_in && (
        <p style={{ margin: '14px 0 0', fontSize: '15px', color: takenCount === status.nominees.length ? '#7FA88B' : '#A39B8F' }}>
          You have reviewed {takenCount} of {status.nominees.length} nominees.
          {takenCount < status.nominees.length ? ' Review a film to make a vote for it count.' : ''}
        </p>
      )}

      {status.open && !status.signed_in && (
        <p style={{ margin: '14px 0 0' }}>
          <Link href={signInHref} style={{ color: '#C8963E', fontSize: '16px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Sign in to vote</Link>
        </p>
      )}

      {status.open && status.signed_in && !status.account_ok && (
        <p role="status" style={{ margin: '14px 0 0', fontSize: '15px', color: '#E8A020', lineHeight: 1.6 }}>
          Your account needs to be at least {status.min_account_age_days} days old to vote{status.account_eligible_from ? `. You can vote from ${formatDate(status.account_eligible_from)}` : ''}. You can still review the nominees now.
        </p>
      )}

      {error && <p role="alert" style={{ margin: '14px 0 0', fontSize: '15px', color: '#E58A7B' }}>{error}</p>}
      {note && <p role="status" style={{ margin: '14px 0 0', fontSize: '15px', color: '#7FA88B' }}>{note}</p>}

      <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0 }}>
        {nominees.map((n) => {
          const s = byId.get(n.id)
          const mine = status.my_vote === n.id
          return (
            <li key={n.id} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', padding: '16px 0', borderTop: '1px solid rgba(237,228,210,0.08)' }}>
              <Link href={`/movie/${n.movieId}`} style={{ flex: 1, minWidth: '200px', textDecoration: 'none', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                <span style={{ ...SERIF, fontSize: '28px', lineHeight: 1.1, color: '#F6EFE2' }}>
                  {n.title} <span style={{ fontSize: '18px', color: '#6E675E' }}>{n.year ?? ''}</span>
                </span>
              </Link>
              {mine && <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C8963E' }}>Your vote</span>}
              {status.open && status.signed_in && status.account_ok && (
                s?.taken ? (
                  !mine && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => vote(n.id, n.title)}
                      style={{ minHeight: '48px', padding: '0 20px', borderRadius: '12px', border: '1px solid rgba(200,150,62,0.6)', background: 'transparent', color: '#C8963E', fontSize: '15px', fontWeight: 600, cursor: 'pointer', opacity: busy === n.id ? 0.6 : 1 }}
                    >
                      {busy === n.id ? 'Sending your vote...' : status.my_vote ? 'Move my vote here' : 'Vote for this film'}
                    </button>
                  )
                ) : (
                  <Link href={`/movie/${n.movieId}`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', fontSize: '14px', color: '#A39B8F', textDecoration: 'underline' }}>
                    Review this movie to make your vote count
                  </Link>
                )
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
