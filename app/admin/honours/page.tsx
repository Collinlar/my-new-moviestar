import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { HonoursCycleStarter } from '@/components/admin/HonoursCycleStarter'
import { STAGE_LABELS, type CycleStage } from '@/lib/awards-shared'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Honours | Admin' }

export default async function AdminHonoursPage() {
  const { supabase } = await requireAdmin()
  const db = supabase as any

  const [{ data: cycles }, { data: programs }] = await Promise.all([
    db.from('award_cycles').select('id, name, slug, status, program_id, qualification_start, voting_end, program:award_programs(name)').order('slug', { ascending: false }),
    db.from('award_programs').select('id, name').eq('active', true).order('name'),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Recognition</p>
        <h1 className="text-2xl font-bold text-film-cream">Honours</h1>
        <p className="mt-2 text-sm text-film-muted max-w-xl">
          MuvieStars&rsquo; own recognition: Movie of the Month, Performance of the Month, Director of the Month and Audience Choice. Festival and industry awards live under <Link href="/admin/awards" className="underline">Awards</Link> and are kept separate.
        </p>
      </div>

      <HonoursCycleStarter programs={(programs as any[]) ?? []} />

      {(cycles ?? []).length === 0 ? (
        <p style={{ fontSize: '14px', color: '#8C857A' }}>No cycles yet. Start one for the month you want to run.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '860px' }}>
          {(cycles as any[]).map((c) => (
            <li key={c.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
              <Link href={`/admin/honours/${c.id}`} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 0', textDecoration: 'none', minHeight: '44px' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>{c.name}</span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#8C857A', fontFamily: '"Geist Mono", monospace' }}>{c.program?.name}</span>
                </span>
                <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', background: 'rgba(200,150,62,0.12)', color: '#C8963E' }}>
                  {STAGE_LABELS[c.status as CycleStage] ?? c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
