import type { Movie, Review } from '@/lib/queries'

const SITE_URL = 'https://muviestars.com'
const SITE_NAME = 'MuvieStars'

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    alternateName: 'MuvieStars.com — The African Movie Database',
    description:
      'The most comprehensive database of African cinema. Thousands of films from Nollywood, Ghallywood, Francophone Africa, East Africa, and the diaspora — fully reviewed, rated, and documented.',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  }
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/logo.png`,
      width: 512,
      height: 512,
    },
    description:
      'MuvieStars is dedicated to preserving and celebrating African cinema through a comprehensive archive of films, filmmakers, and community reviews.',
    foundingDate: '2024',
    areaServed: 'Africa',
    knowsAbout: ['African cinema', 'Nollywood', 'Ghallywood', 'African film history'],
  }
}

export function movieSchema(movie: Movie, reviews: Review[] = []) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    '@id': `${SITE_URL}/movie/${movie.id}`,
    name: movie.title,
    description: movie.synopsis || movie.description,
    datePublished: String(movie.release_year),
    genre: capitalise(movie.genre),
    inLanguage: capitalise(movie.language),
    url: `${SITE_URL}/movie/${movie.id}`,
  }

  if (movie.original_title) schema.alternateName = movie.original_title
  if (movie.poster_url) schema.image = movie.poster_url
  if (movie.tagline) schema.abstract = movie.tagline
  if (movie.country) {
    schema.countryOfOrigin = { '@type': 'Country', name: movie.country }
  }
  if (movie.production_company) {
    schema.productionCompany = { '@type': 'Organization', name: movie.production_company }
  }

  if (movie.director || movie.creator?.name) {
    schema.director = {
      '@type': 'Person',
      name: movie.director || movie.creator?.name,
    }
  }

  if (movie.review_count && movie.review_count > 0 && movie.average_rating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(movie.average_rating * 10) / 10,
      reviewCount: movie.review_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  if (reviews.length > 0) {
    schema.review = reviews.slice(0, 3).map((r) => ({
      '@type': 'Review',
      '@id': `${SITE_URL}/movie/${movie.id}#review-${r.id}`,
      reviewBody: r.content,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      datePublished: r.created_at.split('T')[0],
      author: {
        '@type': 'Person',
        name: r.profile?.display_name || r.profile?.username || 'MuvieStars Member',
      },
      itemReviewed: { '@type': 'Movie', name: movie.title },
    }))
  }

  return schema
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function personSchema(person: {
  id: string
  name: string
  bio?: string
  image_url?: string
  nationality?: string
  birth_year?: number
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/person/${person.id}`,
    name: person.name,
    description: person.bio,
    image: person.image_url,
    nationality: person.nationality,
    birthDate: person.birth_year ? String(person.birth_year) : undefined,
    url: `${SITE_URL}/person/${person.id}`,
  }
}

export function faqSchema(items: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

function capitalise(str: string) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str
}
