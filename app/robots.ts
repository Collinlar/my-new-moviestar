import type { MetadataRoute } from 'next'

const SITE_URL = 'https://muviestars.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/dashboard',
          '/auth',
          '/profile/edit',
          '/watchlist',
          '/favorites',
          '/reviews',
          '/activity',
          '/api/',
        ],
      },
      /* AI crawlers — allow full access to movie content */
      {
        userAgent: 'GPTBot',
        allow: ['/movie/', '/browse', '/trending', '/canon', '/creators', '/people', '/all-reviews'],
        disallow: ['/admin', '/dashboard', '/auth'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/movie/', '/browse', '/trending', '/canon', '/creators', '/people', '/all-reviews'],
        disallow: ['/admin', '/dashboard', '/auth'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/movie/', '/browse', '/trending', '/canon', '/creators', '/people', '/all-reviews'],
        disallow: ['/admin', '/dashboard', '/auth'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
