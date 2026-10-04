import { createClient } from '@/lib/supabase/server'
import { PUBLIC_STAGES } from '@/lib/awards-shared'

// Public reads for the awards pages. Everything here goes through row-level security, so it can only
// ever return what the public is allowed to see: cycles whose shortlist is published, and approved nominees.

export interface AwardCategory {
  id: string; name: string; slug: string; subject_type: string; method_type: string; description: string | null
  min_nominees: number; max_nominees: number; eligibility_config: Record<string, any>; scoring_config: Record<string, any>
}
export interface AwardCycle {
  id: string; name: string; slug: string; status: string
  qualification_start: string; qualification_end: string; voting_start: string; voting_end: string; published_at: string | null
}
export interface NomineeSubject {
  /** What the nominee is called: a film title, or a person's name. */
  title: string
  /** The film it belongs to, for performances and direction. */
  filmTitle: string | null
  year: number | null
  posterUrl: string | null
  /** Where to send someone who wants to read more. */
  href: string
  movieId: string | null
}
export interface Nominee {
  id: string; categoryId: string; rank: number | null; status: string; reason: string | null
  subjectType: string; subject: NomineeSubject
}

const PUBLIC = [...PUBLIC_STAGES]

/** Resolves nominee subject ids to names and links. A movie subject is a film. Performance and crew subjects are movie_people credits. */
async function resolveSubjects(supabase: any, rows: Array<{ subject_type: string; subject_id: string }>): Promise<Map<string, NomineeSubject>> {
  const out = new Map<string, NomineeSubject>()
  const movieIds = [...new Set(rows.filter((r) => r.subject_type === 'movie').map((r) => r.subject_id))]
  const creditIds = [...new Set(rows.filter((r) => r.subject_type !== 'movie').map((r) => r.subject_id))]
  const [{ data: movies }, { data: credits }] = await Promise.all([
    movieIds.length ? supabase.from('movies').select('id, title, release_year, poster_url').in('id', movieIds) : Promise.resolve({ data: [] }),
    creditIds.length
      ? supabase.from('movie_people').select('id, person:people(id, slug, full_name, profile_image), movie:movies(id, title, release_year, poster_url)').in('id', creditIds)
      : Promise.resolve({ data: [] }),
  ])
  for (const m of (movies ?? []) as any[]) {
    out.set(`movie:${m.id}`, { title: m.title, filmTitle: null, year: m.release_year ?? null, posterUrl: m.poster_url ?? null, href: `/movie/${m.id}`, movieId: m.id })
  }
  for (const c of (credits ?? []) as any[]) {
    out.set(`credit:${c.id}`, {
      title: c.person?.full_name ?? 'Unknown',
      filmTitle: c.movie?.title ?? null,
      year: c.movie?.release_year ?? null,
      posterUrl: c.person?.profile_image ?? c.movie?.poster_url ?? null,
      href: c.person?.slug ? `/person/${c.person.slug}` : `/movie/${c.movie?.id}`,
      movieId: c.movie?.id ?? null,
    })
  }
  return out
}

const keyOf = (type: string, id: string) => (type === 'movie' ? `movie:${id}` : `credit:${id}`)

/** Cycles the public can see, newest first. */
export async function getPublicCycles(limit = 12): Promise<Array<AwardCycle & { programName: string }>> {
  const supabase = (await createClient()) as any
  const { data } = await supabase
    .from('award_cycles')
    .select('id, name, slug, status, qualification_start, qualification_end, voting_start, voting_end, published_at, program:award_programs(name)')
    .in('status', PUBLIC)
    .order('slug', { ascending: false })
    .limit(limit)
  return ((data ?? []) as any[]).map((c) => ({ ...c, programName: c.program?.name ?? 'MuvieStars Honours' }))
}

export async function getCycleBySlug(slug: string): Promise<{ cycle: AwardCycle; programName: string; categories: AwardCategory[]; nominees: Nominee[] } | null> {
  if (!/^\d{4}-\d{2}$/.test(slug)) return null
  const supabase = (await createClient()) as any
  const { data: cycle } = await supabase
    .from('award_cycles')
    .select('id, name, slug, status, program_id, qualification_start, qualification_end, voting_start, voting_end, published_at, program:award_programs(name)')
    .eq('slug', slug)
    .in('status', PUBLIC)
    .maybeSingle()
  if (!cycle) return null

  const [{ data: categories }, { data: nominees }] = await Promise.all([
    supabase.from('award_categories').select('id, name, slug, subject_type, method_type, description, min_nominees, max_nominees, eligibility_config, scoring_config').eq('program_id', cycle.program_id).eq('active', true).order('name'),
    supabase.from('award_nominees').select('id, category_id, subject_type, subject_id, shortlist_rank, status, selection_reason').eq('cycle_id', cycle.id).in('status', ['approved', 'winner', 'runner_up']).order('shortlist_rank', { ascending: true }),
  ])
  const subjects = await resolveSubjects(supabase, (nominees ?? []) as any[])
  const noms: Nominee[] = ((nominees ?? []) as any[]).map((n) => ({
    id: n.id, categoryId: n.category_id, rank: n.shortlist_rank, status: n.status, reason: n.selection_reason,
    subjectType: n.subject_type,
    subject: subjects.get(keyOf(n.subject_type, n.subject_id)) ?? { title: 'Unknown', filmTitle: null, year: null, posterUrl: null, href: '#', movieId: null },
  }))
  const { program, program_id, ...rest } = cycle
  return { cycle: rest as AwardCycle, programName: program?.name ?? 'MuvieStars Honours', categories: (categories ?? []) as AwardCategory[], nominees: noms }
}

export interface RecognitionItem {
  kind: 'shortlisted'
  categoryName: string
  cycleName: string
  href: string
  stage: string
  /** Who is shortlisted, when it is not the page's own subject (for example an actor on a film page). */
  who: string | null
}

/** Shortlist entries for a film: the film itself, and its cast and directors. Public stages only. */
export async function getRecognitionForMovie(movieId: string): Promise<RecognitionItem[]> {
  const supabase = (await createClient()) as any
  const { data: credits } = await supabase.from('movie_people').select('id, person:people(full_name)').eq('movie_id', movieId)
  const creditIds = ((credits ?? []) as any[]).map((c) => c.id)
  const names = new Map<string, string>(((credits ?? []) as any[]).map((c) => [c.id, c.person?.full_name ?? '']))
  const ids = [movieId, ...creditIds]
  const { data } = await supabase
    .from('award_nominees')
    .select('subject_type, subject_id, status, category:award_categories(name, slug), cycle:award_cycles(name, slug, status)')
    .in('subject_id', ids)
    .in('status', ['approved', 'winner', 'runner_up'])
  return itemsFrom(data, (row) => (row.subject_type === 'movie' ? null : names.get(row.subject_id) || null))
}

/** Shortlist entries for a person, through their credits. */
export async function getRecognitionForPerson(personId: string): Promise<RecognitionItem[]> {
  const supabase = (await createClient()) as any
  const { data: credits } = await supabase.from('movie_people').select('id, movie:movies(title)').eq('person_id', personId)
  const filmOf = new Map<string, string>(((credits ?? []) as any[]).map((c) => [c.id, c.movie?.title ?? '']))
  const ids = [...filmOf.keys()]
  if (ids.length === 0) return []
  const { data } = await supabase
    .from('award_nominees')
    .select('subject_type, subject_id, status, category:award_categories(name, slug), cycle:award_cycles(name, slug, status)')
    .in('subject_id', ids)
    .in('status', ['approved', 'winner', 'runner_up'])
  return itemsFrom(data, (row) => filmOf.get(row.subject_id) || null)
}

function itemsFrom(data: any[] | null, who: (row: any) => string | null): RecognitionItem[] {
  return ((data ?? []) as any[])
    .filter((r) => r.cycle && PUBLIC.includes(r.cycle.status) && r.category)
    .map((r) => {
      const [y, m] = String(r.cycle.slug).split('-')
      return {
        kind: 'shortlisted' as const,
        categoryName: r.category.name,
        cycleName: r.cycle.name,
        href: `/awards/${y}/${m}/${r.category.slug}`,
        stage: r.cycle.status,
        who: who(r),
      }
    })
    .sort((a, b) => b.cycleName.localeCompare(a.cycleName))
}
