'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Trash2, User } from 'lucide-react'
import { PersonPicker } from '@/components/admin/PersonPicker'
import { CREW_ROLES, ROLE_LABELS, type PersonLite } from '@/lib/people'
import { newKey, type CreditDraft } from '@/lib/credits'

interface Props {
  credits: CreditDraft[]
  onChange: (next: CreditDraft[]) => void
}

function Avatar({ person }: { person: PersonLite }) {
  return person.profile_image ? (
    <img src={person.profile_image} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-cinema-border" />
  ) : (
    <span className="w-8 h-8 rounded-full bg-cinema-surface border border-cinema-border shrink-0 flex items-center justify-center">
      <User className="w-3.5 h-3.5 text-film-subtle" aria-hidden="true" />
    </span>
  )
}

const iconBtn =
  'inline-flex items-center justify-center w-8 h-8 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors disabled:opacity-30 disabled:hover:bg-transparent'

const rowShell = 'flex items-center gap-3 px-3 py-2 rounded-lg bg-cinema-surface border border-cinema-border'

// Must live outside CreditsEditor: a component defined during render gets a new identity
// every render, which remounts its inputs and drops focus on each keystroke.
function Row({ c, list, onMove, onRemove, children }: {
  c: CreditDraft
  list: CreditDraft[]
  onMove: (key: string, dir: -1 | 1) => void
  onRemove: (key: string) => void
  children?: React.ReactNode
}) {
  const pos = list.findIndex(x => x.key === c.key)
  return (
    <li className={rowShell}>
      <Avatar person={c.person} />
      <span className="text-sm font-medium text-film-cream min-w-0 truncate">{c.person.full_name}</span>
      <div className="flex-1 min-w-0">{children}</div>
      <button type="button" className={iconBtn} onClick={() => onMove(c.key, -1)} disabled={pos === 0} aria-label={`Move ${c.person.full_name} up`}>
        <ArrowUp className="w-4 h-4" aria-hidden="true" />
      </button>
      <button type="button" className={iconBtn} onClick={() => onMove(c.key, 1)} disabled={pos === list.length - 1} aria-label={`Move ${c.person.full_name} down`}>
        <ArrowDown className="w-4 h-4" aria-hidden="true" />
      </button>
      <button type="button" className={`${iconBtn} hover:!text-red-400`} onClick={() => onRemove(c.key)} aria-label={`Remove ${c.person.full_name}`}>
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </button>
    </li>
  )
}

export function CreditsEditor({ credits, onChange }: Props) {
  const [crewRole, setCrewRole] = useState<string>('writer')

  const update = (key: string, patch: Partial<CreditDraft>) =>
    onChange(credits.map(c => (c.key === key ? { ...c, ...patch } : c)))

  const remove = (key: string) => onChange(credits.filter(c => c.key !== key))

  // Move within the same role only; billing order is per role.
  const move = (key: string, dir: -1 | 1) => {
    const idx = credits.findIndex(c => c.key === key)
    if (idx < 0) return
    const role = credits[idx].role
    let j = idx + dir
    while (j >= 0 && j < credits.length && credits[j].role !== role) j += dir
    if (j < 0 || j >= credits.length) return
    const next = [...credits]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    onChange(next)
  }

  const add = (person: PersonLite, role: string) =>
    onChange([...credits, { key: newKey(), person, role, character_name: '' }])

  const inRole = (roles: string[]) => credits.filter(c => roles.includes(c.role))
  const idsIn = (roles: string[]) => inRole(roles).map(c => c.person.id)

  const directors = inRole(['director'])
  const cast      = inRole(['actor'])
  const crew      = inRole([...CREW_ROLES])

  return (
    <div className="space-y-8">
      <p className="text-xs text-film-muted -mt-1">
        Pick from existing profiles. Each name links to one profile page, so spelling stays consistent
        and every film adds to that person&apos;s filmography.
      </p>

      {/* Directors */}
      <div>
        <h3 className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Directors ({directors.length})</h3>
        {directors.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {directors.map(c => <Row key={c.key} c={c} list={directors} onMove={move} onRemove={remove} />)}
          </ul>
        )}
        <PersonPicker
          label="Add a director"
          excludeIds={idsIn(['director'])}
          onPick={p => add(p, 'director')}
        />
      </div>

      {/* Cast */}
      <div>
        <h3 className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Cast ({cast.length})</h3>
        {cast.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {cast.map(c => (
              <Row key={c.key} c={c} list={cast} onMove={move} onRemove={remove}>
                <label className="sr-only" htmlFor={`char-${c.key}`}>Character played by {c.person.full_name}</label>
                <input
                  id={`char-${c.key}`}
                  className="cinema-input text-sm py-1.5"
                  value={c.character_name}
                  onChange={e => update(c.key, { character_name: e.target.value })}
                  placeholder="Character name"
                />
              </Row>
            ))}
          </ul>
        )}
        <PersonPicker
          label="Add a cast member"
          excludeIds={idsIn(['actor'])}
          onPick={p => add(p, 'actor')}
        />
        <p className="text-[11px] text-film-subtle mt-1">List order is billing order. Top of the list is top billing.</p>
      </div>

      {/* Crew */}
      <div>
        <h3 className="text-xs font-semibold text-film-muted uppercase tracking-wide mb-2">Crew ({crew.length})</h3>
        {crew.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {crew.map(c => (
              <Row key={c.key} c={c} list={crew.filter(x => x.role === c.role)} onMove={move} onRemove={remove}>
                <label className="sr-only" htmlFor={`role-${c.key}`}>Role for {c.person.full_name}</label>
                <select
                  id={`role-${c.key}`}
                  className="cinema-input text-sm py-1.5"
                  value={c.role}
                  onChange={e => update(c.key, { role: e.target.value })}
                >
                  {CREW_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </Row>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-3 items-end">
          <PersonPicker
            label="Add a crew member"
            excludeIds={idsIn([crewRole])}
            onPick={p => add(p, crewRole)}
          />
          <div>
            <label htmlFor="crew-role-new" className="block text-xs text-film-muted mb-1">As</label>
            <select id="crew-role-new" className="cinema-input text-sm py-2" value={crewRole} onChange={e => setCrewRole(e.target.value)}>
              {CREW_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}
