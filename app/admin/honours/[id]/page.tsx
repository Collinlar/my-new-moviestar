import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { CycleWorkbench, type WorkbenchCategory, type WorkbenchRow } from '@/components/admin/CycleWorkbench'
import { ResultsDesk, type DeskResult } from '@/components/admin/ResultsDesk'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminCyclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { supabase } = await requireAdmin()
  const db = supabase as any

  const { data: cycle } = await db.from('award_cycles').select('*, program:award_programs(name)').eq('id', id).maybeSingle()
  if (!cycle) notFound()

  const [{ data: categories }, { data: eligibility }, { data: nominees }, { data: audit }, { data: voteRows }, { data: jurorRows }, { data: resultRows }, { data: outcomeRows }] = await Promise.all([
    db.from('award_categories').select('id, name, slug, subject_type, method_type, min_nominees, max_nominees').eq('program_id', cycle.program_id).eq('active', true).order('name'),
    db.from('award_eligibility').select('id, category_id, subject_type, subject_id, eligible, qualification_score, disqualification_reason, metadata, override').eq('cycle_id', id).limit(2000),
    db.from('award_nominees').select('id, category_id, subject_type, subject_id, shortlist_rank, status, selection_reason').eq('cycle_id', id).order('shortlist_rank', { ascending: true }).limit(500),
    db.from('award_audit_log').select('id, action, entity_type, reason, after_state, created_at').in('entity_type', ['award_cycle', 'award_nominee', 'award_eligibility']).order('created_at', { ascending: false }).limit(40),
    db.from('award_votes').select('category_id').eq('cycle_id', id).limit(20000),
    db.from('award_jurors').select('id, category_id, name, organisation, bio, user_id').eq('cycle_id', id).order('name'),
    db.from('award_results').select('nominee_id, category_id, rank, result_status, final_score, jury_score, community_score, engagement_score, confidence_score, components').eq('cycle_id', id),
    db.from('award_cycle_categories').select('category_id, outcome, outcome_reason, manual, story').eq('cycle_id', id),
  ])

  const votes: Record<string, number> = {}
  for (const v of (voteRows ?? []) as Array<{ category_id: string }>) votes[v.category_id] = (votes[v.category_id] ?? 0) + 1

  // Names for the people and films behind each subject id.
  const subjects = [...(eligibility ?? []), ...(nominees ?? [])] as Array<{ subject_type: string; subject_id: string }>
  const movieIds = [...new Set(subjects.filter((s) => s.subject_type === 'movie').map((s) => s.subject_id))]
  const creditIds = [...new Set(subjects.filter((s) => s.subject_type !== 'movie').map((s) => s.subject_id))]
  const [{ data: movies }, { data: credits }] = await Promise.all([
    movieIds.length ? db.from('movies').select('id, title, release_year').in('id', movieIds) : Promise.resolve({ data: [] }),
    creditIds.length ? db.from('movie_people').select('id, person:people(full_name), movie:movies(title, release_year)').in('id', creditIds) : Promise.resolve({ data: [] }),
  ])
  const movieName = new Map<string, { label: string; sub: string }>((movies ?? []).map((m: any) => [m.id, { label: m.title, sub: m.release_year ? String(m.release_year) : '' }]))
  const creditName = new Map<string, { label: string; sub: string }>((credits ?? []).map((c: any) => [c.id, { label: c.person?.full_name ?? 'Unknown', sub: [c.movie?.title, c.movie?.release_year].filter(Boolean).join(' ') }]))
  const nomineeSubject = new Map<string, { type: string; id: string }>(((nominees ?? []) as any[]).map((n) => [n.id, { type: n.subject_type, id: n.subject_id }]))
  const nameOf = (type: string, sid: string) => (type === 'movie' ? movieName.get(sid) : creditName.get(sid)) ?? { label: 'Unknown', sub: '' }

  const rowOf = (e: any): WorkbenchRow => ({
    subjectType: e.subject_type, subjectId: e.subject_id, ...nameOf(e.subject_type, e.subject_id),
    score: e.qualification_score === null ? null : Number(e.qualification_score),
    reason: e.disqualification_reason ?? null, metadata: e.metadata ?? {}, override: !!e.override, eligible: !!e.eligible,
  })

  const cats: WorkbenchCategory[] = ((categories ?? []) as any[]).map((k) => {
    const rows = ((eligibility ?? []) as any[]).filter((e) => e.category_id === k.id)
    const noms = ((nominees ?? []) as any[]).filter((n) => n.category_id === k.id)
    const nomKeys = new Set(noms.filter((n) => ['proposed', 'approved'].includes(n.status)).map((n) => `${n.subject_type}:${n.subject_id}`))
    return {
      id: k.id, name: k.name, slug: k.slug, method: k.method_type, minNominees: k.min_nominees, maxNominees: k.max_nominees,
      nominees: noms.map((n) => ({ id: n.id, status: n.status, rank: n.shortlist_rank, reason: n.selection_reason, subjectType: n.subject_type, subjectId: n.subject_id, ...nameOf(n.subject_type, n.subject_id) })),
      eligible: rows.filter((e) => e.eligible && !nomKeys.has(`${e.subject_type}:${e.subject_id}`)).map(rowOf).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
      eligibleTotal: rows.filter((e) => e.eligible).length,
      ineligible: rows.filter((e) => !e.eligible).map(rowOf),
    }
  })

  const deskResults: DeskResult[] = ((resultRows ?? []) as any[]).map((r) => {
    const s = nomineeSubject.get(r.nominee_id)
    const nm = s ? nameOf(s.type, s.id) : { label: 'Unknown', sub: '' }
    const n = (v: any) => (v === null || v === undefined ? null : Number(v))
    return {
      nomineeId: r.nominee_id, categoryId: r.category_id, label: nm.label, sub: nm.sub, rank: r.rank, status: r.result_status,
      final: n(r.final_score), jury: n(r.jury_score), community: n(r.community_score), engagement: n(r.engagement_score), confidence: n(r.confidence_score),
      components: r.components ?? {},
    }
  })

  return (
    <div className="p-8">
      <Link href="/admin/honours" className="text-sm text-film-muted">← All cycles</Link>
      <h1 className="text-2xl font-bold text-film-cream mt-3 mb-1">{cycle.name}</h1>
      <p className="text-sm text-film-muted mb-8">{cycle.program?.name}</p>
      <CycleWorkbench
        cycle={{ id: cycle.id, status: cycle.status, qualificationStart: cycle.qualification_start, qualificationEnd: cycle.qualification_end, votingStart: cycle.voting_start, votingEnd: cycle.voting_end }}
        categories={cats}
        votes={votes}
        audit={((audit ?? []) as any[]).map((a) => ({ id: a.id, action: a.action, entity: a.entity_type, reason: a.reason, at: a.created_at }))}
      />
      {['voting_open', 'voting_closed', 'jury_review', 'results_locked', 'published', 'archived'].includes(cycle.status) && (
        <ResultsDesk
          cycleId={cycle.id}
          stage={cycle.status}
          categories={cats.map((k) => ({ id: k.id, name: k.name, slug: k.slug, method: k.method, minNominees: k.minNominees }))}
          jurors={((jurorRows ?? []) as any[]).map((j) => ({ id: j.id, categoryId: j.category_id, name: j.name, organisation: j.organisation, bio: j.bio, hasAccount: !!j.user_id }))}
          results={deskResults}
          outcomes={((outcomeRows ?? []) as any[]).map((o) => ({ categoryId: o.category_id, outcome: o.outcome, reason: o.outcome_reason, manual: !!o.manual, story: o.story }))}
        />
      )}
    </div>
  )
}
