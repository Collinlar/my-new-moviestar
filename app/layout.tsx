import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import { Providers } from '@/components/Providers'
import '@/app/globals.css'

const SITE_URL = 'https://muviestars.com'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'MuvieStars — The African Movie Database',
    template: '%s | MuvieStars',
  },
  description:
    'The most complete database of African cinema. Thousands of films from Nollywood, Ghallywood, Francophone Africa, East Africa, and the diaspora — reviewed, rated, and documented.',
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
    title: 'MuvieStars — The African Movie Database',
    description:
      'The most complete database of African cinema. Thousands of films from Nollywood, Ghallywood, and across the continent — reviewed, rated, and documented.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'MuvieStars — The African Movie Database',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@MuvieStars',
    creator: '@MuvieStars',
    title: 'MuvieStars — The African Movie Database',
    description: 'Africa\'s most complete movie database. Discover, rate, and review African cinema.',
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
  themeColor: '#090909',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
