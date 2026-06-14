import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.movie';
  keywords?: string;
  schema?: object;
}

/**
 * SEOHead Component - Manages dynamic SEO meta tags
 * Updates document head with proper meta tags for search engines
 */
const SEOHead = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
  schema
}: SEOHeadProps) => {
  const siteName = 'MuvieStars.com';
  const fullTitle = `${title} | ${siteName}`;
  const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  useEffect(() => {
    // Update title
    document.title = fullTitle;

    // Helper to update or create meta tags
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Standard meta tags
    setMetaTag('description', description);
    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    // Open Graph tags
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:site_name', siteName, true);
    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
    }
    
    // Open Graph image with proper dimensions for social sharing
    if (image) {
      setMetaTag('og:image', image, true);
      setMetaTag('og:image:secure_url', image, true);
      setMetaTag('og:image:type', 'image/jpeg', true);
      setMetaTag('og:image:width', '1200', true);
      setMetaTag('og:image:height', '630', true);
      setMetaTag('og:image:alt', title, true);
    } else {
      // Fallback to site default image
      const defaultImage = 'https://muviestars.com/og-default.png';
      setMetaTag('og:image', defaultImage, true);
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:site', '@MuvieStars');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    if (image) {
      setMetaTag('twitter:image', image);
      setMetaTag('twitter:image:alt', title);
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Schema.org JSON-LD
    if (schema) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.setAttribute('type', 'application/ld+json');
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    }

    // Cleanup function
    return () => {
      // Reset title on unmount if needed
    };
  }, [fullTitle, description, image, canonicalUrl, type, keywords, schema]);

  return null;
};

export default SEOHead;

// Movie-specific schema generator
export const generateMovieSchema = (movie: {
  title: string;
  description?: string;
  release_year: number;
  genre: string;
  language: string;
  poster_url?: string;
  average_rating?: number;
  review_count?: number;
  director?: string;
  creator?: { name: string };
}) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": movie.title,
    "description": movie.description || `${movie.title} - A ${movie.genre} movie from ${movie.release_year}`,
    "datePublished": movie.release_year.toString(),
    "genre": movie.genre.charAt(0).toUpperCase() + movie.genre.slice(1),
    "inLanguage": movie.language.charAt(0).toUpperCase() + movie.language.slice(1),
  };

  if (movie.poster_url) {
    schema.image = movie.poster_url;
  }

  if (movie.review_count && movie.review_count > 0 && 
      movie.average_rating && movie.average_rating >= 1 && movie.average_rating <= 5) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": Math.max(1, Math.min(5, movie.average_rating)),
      "reviewCount": Math.max(1, movie.review_count),
      "bestRating": 5,
      "worstRating": 1
    };
  }

  if (movie.director || movie.creator?.name) {
    schema.director = {
      "@type": "Person",
      "name": movie.director || movie.creator?.name
    };
  }

  return schema;
};

// Website schema for homepage
export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MuvieStars.com - The African Movie Database",
  "description": "Africa's most complete collection of movies, filmmakers, and reviews — from timeless classics to new releases across Nollywood, Ghallywood, and beyond.",
  "url": "https://muviestars.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://muviestars.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
});

// Organization schema
export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "MuvieStars.com",
  "url": "https://muviestars.com",
  "logo": "https://muviestars.com/favicon.ico",
  "sameAs": [],
  "description": "The African Movie Database — preserving and celebrating African cinema through a comprehensive archive of films, filmmakers, and community reviews."
});
