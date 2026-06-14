# Sitemap Generator for Muviestars.com

This directory contains a dynamic sitemap generator that creates sitemap.xml files for search engine optimization.

## 📋 Overview

The sitemap generator fetches all movies and creators from the Supabase database and generates a complete sitemap with:
- Static pages (home, browse, movies, etc.)
- Dynamic movie pages (`/movie/:id`)
- Dynamic creator pages (`/creator/:id`)

## 🚀 Usage

### Generate Sitemap

```bash
npm run generate-sitemap
```

Or run directly:

```bash
node scripts/generate-sitemap.js
```

### What It Does

1. **Fetches Data**: Retrieves all movies and creators from Supabase
2. **Generates XML**: Creates properly formatted sitemap.xml
3. **Saves File**: Writes to `public/sitemap.xml`

## 📊 Output

The generated sitemap includes:

### Static Pages (Priority: High)
- `/` - Homepage (Priority: 1.0, Daily updates)
- `/browse` - Browse movies (Priority: 0.9, Weekly updates)
- `/movies` - All movies (Priority: 0.9, Weekly updates)
- `/featured` - Featured movies (Priority: 0.8, Daily updates)
- `/trending` - Trending movies (Priority: 0.8, Daily updates)
- `/all-reviews` - All reviews (Priority: 0.7, Daily updates)
- `/creators` - All creators (Priority: 0.7, Weekly updates)
- `/search` - Search page (Priority: 0.6, Monthly updates)
- `/profiles` - User profiles (Priority: 0.6, Weekly updates)
- `/auth` - Authentication (Priority: 0.3, Monthly updates)

### Dynamic Pages
- **Movies**: `/movie/:id` - Individual movie pages (Priority: 0.8, Weekly updates)
- **Creators**: `/creator/:id` - Individual creator pages (Priority: 0.6, Weekly updates)

## 🔄 When to Run

Run the sitemap generator:
- **After adding new movies** to the database
- **After adding new creators** to the database
- **Before deploying** to production
- **Regularly** (weekly recommended) to keep search engines updated

## 📝 Configuration

### Modify Domain

To change the website domain, edit `scripts/generate-sitemap.js`:

```javascript
const BASE_URL = 'https://your-domain.com';
```

### Adjust Priorities

Modify priorities in the static pages array:

```javascript
{ path: '/', changefreq: 'daily', priority: 1.0 }
```

## 🔍 SEO Best Practices

The sitemap generator follows SEO best practices:

1. **Priority Levels**: Important pages (homepage) get higher priority (1.0)
2. **Change Frequency**: Frequently updated pages have more frequent crawls
3. **Last Modified**: Uses actual database timestamps for accurate lastmod dates
4. **Complete Coverage**: Includes all public-facing pages
5. **Standard Format**: Follows sitemap.org protocol standards

## 🚫 What's NOT Included

The following pages are intentionally excluded from the sitemap:

- Admin pages (`/admin/*`)
- Protected user pages (`/dashboard`, `/watchlist`, `/reviews`, etc.)
- Internal pages that require authentication

## 📈 Search Engine Submission

After generating your sitemap:

1. **Google Search Console**: Submit `https://muviestars.com/sitemap.xml`
2. **Bing Webmaster Tools**: Submit the sitemap URL
3. **Other Search Engines**: Most search engines auto-discover sitemaps at `/sitemap.xml`

## 🛠️ Troubleshooting

### Error: "Cannot find module"

Make sure you're in the project root directory:
```bash
cd /path/to/african-reel-reviews
```

### Error: "Permission denied for table"

Check your Supabase connection and ensure the anonymous key is correct.

### Empty sitemap

Verify that you have movies and creators in your database.

## 📞 Support

For issues or questions, check the main project README or contact the development team.
