import type { MetadataRoute } from 'next'

const SITE_URL = 'https://muviestars.com'

// Link-preview bots (WhatsApp, Facebook, X) follow the "*" rules. The share-card image route
// lives under /api/, so it is allowed explicitly; the more specific rule wins over "/api/".
const PRIVATE = ['/admin', '/dashboard', '/auth', '/account', '/edit-profile', '/profile/edit', '/watchlist', '/favorites', '/reviews', '/activity']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og/'],
        disallow: [...PRIVATE, '/api/'],
      },
      /* AI crawlers: allow the public film, people and discovery pages */
      {
        userAgent: ['GPTBot', 'Claude-Web', 'PerplexityBot'],
        allow: ['/movie/', '/person/', '/people', '/discover', '/how-listing-works', '/browse', '/trending', '/canon', '/creators', '/all-reviews', '/decks', '/challenges', '/api/og/'],
        disallow: [...PRIVATE, '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
