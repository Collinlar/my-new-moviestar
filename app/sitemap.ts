import type { MetadataRoute } from 'next'
import { getAllMovieIds, getAllCreatorIds } from '@/lib/queries'

const SITE_URL = 'https://muviestars.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movieIds, creatorIds] = await Promise.all([
    getAllMovieIds().catch(() => []),
    getAllCreatorIds().catch(() => []),
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
      url: `${SITE_URL}/all-reviews`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.75,
    },
  ]

  /* Movie detail pages — highest value pages for indexing */
  const moviePages: MetadataRoute.Sitemap = movieIds.map((id) => ({
    url: `${SITE_URL}/movie/${id}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  /* Creator profile pages */
  const creatorPages: MetadataRoute.Sitemap = creatorIds.map((id) => ({
    url: `${SITE_URL}/creator/${id}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...moviePages, ...creatorPages]
}
