import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Users } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { getTopCreators } from '@/lib/queries'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'African Filmmakers — Directors, Producers, and Creators',
  description:
    'Discover the directors, producers, writers, and creators behind African cinema. Explore filmographies, biographies, and films from Africa\'s most influential filmmakers.',
  keywords: [
    'African filmmakers', 'African directors', 'Nollywood directors',
    'Ghanaian filmmakers', 'African cinema creators', 'African film directors',
    'African producers', 'Black African filmmakers',
  ],
  alternates: { canonical: `${SITE_URL}/creators` },
}

export const revalidate = 3600

export default async function CreatorsPage() {
  const creators = await getTopCreators(50)

  const crumbs = breadcrumbSchema([
    { name: 'Home',       url: SITE_URL },
    { name: 'Filmmakers', url: `${SITE_URL}/creators` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Navigation />

      <main className="pt-16">
        <section className="py-14 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">Filmmakers</li>
              </ol>
            </nav>

            <h1 className="text-3xl font-bold text-film-cream flex items-center gap-3">
              <Users className="w-7 h-7 text-film-gold" aria-hidden="true" />
              African filmmakers
            </h1>
            <p className="mt-2 text-film-muted max-w-lg">
              The directors, producers, and storytellers shaping African cinema.
            </p>
          </div>
        </section>

        <div className="section-container py-12">
          {creators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {creators.map((creator) => (
                <Link
                  key={creator.id}
                  href={`/creator/${creator.id}`}
                  className="cinema-card group text-center p-5"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <div className="w-24 h-24 mx-auto rounded-full overflow-hidden bg-cinema-surface border-2 border-cinema-border group-hover:border-film-gold/40 transition-colors mb-4">
                    {creator.image_url ? (
                      <Image
                        src={creator.image_url}
                        alt={`${creator.name} — African filmmaker`}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        itemProp="image"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-film-muted">
                        {creator.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <h2
                    className="text-sm font-semibold text-film-cream group-hover:text-film-gold transition-colors line-clamp-2"
                    itemProp="name"
                  >
                    {creator.name}
                  </h2>
                  {creator.movie_count != null && (
                    <p className="text-xs text-film-muted mt-1">
                      {creator.movie_count} {creator.movie_count === 1 ? 'film' : 'films'}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Users className="w-10 h-10 text-film-subtle mx-auto mb-4" aria-hidden="true" />
              <h2 className="text-xl font-semibold text-film-cream mb-2">No filmmakers yet</h2>
              <p className="text-film-muted">Filmmaker profiles are being added to the archive.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
