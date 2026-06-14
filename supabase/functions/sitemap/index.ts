import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_URL = 'https://muviestars.com'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🗺️ Generating dynamic sitemap...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch all movies
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id, title, updated_at, genre, release_year, description')
      .order('updated_at', { ascending: false })

    if (moviesError) {
      console.error('Error fetching movies:', moviesError)
      throw moviesError
    }

    // Fetch all creators
    const { data: creators, error: creatorsError } = await supabase
      .from('creators')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false })

    if (creatorsError) {
      console.error('Error fetching creators:', creatorsError)
      throw creatorsError
    }

    console.log(`📊 Found ${movies?.length || 0} movies and ${creators?.length || 0} creators`)

    // Generate sitemap XML
    const today = new Date().toISOString().split('T')[0]

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
    ]

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>\n`
      xml += `    <loc>${BASE_URL}${page.url}</loc>\n`
      xml += `    <lastmod>${today}</lastmod>\n`
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`
      xml += `    <priority>${page.priority}</priority>\n`
      xml += `  </url>\n`
    }

    // Add movie pages with rich metadata
    for (const movie of movies || []) {
      const lastmod = movie.updated_at ? movie.updated_at.split('T')[0] : today
      xml += `  <url>\n`
      xml += `    <loc>${BASE_URL}/movie/${movie.id}</loc>\n`
      xml += `    <lastmod>${lastmod}</lastmod>\n`
      xml += `    <changefreq>weekly</changefreq>\n`
      xml += `    <priority>0.8</priority>\n`
      xml += `  </url>\n`
    }

    // Add creator pages
    for (const creator of creators || []) {
      const lastmod = creator.updated_at ? creator.updated_at.split('T')[0] : today
      xml += `  <url>\n`
      xml += `    <loc>${BASE_URL}/creator/${creator.id}</loc>\n`
      xml += `    <lastmod>${lastmod}</lastmod>\n`
      xml += `    <changefreq>weekly</changefreq>\n`
      xml += `    <priority>0.7</priority>\n`
      xml += `  </url>\n`
    }

    xml += '</urlset>'

    console.log('✅ Sitemap generated successfully')

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('❌ Error generating sitemap:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate sitemap' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
