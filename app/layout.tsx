import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { Providers } from '@/components/Providers'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import '@/app/globals.css'

const SITE_URL = 'https://muviestars.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MuvieStars: Standout African Cinema',
    template: '%s | MuvieStars',
  },
  description:
    'Find African films worth your time, say what you thought, and see what other viewers made of them. Every listed film has been checked by a person.',
  keywords: [
    'African movies', 'Nollywood', 'Ghallywood', 'African cinema',
    'African film database', 'Nigerian movies', 'Ghanaian movies',
    'African movie reviews', 'African filmmakers', 'African actors',
    'Francophone African cinema', 'East African films', 'South African movies',
  ],
  authors: [{ name: 'MuvieStars', url: SITE_URL }],
  creator: 'MuvieStars',
  publisher: 'MuvieStars',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'MuvieStars',
    title: 'MuvieStars: Standout African Cinema',
    description:
      'Find African films worth your time, say what you thought, and see what other viewers made of them.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'MuvieStars: Standout African Cinema',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@MuvieStars',
    creator: '@MuvieStars',
    title: 'MuvieStars: Standout African Cinema',
    description: 'African films worth your time. Rate what you watch and see what others thought.',
    images: ['/og-default.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: SITE_URL,
  },
  other: {
    'google-site-verification': process.env.GOOGLE_SITE_VERIFICATION || '',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0A09',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
        <link rel="preconnect" href="https://anjavnuqkkmpsnjmopou.supabase.co" />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
              }}
            />
          </>
        )}
      </head>
      <body>
        <Providers>{children}</Providers>
        <MobileBottomNav />
        {/* Spacer so content is not hidden behind the mobile bottom nav */}
        <div className="h-16 md:hidden" aria-hidden="true" />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#181818',
              border: '1px solid #252525',
              color: '#EDE4D2',
            },
          }}
        />
      </body>
    </html>
  )
}
