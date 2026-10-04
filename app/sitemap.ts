import type { MetadataRoute } from 'next'
import { getSitemapMovies, getAllCreatorIds, getIndexablePeople } from '@/lib/queries'
import { getPublishedDecks } from '@/lib/decks'
import { getPublishedChallenges } from '@/lib/challenges'
import { getPublishedSelections } from '@/lib/selections'
import { PUBLIC_STAGES, cycleHref } from '@/lib/awards-shared'
import { createStaticClient } from '@/lib/supabase/static'

const SITE_URL = 'https://muviestars.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, creatorIds, people, decks, challenges, selections, awardCycles] = await Promise.all([
    getSitemapMovies().catch(() => []),
    getAllCreatorIds().catch(() => []),
    getIndexablePeople().catch(() => []),
    getPublishedDecks({ client: createStaticClient(), limit: 200 }).catch(() => []),
    getPublishedChallenges({ client: createStaticClient(), limit: 200 }).catch(() => []),
    getPublishedSelections({ client: createStaticClient(), limit: 200 }).catch(() => []),
    (async () => {
      const db = createStaticClient() as any
      const { data } = await db.from('award_cycles').select('slug, published_at').in('status', [...PUBLIC_STAGES]).limit(200)
      return ((data ?? []) as Array<{ slug: string; published_at: string | null }>)
    })().catch(() => [] as Array<{ slug: string; published_at: string | null }>),
  ])

  const now = new Date().toISOString()

  /* Static pages */
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/discover`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/how-listing-works`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/browse`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/trending`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/featured`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/canon`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/creators`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/people`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/decks`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/challenges`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/awards`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/selections`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/all-reviews`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.75,
    },
  ]

  /* Movie pages. Listed films rank above films still awaiting a listing decision. */
  const moviePages: MetadataRoute.Sitemap = movies.map((m) => ({
    url: `${SITE_URL}/movie/${m.id}`,
    lastModified: m.updated_at || now,
    changeFrequency: 'weekly' as const,
    priority: m.listing_status === 'approved' ? 0.9 : 0.5,
  }))

  /* Creator profile pages */
  const creatorPages: MetadataRoute.Sitemap = creatorIds.map((id) => ({
    url: `${SITE_URL}/creator/${id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  /* People profile pages: directors, actors and crew */
  const peoplePages: MetadataRoute.Sitemap = people.map((p) => ({
    url: `${SITE_URL}/person/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  /* Deck pages: published decks with enough listed films */
  const deckPages: MetadataRoute.Sitemap = decks.map((d) => ({
    url: `${SITE_URL}/decks/${d.slug}`,
    lastModified: d.published_at ?? now,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  /* Challenge pages: open, upcoming and recently ended */
  const challengePages: MetadataRoute.Sitemap = challenges.map((c) => ({
    url: `${SITE_URL}/challenges/${c.slug}`,
    lastModified: c.published_at ?? now,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  /* Selection pages */
  const selectionPages: MetadataRoute.Sitemap = selections.map((s) => ({
    url: `${SITE_URL}/selections/${s.slug}`,
    lastModified: s.published_at ?? now,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  /* Awards: each public cycle and its four category pages */
  const categorySlugs = ['movie-of-the-month', 'performance-of-the-month', 'director-of-the-month', 'audience-choice']
  const awardPages: MetadataRoute.Sitemap = awardCycles.flatMap((c) => [
    { url: `${SITE_URL}${cycleHref(c.slug)}`, lastModified: c.published_at ?? now, changeFrequency: 'weekly' as const, priority: 0.7 },
    ...categorySlugs.map((s) => ({ url: `${SITE_URL}${cycleHref(c.slug, s)}`, lastModified: c.published_at ?? now, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ])

  return [...staticPages, ...moviePages, ...creatorPages, ...peoplePages, ...deckPages, ...challengePages, ...selectionPages, ...awardPages]
}
