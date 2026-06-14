import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Film, ArrowLeft } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { getCreatorById, getCreatorMovies, getAllCreatorIds } from '@/lib/queries'
import { hasSupabaseConfig } from '@/lib/supabase/env'
import { personSchema, breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  if (!hasSupabaseConfig()) return []

  try {
    const ids = await getAllCreatorIds()
    return ids.map((id) => ({ id }))
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const creator = await getCreatorById(id)
  if (!creator) return { title: 'Filmmaker Not Found' }
  return {
    title: `${creator.name} — African Filmmaker`,
    description: truncate(
      creator.bio || `${creator.name} is an African filmmaker with films documented on MuvieStars.`,
      160
    ),
    alternates: { canonical: `${SITE_URL}/creator/${id}` },
    openGraph: {
      title: `${creator.name} | MuvieStars`,
      images: creator.image_url ? [{ url: creator.image_url, alt: creator.name }] : undefined,
    },
  }
}

export const revalidate = 86400

export default async function CreatorPage({ params }: PageProps) {
  const { id } = await params
  const [creator, movies] = await Promise.all([
    getCreatorById(id),
    getCreatorMovies(id),
  ])

  if (!creator) notFound()

  const schema = personSchema({ ...creator, id })
  const crumbs = breadcrumbSchema([
    { name: 'Home',       url: SITE_URL },
    { name: 'Filmmakers', url: `${SITE_URL}/creators` },
    { name: creator.name, url: `${SITE_URL}/creator/${id}` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': [schema, crumbs] }) }}
      />

      <Navigation />

      <main className="pt-16">
        <section className="py-16 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li><Link href="/creators" className="hover:text-film-cream transition-colors">Filmmakers</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">{creator.name}</li>
              </ol>
            </nav>

            <Link href="/creators" className="btn-ghost text-sm gap-2 inline-flex items-center mb-8">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              All filmmakers
            </Link>

            <div className="flex flex-col sm:flex-row items-start gap-8"
                 itemScope itemType="https://schema.org/Person">
              {creator.image_url && (
                <div className="flex-shrink-0">
                  <Image
                    src={creator.image_url}
                    alt={`${creator.name} — African filmmaker`}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full object-cover border-2 border-cinema-border"
                    itemProp="image"
                    priority
                  />
                </div>
              )}

              <div>
                <h1 className="text-3xl font-bold text-film-cream" itemProp="name">
                  {creator.name}
                </h1>
                <p className="text-film-muted mt-1 text-sm">
                  {movies.length} {movies.length === 1 ? 'film' : 'films'} in the archive
                </p>
                {creator.bio && (
                  <p className="mt-4 text-film-muted leading-relaxed max-w-2xl" itemProp="description">
                    {creator.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Filmography */}
        <section className="section-container py-12" aria-labelledby="filmography-heading">
          <h2 id="filmography-heading" className="text-xl font-bold text-film-cream mb-6 flex items-center gap-2">
            <Film className="w-5 h-5 text-film-gold" aria-hidden="true" />
            Filmography
          </h2>

          {movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  id={movie.id}
                  title={movie.title}
                  release_year={movie.release_year}
                  genre={movie.genre}
                  language={movie.language}
                  poster_url={movie.poster_url}
                  average_rating={movie.average_rating}
                  review_count={movie.review_count}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-film-muted">No films found for this filmmaker.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  )
}
