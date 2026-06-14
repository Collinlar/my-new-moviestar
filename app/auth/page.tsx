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
      <main className="pt-16 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <Suspense fallback={null}>
            <AuthForm />
          </Suspense>
        </div>
      </main>
    </>
  )
}
