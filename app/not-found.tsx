import Link from 'next/link'
import { Film } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

export default function NotFound() {
  return (
    <>
      <Navigation />
      <main className="pt-16 min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4 py-20">
            <Film className="w-12 h-12 text-film-subtle mx-auto mb-6" aria-hidden="true" />
            <h1 className="text-4xl font-bold text-film-cream mb-3">Page not found</h1>
            <p className="text-film-muted mb-8 max-w-md mx-auto">
              This page does not exist in our archive. The film, filmmaker, or section
              you are looking for may have moved.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/" className="btn-gold">Back to home</Link>
              <Link href="/browse" className="btn-outline">Browse the archive</Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </>
  )
}
