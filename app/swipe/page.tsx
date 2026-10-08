import type { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { getDbStats } from '@/lib/queries'
import { getDeckCards, getSwipeDeck } from '@/lib/deck'
import { SwipeStack } from '@/components/SwipeStack'
import { MOOD_MAP } from '@/lib/mood'
import { createClient } from '@/lib/supabase/server'
import { withWatchChecks } from '@/lib/watch-checks'

export const metadata: Metadata = {
  title: 'Swipe Through African Cinema | MuvieStars',
  description: 'Discover African films one card at a time. Mark what you have seen, find what you have been missing.',
  alternates: { canonical: 'https://muviestars.com/swipe' },
}

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ mood?: string; deck?: string }>
}

export default async function SwipePage({ searchParams }: PageProps) {
  const { mood: moodSlug, deck: deckSlug } = await searchParams
  const moodConfig = moodSlug ? MOOD_MAP[moodSlug] ?? null : null

  const supabase = await createClient() as any
  const [{ data: { user } }, stats] = await Promise.all([
    supabase.auth.getUser(),
    getDbStats(),
  ])

  // A published deck takes priority. An unknown or unpublished deck quietly falls back to the ordinary deck.
  const fromDeck = deckSlug ? await getDeckCards({ userId: user?.id ?? null, deckSlug, limit: 40 }) : null
  const deck = fromDeck ? fromDeck.movies : await getSwipeDeck({ userId: user?.id ?? null, mood: moodConfig, limit: 30 })
  // Each card says where the film can be watched, so it needs what the last link check found.
  const movies = await withWatchChecks(supabase, deck)
  const display = fromDeck ? fromDeck.display : moodConfig

  return (
    <>
      <Navigation />
      <main>
        <SwipeStack
          key={`${display?.slug ?? 'all'}:${movies[0]?.id ?? 'empty'}`}
          movies={movies}
          totalCount={stats.movieCount}
          userId={user?.id ?? null}
          mood={display ?? undefined}
        />
      </main>
    </>
  )
}
