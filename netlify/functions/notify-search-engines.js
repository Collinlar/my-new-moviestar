/**
 * Search Engine Notification Function
 * 
 * This Netlify function notifies search engines (Google, Bing, etc.) when new
 * content is added using IndexNow protocol and Google's indexing API.
 * 
 * Called automatically when movies are created/updated.
 */

const BASE_URL = process.env.BASE_URL || 'https://muviestars.com';

/**
 * IndexNow Protocol
 * Notifies Bing, Yandex, and other participating search engines
 */
async function notifyIndexNow(urls) {
  try {
    // IndexNow API endpoint (works for Bing, Yandex, Seznam, etc.)
    const indexNowUrl = 'https://api.indexnow.org/indexnow';
    
    const payload = {
      host: BASE_URL.replace('https://', '').replace('http://', ''),
      key: process.env.INDEXNOW_KEY || 'generated-key-placeholder',
      keyLocation: `${BASE_URL}/indexnow-key.txt`,
      urlList: urls
    };

    const response = await fetch(indexNowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok || response.status === 202) {
      console.log('✅ IndexNow notification sent successfully');
      return { success: true, service: 'IndexNow' };
    } else {
      console.error('⚠️ IndexNow notification failed:', response.status, await response.text());
      return { success: false, service: 'IndexNow', error: response.statusText };
    }
  } catch (error) {
    console.error('❌ IndexNow error:', error);
    return { success: false, service: 'IndexNow', error: error.message };
  }
}

/**
 * Ping Google to re-crawl sitemap
 */
async function notifyGoogle() {
  try {
    const sitemapUrl = `${BASE_URL}/sitemap.xml`;
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    
    const response = await fetch(pingUrl);
    
    if (response.ok) {
      console.log('✅ Google sitemap ping sent successfully');
      return { success: true, service: 'Google' };
    } else {
      console.error('⚠️ Google ping failed:', response.status);
      return { success: false, service: 'Google', error: response.statusText };
    }
  } catch (error) {
    console.error('❌ Google ping error:', error);
    return { success: false, service: 'Google', error: error.message };
  }
}

/**
 * Ping Bing to re-crawl sitemap
 */
async function notifyBing() {
  try {
    const sitemapUrl = `${BASE_URL}/sitemap.xml`;
    const pingUrl = `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    
    const response = await fetch(pingUrl);
    
    if (response.ok) {
      console.log('✅ Bing sitemap ping sent successfully');
      return { success: true, service: 'Bing' };
    } else {
      console.error('⚠️ Bing ping failed:', response.status);
      return { success: false, service: 'Bing', error: response.statusText };
    }
  } catch (error) {
    console.error('❌ Bing ping error:', error);
    return { success: false, service: 'Bing', error: error.message };
  }
}

/**
 * Netlify function handler
 */
export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { urls, type } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'URLs array is required' })
      };
    }

    console.log(`🔔 Notifying search engines about ${urls.length} URL(s)`);
    console.log('URLs:', urls);

    const results = [];

    // Notify IndexNow (covers Bing, Yandex, Seznam, etc.)
    const indexNowResult = await notifyIndexNow(urls);
    results.push(indexNowResult);

    // Ping Google sitemap
    const googleResult = await notifyGoogle();
    results.push(googleResult);

    // Ping Bing sitemap (in addition to IndexNow)
    const bingResult = await notifyBing();
    results.push(bingResult);

    const successCount = results.filter(r => r.success).length;
    console.log(`📊 Notification complete: ${successCount}/${results.length} successful`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: `Notified ${successCount}/${results.length} search engine services`,
        results,
        urls
      })
    };

  } catch (error) {
    console.error('❌ Error in notification handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

