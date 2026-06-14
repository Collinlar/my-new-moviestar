# Dynamic Sitemap for Muviestars.com

## 📋 Overview

The sitemap for muviestars.com is now **dynamic** and automatically updates whenever search engines crawl it. This means:

- ✅ **No manual updates needed** - New movies appear in the sitemap immediately
- ✅ **Always up-to-date** - Search engines see the latest content every time they crawl
- ✅ **Scalable** - Handles daily movie uploads automatically

## 🚀 How It Works

### Dynamic Sitemap Function

A Netlify serverless function (`netlify/functions/sitemap.js`) generates the sitemap on-demand:

1. **Search Engine Request**: When Google, Bing, or other search engines request `/sitemap.xml`
2. **Database Query**: The function queries Supabase for:
   - All movies (with daily change frequency)
   - All creators
   - Recent reviews (last 100)
3. **XML Generation**: The sitemap XML is generated dynamically
4. **Response**: Fresh sitemap is returned to the search engine

### Performance & Caching

- **Response Caching**: The sitemap response is cached for 1 hour (`Cache-Control: max-age=3600`)
- **Database Performance**: Uses efficient queries with proper ordering and limits
- **Error Handling**: Falls back to a minimal sitemap if database queries fail

## 🔄 Migration from Static Sitemap

### Old Approach (Static)
- Required running `npm run generate-sitemap` manually
- Static file in `public/sitemap.xml`
- Had to regenerate after each movie upload

### New Approach (Dynamic) ✨
- Automatically generated on each request
- Always includes the latest movies
- No manual intervention needed

## 📊 What's Included

The dynamic sitemap includes:

### Static Pages
- Homepage (`/`) - Priority 1.0, Daily updates
- Browse (`/browse`) - Priority 0.9, Weekly updates
- Movies (`/movies`) - Priority 0.9, Weekly updates
- Featured (`/featured`) - Priority 0.8, Daily updates
- Trending (`/trending`) - Priority 0.8, Daily updates
- All Reviews (`/all-reviews`) - Priority 0.7, Daily updates
- Creators (`/creators`) - Priority 0.7, Weekly updates
- Search (`/search`) - Priority 0.6, Monthly updates
- Profiles (`/profiles`) - Priority 0.6, Weekly updates
- Auth (`/auth`) - Priority 0.3, Monthly updates

### Dynamic Content
- **Movies**: `/movie/:id` - Priority 0.8, **Daily updates** (changed from weekly)
- **Creators**: `/creator/:id` - Priority 0.6, Weekly updates
- **Reviews**: `/review/:id` - Priority 0.5, Monthly updates (limited to 100 most recent)

## 🔧 Configuration

### Environment Variables (Optional)

You can set these in Netlify Dashboard > Site settings > Environment variables:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `BASE_URL` - Your website's base URL (default: https://muviestars.com)

If not set, the function uses the hardcoded defaults from the code.

### Routing

The routing is configured in `netlify.toml`:

```toml
[[redirects]]
  from = "/sitemap.xml"
  to = "/.netlify/functions/sitemap"
  status = 200
```

This routes all requests to `/sitemap.xml` to the serverless function.

## 🧪 Testing

### Local Testing

To test the function locally, use Netlify CLI:

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Run the function locally
netlify dev
```

Then visit: `http://localhost:8888/sitemap.xml`

### Production

After deployment, the sitemap is available at:
- `https://muviestars.com/sitemap.xml`

## 📈 SEO Benefits

1. **Faster Indexing**: New movies appear in sitemap immediately
2. **Better Crawl Frequency**: Search engines can discover updates daily
3. **Complete Coverage**: All movies are included, not just a subset
4. **Accurate Timestamps**: Uses actual database `updated_at` timestamps

## 🔍 Search Engine Submission

The sitemap URL is already specified in `robots.txt`:
```
Sitemap: https://muviestars.com/sitemap.xml
```

### Submit to Search Engines

1. **Google Search Console**
   - Navigate to Sitemaps section
   - Submit: `https://muviestars.com/sitemap.xml`

2. **Bing Webmaster Tools**
   - Navigate to Sitemaps section
   - Submit: `https://muviestars.com/sitemap.xml`

3. **Other Search Engines**
   - Most automatically discover sitemaps via `robots.txt`

## 🛠️ Troubleshooting

### Sitemap Not Updating

- Check Netlify function logs in the dashboard
- Verify Supabase connection is working
- Check that environment variables are set correctly

### Function Errors

- Check Netlify function logs: `Site settings > Functions > View logs`
- Ensure `@supabase/supabase-js` is in your `package.json`
- Verify RLS policies allow public read access to movies/creators

### Too Many URLs

The sitemap limits reviews to 100 most recent to avoid bloat. Movies and creators are not limited. If you have more than 50,000 URLs total, consider splitting into multiple sitemap files.

## 📝 Notes

- The static `public/sitemap.xml` file is no longer used (the function takes precedence)
- You can still run `npm run generate-sitemap` for static backups, but it's not required
- Search engines typically crawl sitemaps daily or weekly automatically
- The function response is cached for 1 hour to reduce database load

## 🔐 Security

- Uses Supabase anonymous key (read-only access)
- RLS policies on database tables control what data is accessible
- No sensitive data is exposed in the sitemap (only IDs and URLs)

