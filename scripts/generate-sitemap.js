#!/usr/bin/env node

/**
 * Sitemap Generator for Muviestars.com
 * 
 * This script generates a dynamic sitemap.xml file by fetching movies and creators
 * from the Supabase database and creating URLs for each item.
 * 
 * Usage:
 *   node scripts/generate-sitemap.js
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = "https://anjavnuqkkmpsnjmopou.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuamF2bnVxa2ttcHNuam1vcG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDcyMTUsImV4cCI6MjA3MDkyMzIxNX0.FO0Wj6MQoCA8-CVj172TgW37qi2xxebV0Xt16P-2scM";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = 'https://muviestars.com';

/**
 * Format date for sitemap
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Create URL entry for sitemap
 */
function createUrlEntry(loc, lastmod, changefreq = 'weekly', priority = 0.7) {
  return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Generate sitemap XML
 */
function generateSitemap(staticPages, movies, creators, reviews) {
  const today = formatDate(new Date());
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
  
`;

  // Add static pages
  sitemap += '  <!-- Static Pages -->\n';
  staticPages.forEach(page => {
    sitemap += createUrlEntry(
      `${BASE_URL}${page.path}`,
      page.lastmod || today,
      page.changefreq || 'weekly',
      page.priority || 0.7
    );
    sitemap += '\n';
  });

  // Add movies
  if (movies && movies.length > 0) {
    sitemap += '  <!-- Movies -->\n';
    movies.forEach(movie => {
      sitemap += createUrlEntry(
        `${BASE_URL}/movie/${movie.id}`,
        formatDate(movie.updated_at),
        'weekly',
        0.8
      );
      sitemap += '\n';
    });
  }

  // Add creators
  if (creators && creators.length > 0) {
    sitemap += '  <!-- Creators -->\n';
    creators.forEach(creator => {
      sitemap += createUrlEntry(
        `${BASE_URL}/creator/${creator.id}`,
        formatDate(creator.updated_at),
        'weekly',
        0.6
      );
      sitemap += '\n';
    });
  }

  // Add reviews
  if (reviews && reviews.length > 0) {
    sitemap += '  <!-- Reviews -->\n';
    reviews.forEach(review => {
      sitemap += createUrlEntry(
        `${BASE_URL}/review/${review.id}`,
        formatDate(review.updated_at || review.created_at),
        'monthly',
        0.5
      );
      sitemap += '\n';
    });
  }

  sitemap += '</urlset>\n';
  
  return sitemap;
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Generating sitemap for Muviestars.com...\n');

  try {
    // Fetch movies
    console.log('📽️  Fetching movies...');
    const { data: movies, error: moviesError } = await supabase
      .from('movies')
      .select('id, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (moviesError) {
      console.error('❌ Error fetching movies:', moviesError.message);
    } else {
      console.log(`✅ Found ${movies.length} movies`);
    }

    // Fetch creators
    console.log('👥 Fetching creators...');
    const { data: creators, error: creatorsError } = await supabase
      .from('creators')
      .select('id, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (creatorsError) {
      console.error('❌ Error fetching creators:', creatorsError.message);
    } else {
      console.log(`✅ Found ${creators.length} creators`);
    }

    // Fetch reviews (limit to recently updated reviews)
    console.log('💬 Fetching recent reviews...');
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(100); // Limit to 100 most recent reviews to avoid bloating the sitemap

    if (reviewsError) {
      console.error('❌ Error fetching reviews:', reviewsError.message);
    } else {
      console.log(`✅ Found ${reviews.length} reviews (showing 100 most recent)`);
    }

    // Define static pages
    const staticPages = [
      { path: '/', changefreq: 'daily', priority: 1.0 },
      { path: '/browse', changefreq: 'weekly', priority: 0.9 },
      { path: '/movies', changefreq: 'weekly', priority: 0.9 },
      { path: '/featured', changefreq: 'daily', priority: 0.8 },
      { path: '/trending', changefreq: 'daily', priority: 0.8 },
      { path: '/all-reviews', changefreq: 'daily', priority: 0.7 },
      { path: '/creators', changefreq: 'weekly', priority: 0.7 },
      { path: '/search', changefreq: 'monthly', priority: 0.6 },
      { path: '/profiles', changefreq: 'weekly', priority: 0.6 },
      { path: '/auth', changefreq: 'monthly', priority: 0.3 },
    ];

    // Generate sitemap
    console.log('\n📝 Generating sitemap XML...');
    const sitemapContent = generateSitemap(
      staticPages,
      movies || [],
      creators || [],
      reviews || []
    );

    // Write to file
    const outputPath = join(process.cwd(), 'public', 'sitemap.xml');
    writeFileSync(outputPath, sitemapContent, 'utf8');

    const totalUrls = staticPages.length + (movies?.length || 0) + (creators?.length || 0) + (reviews?.length || 0);
    console.log(`✅ Sitemap generated successfully!`);
    console.log(`📊 Total URLs: ${totalUrls}`);
    console.log(`   - Static pages: ${staticPages.length}`);
    console.log(`   - Movies: ${movies?.length || 0}`);
    console.log(`   - Creators: ${creators?.length || 0}`);
    console.log(`   - Reviews: ${reviews?.length || 0}`);
    console.log(`📁 Saved to: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Error generating sitemap:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
