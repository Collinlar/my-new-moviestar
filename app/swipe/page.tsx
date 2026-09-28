import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { browseMovies, getDbStats } from '@/lib/queries'
import { SwipeStack } from '@/components/SwipeStack'
import { MOOD_MAP } from '@/lib/mood'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Swipe Through African Cinema | MuvieStars',
  description: 'Discover African films one card at a time. Mark what you have seen, find what you have been missing.',
  alternates: { canonical: 'https://muviestars.com/swipe' },
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ mood?: string }>
}

export default async function SwipePage({ searchParams }: PageProps) {
  const { mood: moodSlug } = await searchParams
  const moodConfig = moodSlug ? MOOD_MAP[moodSlug] ?? null : null

  const supabase = await createClient() as any

  const query = moodConfig
    ? { ...moodConfig.query, limit: 30 }
    : { sortBy: 'review_count', sortOrder: 'desc' as const, limit: 30 }

  const [{ movies }, stats, { data: { user } }] = await Promise.all([
    browseMovies(query),
    getDbStats(),
    supabase.auth.getUser(),
  ])

  return (
    <>
      <Navigation />
      <main>
        <SwipeStack
          movies={movies}
          totalCount={stats.movieCount}
          userId={user?.id ?? null}
          mood={moodConfig ?? undefined}
        />
      </main>
    </>
  )
}
