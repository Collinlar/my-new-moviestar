import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { JuryScoreCard } from '@/components/JuryScoreCard'
import { createClient } from '@/lib/supabase/server'
import { resolveSubjects, keyOf } from '@/lib/awards'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Jury scoring',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function JuryPage() {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth?next=/jury')

  // Row-level security means a judge only ever sees their own assignments and their own scores.
  const { data: seats } = await supabase.from('award_jurors').select('id, cycle_id, category_id, name').eq('user_id', user.id)
  const mine = (seats ?? []) as Array<{ id: string; cycle_id: string; category_id: string; name: string }>

  const cycleIds = [...new Set(mine.map((s) => s.cycle_id))]
  const [{ data: cycles }, { data: categories }, { data: nominees }, { data: scores }] = cycleIds.length
    ? await Promise.all([
        supabase.from('award_cycles').select('id, name, slug, status').in('id', cycleIds),
        supabase.from('award_categories').select('id, name').in('id', [...new Set(mine.map((s) => s.category_id))]),
        supabase.from('award_nominees').select('id, cycle_id, category_id, subject_type, subject_id, shortlist_rank').in('cycle_id', cycleIds).eq('status', 'approved'),
        supabase.from('award_jury_scores').select('juror_id, nominee_id, rubric_scores, total_score, notes, recused, recusal_reason').in('juror_id', mine.map((s) => s.id)),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  const subjects = await resolveSubjects(supabase, (nominees ?? []) as any[])

  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '40px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Jury</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,76px)', lineHeight: 0.97, color: '#F6EFE2', margin: 0 }}>Your scoring.</h1>
            <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#A39B8F' }}>
              Score each nominee from 1 to 10 on every part of the rubric. Your scores are private to you and the awards administrators. If you worked on a film or have a close tie to it, step out of that nominee and say why.
            </p>
          </header>

          {mine.length === 0 ? (
            <p style={{ fontSize: '17px', color: '#8C857A', lineHeight: 1.6, maxWidth: '520px' }}>
              You are not on a jury right now. If you have been asked to judge, an editor adds you to a category and it appears here when jury review opens.
            </p>
          ) : (
            mine.map((seat) => {
              const cycle = (cycles ?? []).find((c: any) => c.id === seat.cycle_id)
              const cat = (categories ?? []).find((c: any) => c.id === seat.category_id)
              if (!cycle || !cat) return null
              const open = cycle.status === 'jury_review'
              const noms = ((nominees ?? []) as any[])
                .filter((n) => n.cycle_id === seat.cycle_id && n.category_id === seat.category_id)
                .sort((a, b) => (a.shortlist_rank ?? 0) - (b.shortlist_rank ?? 0))
              return (
                <section key={seat.id} aria-labelledby={`seat-${seat.id}`} style={{ paddingBottom: '48px', maxWidth: '860px' }}>
                  <h2 id={`seat-${seat.id}`} style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(28px,3.6vw,40px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 4px' }}>{cat.name}, {cycle.name}</h2>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: open ? '#7FA88B' : '#8C857A' }}>
                    {open ? 'Jury review is open. Score every nominee.' : cycle.status === 'results_locked' || cycle.status === 'published' || cycle.status === 'archived' ? 'Scoring has closed for this cycle.' : 'Scoring opens when jury review starts.'}
                  </p>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {noms.map((n) => {
                      const s = subjects.get(keyOf(n.subject_type, n.subject_id))
                      const mineScore = ((scores ?? []) as any[]).find((x) => x.juror_id === seat.id && x.nominee_id === n.id)
                      return (
                        <JuryScoreCard
                          key={n.id}
                          nomineeId={n.id}
                          title={s?.title ?? 'Unknown'}
                          detail={[s?.filmTitle ? `in ${s.filmTitle}` : null, s?.year].filter(Boolean).join(' · ') || 'Open the film page to read about it.'}
                          href={s?.href ?? '#'}
                          open={open}
                          existing={mineScore ? { rubric: mineScore.rubric_scores ?? {}, total: mineScore.total_score === null ? null : Number(mineScore.total_score), notes: mineScore.notes, recused: !!mineScore.recused, recusalReason: mineScore.recusal_reason } : null}
                        />
                      )
                    })}
                  </ul>
                </section>
              )
            })
          )}
          <p style={{ margin: 0, fontSize: '14px' }}><Link href="/awards" style={{ color: '#C8963E' }}>How the awards work</Link></p>
        </div>
      </main>
      <Footer />
    </>
  )
}
