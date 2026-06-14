/// <reference types="vite/client" />

// Google Analytics gtag declarations
interface Window {
  dataLayer: any[];
  gtag: (
    command: string,
    targetId: string | Date | Record<string, any>,
    config?: Record<string, any>
  ) => void;
}