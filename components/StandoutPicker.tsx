'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface StandoutPerson { id: string; name: string }
export interface StandoutOptions { actors: StandoutPerson[]; directors: StandoutPerson[] }
export type StandoutValue = { performance: string | null; direction: string | null }

export const NO_STANDOUTS: StandoutValue = { performance: null, direction: null }

const MAX_ACTORS = 8
const MAX_DIRECTORS = 3

/** The billed actors and directors of a film, for "which performance stood out?". Empty when the film has no credits yet. */
export function useStandoutOptions(movieId: string, enabled = true) {
  const [options, setOptions] = useState<StandoutOptions | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient() as any
        const { data } = await supabase
          .from('movie_people')
          .select('role, billing_order, person:people(id, full_name)')
          .eq('movie_id', movieId)
          .in('role', ['actor', 'director'])
          .order('billing_order', { ascending: true })
        if (cancelled) return
        const seen = new Set<string>()
        const pick = (role: string, max: number): StandoutPerson[] =>
          ((data ?? []) as any[])
            .filter((r) => r.role === role && r.person?.id && r.person.full_name)
            .filter((r) => (seen.has(`${role}:${r.person.id}`) ? false : (seen.add(`${role}:${r.person.id}`), true)))
            .slice(0, max)
            .map((r) => ({ id: r.person.id as string, name: r.person.full_name as string }))
        setOptions({ actors: pick('actor', MAX_ACTORS), directors: pick('director', MAX_DIRECTORS) })
      } catch {
        if (!cancelled) setOptions({ actors: [], directors: [] })
      }
    })()
    return () => { cancelled = true }
  }, [movieId, enabled])

  return options
}

/** A person's earlier picks for a film, so editing a take shows what they chose before. */
export async function loadExistingStandouts(movieId: string, userId: string): Promise<StandoutValue> {
  try {
    const supabase = createClient() as any
    const { data } = await supabase.from('take_standouts').select('kind, person_id').eq('movie_id', movieId).eq('user_id', userId)
    const out: StandoutValue = { performance: null, direction: null }
    for (const r of (data ?? []) as Array<{ kind: 'performance' | 'direction'; person_id: string }>) out[r.kind] = r.person_id
    return out
  } catch {
    return { performance: null, direction: null }
  }
}

const LABEL: React.CSSProperties = {
  margin: '0 0 8px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8C857A',
}

function Chips({ label, people, value, onPick }: { label: string; people: StandoutPerson[]; value: string | null; onPick: (id: string | null) => void }) {
  if (people.length === 0) return null
  return (
    <div>
      <p style={LABEL}>{label} <span style={{ textTransform: 'none', fontWeight: 400, letterSpacing: 0, color: '#6A6258' }}>(optional)</span></p>
      <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {people.map((p) => {
          const on = value === p.id
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? null : p.id)}
              style={{
                minHeight: '44px', padding: '0 16px', borderRadius: '999px', fontSize: '14px', cursor: 'pointer',
                background: on ? '#C8963E' : 'transparent',
                color: on ? '#0B0A09' : '#C7BFB2',
                border: `1px solid ${on ? '#C8963E' : 'rgba(237,228,210,0.18)'}`,
                fontWeight: on ? 600 : 400,
              }}
            >
              {p.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  options: StandoutOptions | null
  value: StandoutValue
  onChange: (next: StandoutValue) => void
}

/** Two optional questions that feed the monthly Performance and Director honours. Shows nothing when a film has no credits. */
export function StandoutPicker({ options, value, onChange }: Props) {
  if (!options || (options.actors.length === 0 && options.directors.length === 0)) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Chips label="Which performance stood out?" people={options.actors} value={value.performance} onPick={(id) => onChange({ ...value, performance: id })} />
      <Chips label="Was the direction a standout?" people={options.directors} value={value.direction} onPick={(id) => onChange({ ...value, direction: id })} />
    </div>
  )
}

/** What to send to the API. Both keys go, so un-picking someone clears the old pick. Null when the picker was not shown. */
export function standoutsPayload(options: StandoutOptions | null, value: StandoutValue) {
  if (!options || (options.actors.length === 0 && options.directors.length === 0)) return undefined
  return { performance: value.performance, direction: value.direction }
}
