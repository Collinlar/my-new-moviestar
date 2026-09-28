import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { browseMovies, getDbStats } from '@/lib/queries'
import { SwipeStack } from '@/components/SwipeStack'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Swipe Through African Cinema | MuvieStars',
  description: 'Discover African films one card at a time. Mark what you have seen, find what you have been missing.',
  alternates: { canonical: 'https://muviestars.com/swipe' },
}

export const dynamic = 'force-dynamic'

export default async function SwipePage() {
  const supabase = await createClient() as any
  const [{ movies }, stats, { data: { user } }] = await Promise.all([
    browseMovies({ sortBy: 'review_count', sortOrder: 'desc', limit: 30 }),
    getDbStats(),
    supabase.auth.getUser(),
  ])

  return (
    <>
      <Navigation />
      <main>
        <SwipeStack movies={movies} totalCount={stats.movieCount} userId={user?.id ?? null} />
      </main>
    </>
  )
}
