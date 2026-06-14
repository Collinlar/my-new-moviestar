/**
 * Search Engine Notification Service
 * 
 * Handles notification of search engines when new content is added.
 * Uses IndexNow protocol and sitemap pings for immediate indexing.
 */

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://muviestars.com';

interface NotificationResult {
  success: boolean;
  message: string;
  results?: any[];
}

/**
 * Notify search engines about new or updated movie URLs
 * 
 * @param movieIds - Array of movie IDs that were created/updated
 * @returns Promise with notification results
 */
export async function notifySearchEnginesAboutMovies(
  movieIds: string[]
): Promise<NotificationResult> {
  try {
    // Build full URLs for the movies
    const urls = movieIds.map(id => `${BASE_URL}/movie/${id}`);
    
    console.log('🔔 Notifying search engines about new movies:', urls);

    // Call our Netlify function
    const response = await fetch('/.netlify/functions/notify-search-engines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls,
        type: 'movie'
      }),
    });

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Search engine notification result:', result);

    return {
      success: true,
      message: result.message || 'Search engines notified successfully',
      results: result.results
    };

  } catch (error) {
    console.error('❌ Error notifying search engines:', error);
    // Don't throw - we don't want to break the movie creation if notification fails
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to notify search engines'
    };
  }
}

/**
 * Notify search engines about new or updated creator URLs
 * 
 * @param creatorIds - Array of creator IDs that were created/updated
 * @returns Promise with notification results
 */
export async function notifySearchEnginesAboutCreators(
  creatorIds: string[]
): Promise<NotificationResult> {
  try {
    const urls = creatorIds.map(id => `${BASE_URL}/creator/${id}`);
    
    console.log('🔔 Notifying search engines about new creators:', urls);

    const response = await fetch('/.netlify/functions/notify-search-engines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls,
        type: 'creator'
      }),
    });

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Search engine notification result:', result);

    return {
      success: true,
      message: result.message || 'Search engines notified successfully',
      results: result.results
    };

  } catch (error) {
    console.error('❌ Error notifying search engines:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to notify search engines'
    };
  }
}

/**
 * Ping sitemap to all search engines (useful for bulk updates)
 */
export async function pingSitemap(): Promise<NotificationResult> {
  try {
    console.log('🔔 Pinging sitemap to search engines');

    // Just notify about the homepage, which triggers sitemap re-crawl
    const response = await fetch('/.netlify/functions/notify-search-engines', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls: [BASE_URL],
        type: 'sitemap'
      }),
    });

    if (!response.ok) {
      throw new Error(`Sitemap ping failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Sitemap ping result:', result);

    return {
      success: true,
      message: 'Sitemap pinged successfully',
      results: result.results
    };

  } catch (error) {
    console.error('❌ Error pinging sitemap:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to ping sitemap'
    };
  }
}

