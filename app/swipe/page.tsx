import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { getDbStats } from '@/lib/queries'
import { getSwipeDeck } from '@/lib/deck'
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
  const [{ data: { user } }, stats] = await Promise.all([
    supabase.auth.getUser(),
    getDbStats(),
  ])

  const movies = await getSwipeDeck({ userId: user?.id ?? null, mood: moodConfig, limit: 30 })

  return (
    <>
      <Navigation />
      <main>
        <SwipeStack
          key={`${moodConfig?.slug ?? 'all'}:${movies[0]?.id ?? 'empty'}`}
          movies={movies}
          totalCount={stats.movieCount}
          userId={user?.id ?? null}
          mood={moodConfig ?? undefined}
        />
      </main>
    </>
  )
}
