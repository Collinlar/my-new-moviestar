import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { challengeState, stateLine } from '@/lib/challenges-shared'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft:     { bg: 'rgba(143,168,200,0.12)', color: '#8FA8C8' },
  published: { bg: 'rgba(127,168,139,0.12)', color: '#7FA88B' },
  archived:  { bg: 'rgba(163,155,143,0.10)', color: '#A39B8F' },
}

export default async function AdminChallengesPage() {
  const { supabase } = await requireAdmin()

  const [{ data: challenges }, { data: joins }, { data: completions }] = await Promise.all([
    (supabase as any)
      .from('challenges')
      .select('id, slug, title, kind, status, featured, goal, starts_at, ends_at, sponsor_name, deck:decks(title)')
      .order('ends_at', { ascending: false }),
    (supabase as any).from('challenge_joins').select('challenge_id'),
    (supabase as any).from('challenge_completions').select('challenge_id'),
  ])

  const count = (rows: any[] | null, id: string) => (rows ?? []).filter((r) => r.challenge_id === id).length
  const now = new Date()

  return (
    <div className="p-8">
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="section-label mb-1">Content</p>
          <h1 className="text-2xl font-bold text-film-cream">
            Challenges
            <span className="ml-2 text-base font-normal text-film-muted">({(challenges ?? []).length})</span>
          </h1>
          <p className="mt-2 text-sm text-film-muted max-w-xl">
            A challenge is a published deck plus a goal and a window. People who finish earn a laurel. A sponsor name is shown wherever the challenge appears and never changes which films count.
          </p>
        </div>
        <Link
          href="/admin/challenges/new"
          style={{ height: '40px', padding: '0 20px', borderRadius: '10px', background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)', color: '#C8963E', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none', fontFamily: '"Geist Mono", monospace' }}
        >
          + Start a challenge
        </Link>
      </div>

      {(challenges ?? []).length === 0 ? (
        <p style={{ fontSize: '14px', color: '#8C857A' }}>No challenges yet. Publish a deck with at least a few listed films, then start one.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxWidth: '900px' }}>
          {(challenges as any[]).map((c) => {
            const st = STATUS_STYLES[c.status]
            return (
              <li key={c.id} style={{ borderTop: '1px solid rgba(237,228,210,0.08)' }}>
                <Link href={`/admin/challenges/${c.id}`} style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '14px 0', textDecoration: 'none', minHeight: '44px' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>{c.title}</span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#8C857A', fontFamily: '"Geist Mono", monospace' }}>
                      {c.deck?.title ?? 'No deck'} · take {c.goal}
                      {c.kind === 'club_paired' ? ' + Club film' : ''}
                      {' · '}{challengeState(c, now) === 'ended' ? 'ended' : stateLine(c, now).toLowerCase()}
                      {' · '}{count(joins, c.id)} joined · {count(completions, c.id)} done
                      {c.sponsor_name ? ` · sponsored by ${c.sponsor_name}` : ''}
                      {c.featured ? ' · featured' : ''}
                    </span>
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '12px', background: st.bg, color: st.color }}>{c.status}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
