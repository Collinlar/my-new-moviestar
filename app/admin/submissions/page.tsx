import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { SubmissionsDesk } from '@/components/admin/SubmissionsDesk'
import { NOMINATION_REVIEW_THRESHOLD } from '@/lib/submissions'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Submissions | Admin' }

const plain = (s: string) => s.replace(/[%_,()*\\"']/g, ' ').replace(/\s+/g, ' ').trim()

interface Group {
  key: string
  title: string
  year: number | null
  movieId: string | null
  status: string | null
  count: number
  reasons: string[]
  links: string[]
}

export default async function AdminSubmissionsPage() {
  const { supabase } = await requireAdmin()
  const db = supabase as any

  const [{ data: open }, { data: decided }, { data: noms }] = await Promise.all([
    db.from('movie_listing_submissions').select('*').in('status', ['received', 'needs_information']).order('created_at', { ascending: true }),
    db.from('movie_listing_submissions').select('id, title, release_year, status, decline_reason, movie_id, reviewed_at').in('status', ['accepted', 'declined']).order('reviewed_at', { ascending: false }).limit(15),
    db.from('movie_nominations').select('movie_id, title, release_year, link, reason, user_id, movie:movies(id, title, release_year, listing_status)').limit(2000),
  ])

  // Possible duplicates: films already in the catalogue with the same title.
  const submissions = await Promise.all(
    ((open ?? []) as any[]).map(async (s) => {
      const { data: dupes } = await db
        .from('movies')
        .select('id, title, release_year, listing_status')
        .ilike('title', plain(s.title))
        .limit(5)
      return { ...s, dupes: dupes ?? [] }
    }),
  )

  const groups = new Map<string, Group>()
  for (const n of (noms ?? []) as any[]) {
    const key = n.movie_id ? `m:${n.movie_id}` : `t:${String(n.title).trim().toLowerCase()}|${n.release_year ?? ''}`
    const g = groups.get(key) ?? {
      key,
      title: n.movie?.title ?? n.title,
      year: n.movie?.release_year ?? n.release_year ?? null,
      movieId: n.movie_id ?? null,
      status: n.movie?.listing_status ?? null,
      count: 0, reasons: [], links: [],
    }
    g.count += 1
    if (n.reason && g.reasons.length < 3) g.reasons.push(n.reason)
    if (n.link && g.links.length < 2 && !g.links.includes(n.link)) g.links.push(n.link)
    groups.set(key, g)
  }
  const nominations = [...groups.values()].sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Catalogue</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Submissions and nominations
          <span className="ml-2 text-base font-normal text-film-muted">({submissions.length} waiting)</span>
        </h1>
        <p className="mt-2 text-sm text-film-muted max-w-xl">
          Accepting a submission puts the film in the <Link href="/admin/listing" className="underline">listing queue</Link> as &ldquo;submitted&rdquo;. It is listed only after it passes the same checks as every other film.
        </p>
      </div>

      <SubmissionsDesk submissions={submissions} decided={(decided as any[]) ?? []} />

      <section style={{ marginTop: '56px', maxWidth: '860px' }}>
        <h2 className="text-lg font-semibold text-film-cream">Nominations</h2>
        <p className="mt-1 mb-4 text-sm text-film-muted">
          {NOMINATION_REVIEW_THRESHOLD} different people flags a film for review. A nomination is a signal, never a listing.
        </p>
        {nominations.length === 0 ? (
          <p style={{ fontSize: '14px', color: '#8C857A' }}>No nominations yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {nominations.map((g) => {
              const flagged = g.count >= NOMINATION_REVIEW_THRESHOLD
              return (
                <li key={g.key} style={{ padding: '14px 0', borderTop: '1px solid rgba(237,228,210,0.08)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <span style={{ minWidth: '56px', fontSize: '22px', fontWeight: 600, color: flagged ? '#C8963E' : '#8C857A' }}>{g.count}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>
                      {g.title} <span style={{ fontWeight: 400, color: '#8C857A' }}>{g.year ?? ''}</span>
                      {flagged && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#C8963E', fontFamily: '"Geist Mono", monospace' }}>READY FOR REVIEW</span>}
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#8C857A', fontFamily: '"Geist Mono", monospace' }}>
                      {g.movieId ? `In the catalogue, status: ${g.status}` : 'Not in the catalogue yet'}
                    </span>
                    {g.reasons.map((r) => <span key={r} style={{ display: 'block', fontSize: '13px', color: '#A39B8F', marginTop: '4px' }}>&ldquo;{r}&rdquo;</span>)}
                    {g.links.map((l) => <a key={l} href={l} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '13px', color: '#8FA8C8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</a>)}
                  </span>
                  {g.movieId ? (
                    <Link href={`/admin/listing?q=${encodeURIComponent(g.title)}`} style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', fontSize: '13px', color: '#C8963E' }}>Open in the queue</Link>
                  ) : (
                    <Link href="/admin/movies/add" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center', fontSize: '13px', color: '#C8963E' }}>Add to the catalogue</Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
