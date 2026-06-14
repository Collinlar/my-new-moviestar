/**
 * Dynamic Sitemap Generator
 * 
 * Generates a fresh sitemap.xml with all movies, creators, and pages.
 * Called on-demand or can be scheduled via cron.
 */

const BASE_URL = process.env.BASE_URL || 'https://muviestars.com';

// Supabase connection for fetching movies
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Fetch all movies from Supabase
 */
async function fetchAllMovies() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase credentials not configured');
    return [];
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/movies?select=id,title,updated_at,genre,release_year`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movies: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

/**
 * Fetch all creators from Supabase
 */
async function fetchAllCreators() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return [];
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/creators?select=id,name,updated_at`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch creators: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching creators:', error);
    return [];
  }
}

/**
 * Generate sitemap XML
 */
function generateSitemapXML(movies, creators) {
  const today = new Date().toISOString().split('T')[0];
  
  // Static pages
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/movies', priority: '0.9', changefreq: 'daily' },
    { url: '/creators', priority: '0.8', changefreq: 'weekly' },
    { url: '/trending', priority: '0.8', changefreq: 'daily' },
    { url: '/featured', priority: '0.8', changefreq: 'daily' },
    { url: '/browse', priority: '0.7', changefreq: 'weekly' },
    { url: '/search', priority: '0.6', changefreq: 'weekly' },
    { url: '/all-reviews', priority: '0.7', changefreq: 'daily' },
  ];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
  xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';

  // Add static pages
  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <lastmod>${today}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Add movie pages
  for (const movie of movies) {
    const lastmod = movie.updated_at ? movie.updated_at.split('T')[0] : today;
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/movie/${movie.id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  // Add creator pages
  for (const creator of creators) {
    const lastmod = creator.updated_at ? creator.updated_at.split('T')[0] : today;
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/creator/${creator.id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.7</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += '</urlset>';
  return xml;
}

/**
 * Netlify function handler
 */
export const handler = async (event, context) => {
  console.log('🗺️ Generating dynamic sitemap...');

  try {
    // Fetch all data
    const [movies, creators] = await Promise.all([
      fetchAllMovies(),
      fetchAllCreators()
    ]);

    console.log(`📊 Found ${movies.length} movies and ${creators.length} creators`);

    // Generate sitemap
    const sitemap = generateSitemapXML(movies, creators);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
      body: sitemap
    };

  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate sitemap' })
    };
  }
};
