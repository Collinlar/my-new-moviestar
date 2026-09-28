import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { AuthForm } from '@/components/AuthForm'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Sign in or Create Account',
  description: 'Sign in to MuvieStars to write reviews, build your watchlist, and join Africa\'s growing cinema community.',
  robots: { index: false },
  alternates: { canonical: `${SITE_URL}/auth` },
}

export default function AuthPage() {
  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', minHeight: '100vh', paddingTop: '76px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '76px 20px 60px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <Suspense fallback={null}>
            <AuthForm />
          </Suspense>
        </div>
      </main>
    </>
  )
}
