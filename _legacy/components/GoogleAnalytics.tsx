import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Google Analytics Component
 * Tracks page views on route changes for SPA navigation
 */
export const GoogleAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Track pageview on route change
    if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
      window.gtag('config', 'G-HR2CC6S8NP', {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return null;
};
