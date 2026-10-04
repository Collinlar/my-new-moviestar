import { createClient } from '@/lib/supabase/server'
import { keyOf, resolveSubjects, type AwardCategory, type AwardCycle, type Nominee, type NomineeSubject } from '@/lib/awards'

// Public reads for published results. Row-level security keeps this to what the public may see:
// outcomes and stories once a cycle is published, the permanent records, and the judges. Never a raw score.

export interface Juror { categoryId: string; name: string; bio: string | null; organisation: string | null }

export interface Winner {
  recognitionId: string
  code: string
  status: string
  subject: NomineeSubject
}

export interface Outcome {
  categoryId: string
  outcome: 'awarded' | 'not_awarded'
  reason: string | null
  story: string | null
  winners: Winner[]
}

const FALLBACK: NomineeSubject = { title: 'Unknown', filmTitle: null, year: null, posterUrl: null, href: '#', movieId: null }

/** The judges for a cycle, disclosed publicly. */
export async function getJurors(cycleId: string): Promise<Juror[]> {
  const supabase = (await createClient()) as any
  const { data } = await supabase.from('award_jurors').select('category_id, name, bio, organisation').eq('cycle_id', cycleId).order('name')
  return ((data ?? []) as any[]).map((j) => ({ categoryId: j.category_id, name: j.name, bio: j.bio, organisation: j.organisation }))
}

/** Outcomes for a published cycle: who won each award and why, or that it was not awarded. */
export async function getOutcomes(cycleId: string): Promise<Outcome[]> {
  const supabase = (await createClient()) as any
  const [{ data: cats }, { data: recs }] = await Promise.all([
    supabase.from('award_cycle_categories').select('category_id, outcome, outcome_reason, story').eq('cycle_id', cycleId),
    supabase.from('award_recognition').select('id, category_id, subject_type, subject_id, verification_code, status').eq('cycle_id', cycleId),
  ])
  const subjects = await resolveSubjects(supabase, (recs ?? []) as any[])
  return ((cats ?? []) as any[])
    .filter((c) => c.outcome === 'awarded' || c.outcome === 'not_awarded')
    .map((c) => ({
      categoryId: c.category_id,
      outcome: c.outcome,
      reason: c.outcome_reason,
      story: c.story,
      winners: ((recs ?? []) as any[])
        .filter((r) => r.category_id === c.category_id)
        .map((r) => ({
          recognitionId: r.id, code: r.verification_code, status: r.status,
          subject: subjects.get(keyOf(r.subject_type, r.subject_id)) ?? FALLBACK,
        })),
    }))
}

export interface VerifiedRecord {
  id: string
  code: string
  status: string
  title: string
  awardedAt: string
  story: string | null
  cycle: AwardCycle
  category: AwardCategory
  subject: NomineeSubject
  nominees: Nominee[]
  jurors: Juror[]
}

/** The permanent record behind a verification code, for /recognition/{code}. */
export async function getRecordByCode(code: string): Promise<VerifiedRecord | null> {
  if (!/^MS-\d{4}-\d{2}-[A-Z]+-[A-Z0-9]{5}$/.test(code)) return null
  const supabase = (await createClient()) as any
  const { data: rec } = await supabase
    .from('award_recognition')
    .select('id, cycle_id, category_id, subject_type, subject_id, title, verification_code, status, awarded_at')
    .eq('verification_code', code)
    .maybeSingle()
  if (!rec) return null

  const [{ data: cycle }, { data: category }, { data: cc }, { data: nominees }, jurors] = await Promise.all([
    supabase.from('award_cycles').select('id, name, slug, status, qualification_start, qualification_end, voting_start, voting_end, published_at').eq('id', rec.cycle_id).maybeSingle(),
    supabase.from('award_categories').select('id, name, slug, subject_type, method_type, description, min_nominees, max_nominees, eligibility_config, scoring_config').eq('id', rec.category_id).maybeSingle(),
    supabase.from('award_cycle_categories').select('story').eq('cycle_id', rec.cycle_id).eq('category_id', rec.category_id).maybeSingle(),
    supabase.from('award_nominees').select('id, category_id, subject_type, subject_id, shortlist_rank, status, selection_reason').eq('cycle_id', rec.cycle_id).eq('category_id', rec.category_id).in('status', ['approved', 'winner', 'runner_up']),
    getJurors(rec.cycle_id),
  ])
  if (!cycle || !category) return null

  const allSubjects = await resolveSubjects(supabase, [{ subject_type: rec.subject_type, subject_id: rec.subject_id }, ...((nominees ?? []) as any[])])
  const noms: Nominee[] = ((nominees ?? []) as any[]).map((n) => ({
    id: n.id, categoryId: n.category_id, rank: n.shortlist_rank, status: n.status, reason: n.selection_reason, subjectType: n.subject_type,
    subject: allSubjects.get(keyOf(n.subject_type, n.subject_id)) ?? FALLBACK,
  }))
  return {
    id: rec.id, code: rec.verification_code, status: rec.status, title: rec.title, awardedAt: rec.awarded_at, story: cc?.story ?? null,
    cycle: cycle as AwardCycle, category: category as AwardCategory,
    subject: allSubjects.get(keyOf(rec.subject_type, rec.subject_id)) ?? FALLBACK,
    nominees: noms, jurors: jurors.filter((j) => j.categoryId === rec.category_id),
  }
}

export interface WinItem { title: string; href: string; cycleName: string; code: string; status: string; who: string | null }

const winsFrom = (data: any[] | null, who: (row: any) => string | null): WinItem[] =>
  ((data ?? []) as any[])
    .filter((r) => ['valid', 'corrected'].includes(r.status) && r.cycle)
    .map((r) => ({ title: r.title, href: `/recognition/${r.verification_code}`, cycleName: r.cycle.name, code: r.verification_code, status: r.status, who: who(r) }))
    .sort((a, b) => b.cycleName.localeCompare(a.cycleName))

/** Honours a film, or someone credited on it, has won. */
export async function getWinsForMovie(movieId: string): Promise<WinItem[]> {
  const supabase = (await createClient()) as any
  const { data: credits } = await supabase.from('movie_people').select('id, person:people(full_name)').eq('movie_id', movieId)
  const names = new Map<string, string>(((credits ?? []) as any[]).map((c) => [c.id, c.person?.full_name ?? '']))
  const { data } = await supabase
    .from('award_recognition')
    .select('title, verification_code, status, subject_type, subject_id, cycle:award_cycles(name)')
    .in('subject_id', [movieId, ...names.keys()])
  return winsFrom(data, (r) => (r.subject_type === 'movie' ? null : names.get(r.subject_id) || null))
}

/** Honours a person has won, through their credits. */
export async function getWinsForPerson(personId: string): Promise<WinItem[]> {
  const supabase = (await createClient()) as any
  const { data: credits } = await supabase.from('movie_people').select('id, movie:movies(title)').eq('person_id', personId)
  const films = new Map<string, string>(((credits ?? []) as any[]).map((c) => [c.id, c.movie?.title ?? '']))
  if (films.size === 0) return []
  const { data } = await supabase
    .from('award_recognition')
    .select('title, verification_code, status, subject_type, subject_id, cycle:award_cycles(name)')
    .in('subject_id', [...films.keys()])
  return winsFrom(data, (r) => films.get(r.subject_id) || null)
}
