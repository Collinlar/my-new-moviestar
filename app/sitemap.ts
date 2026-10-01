import type { MetadataRoute } from 'next'
import { getSitemapMovies, getAllCreatorIds, getIndexablePeople } from '@/lib/queries'

const SITE_URL = 'https://muviestars.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [movies, creatorIds, people] = await Promise.all([
    getSitemapMovies().catch(() => []),
    getAllCreatorIds().catch(() => []),
    getIndexablePeople().catch(() => []),
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

  return [...staticPages, ...moviePages, ...creatorPages, ...peoplePages]
}
