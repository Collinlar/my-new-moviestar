import { ROLE_DEPARTMENT, ROLE_LABELS, type PersonLite } from '@/lib/people'

export interface CreditDraft {
  key: string
  /** movie_people.id once the credit exists in the database. */
  id?: string
  person: PersonLite
  role: string
  character_name: string
}

let counter = 0
export const newKey = () => `c${Date.now().toString(36)}${counter++}`

export interface CreditRow {
  id: string
  role: string
  character_name: string | null
  billing_order: number | null
  person: PersonLite | null
}

export function draftsFromRows(rows: CreditRow[]): CreditDraft[] {
  return rows
    .filter(r => r.person)
    .sort((a, b) => (a.billing_order ?? 0) - (b.billing_order ?? 0))
    .map(r => ({
      key: r.id,
      id: r.id,
      person: r.person as PersonLite,
      role: r.role,
      character_name: r.character_name ?? '',
    }))
}

/** Same person, same role and same character twice would trip the database's unique rule. */
export function findDuplicate(drafts: CreditDraft[]): string | null {
  const seen = new Set<string>()
  for (const d of drafts) {
    const sig = `${d.person.id}|${d.role}|${d.character_name.trim().toLowerCase()}`
    if (seen.has(sig)) return `${d.person.full_name} is listed twice as ${ROLE_LABELS[d.role] ?? d.role}.`
    seen.add(sig)
  }
  return null
}

/**
 * Makes the movie's credits match `drafts`: removes what was deleted, updates what changed,
 * adds what is new. Billing order follows list position within each role.
 * movies.director is kept in step by a database trigger.
 */
export async function saveCredits(
  supabase: any,
  movieId: string,
  drafts: CreditDraft[],
  originalIds: string[],
): Promise<string | null> {
  const dup = findDuplicate(drafts)
  if (dup) return dup

  const position: Record<string, number> = {}
  const rows = drafts.map(d => {
    position[d.role] = (position[d.role] ?? 0) + 1
    return {
      ...(d.id ? { id: d.id } : {}),
      movie_id: movieId,
      person_id: d.person.id,
      role: d.role,
      character_name: d.role === 'actor' ? d.character_name.trim() || null : null,
      department: ROLE_DEPARTMENT[d.role] ?? null,
      billing_order: position[d.role],
    }
  })

  const keptIds = new Set(drafts.map(d => d.id).filter(Boolean))
  const removed = originalIds.filter(id => !keptIds.has(id))
  if (removed.length) {
    const { error } = await supabase.from('movie_people').delete().in('id', removed)
    if (error) return 'Could not remove the deleted credits. Try again.'
  }

  const existing = rows.filter(r => 'id' in r)
  if (existing.length) {
    const { error } = await supabase.from('movie_people').upsert(existing, { onConflict: 'id' })
    if (error) return 'Could not update the changed credits. Try again.'
  }

  const fresh = rows.filter(r => !('id' in r))
  if (fresh.length) {
    const { error } = await supabase.from('movie_people').insert(fresh)
    if (error) return 'Could not add the new credits. Check nobody is listed twice.'
  }

  return null
}
