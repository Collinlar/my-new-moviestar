import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Film } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { MovieCard } from '@/components/MovieCard'
import { createClient } from '@/lib/supabase/server'
import { personSchema, breadcrumbSchema } from '@/lib/schema'
import { SITE_URL, truncate } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data: person } = await (supabase as any).from('people').select('*').eq('id', id).single()
  if (!person) return { title: 'Person Not Found' }
  return {
    title: `${person.full_name} — African Actor`,
    description: truncate(person.bio || `${person.full_name} is an African actor documented on MuvieStars.`, 160),
    alternates: { canonical: `${SITE_URL}/person/${id}` },
    openGraph: {
      title: `${person.full_name} | MuvieStars`,
      images: person.profile_image ? [{ url: person.profile_image, alt: person.full_name }] : undefined,
    },
  }
}

export const dynamic = 'force-dynamic'

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: person } = await (supabase as any).from('people').select('*').eq('id', id).single()
  if (!person) notFound()

  /* Films this person appeared in */
  const { data: movieLinks } = await supabase
    .from('movie_people')
    .select('role, character_name, movie:movies(id, title, release_year, genre, poster_url, average_rating, review_count)')
    .eq('person_id', id)
    .order('created_at', { ascending: false })

  const schema = personSchema({
    id,
    name: person.full_name,
    bio: person.bio,
    image_url: person.profile_image,
    nationality: person.country,
    birth_year: person.birth_year,
  })
  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'People', url: `${SITE_URL}/people` },
    { name: person.full_name, url: `${SITE_URL}/person/${id}` },
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
            <Link href="/people" className="btn-ghost text-sm gap-2 inline-flex items-center mb-8">
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              All people
            </Link>

            <div className="flex flex-col sm:flex-row items-start gap-8"
                 itemScope itemType="https://schema.org/Person">
              {person.profile_image && (
                <Image
                  src={person.profile_image}
                  alt={person.full_name}
                  width={128}
                  height={128}
                  className="flex-shrink-0 w-32 h-32 rounded-full object-cover border-2 border-cinema-border"
                  itemProp="image"
                  priority
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-film-cream" itemProp="name">{person.full_name}</h1>
                {person.country && (
                  <p className="text-film-muted mt-1 text-sm">{person.country}</p>
                )}
                {person.bio && (
                  <p className="mt-4 text-film-muted leading-relaxed max-w-2xl" itemProp="description">
                    {person.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Films */}
        {movieLinks && movieLinks.length > 0 && (
          <section className="section-container py-12" aria-labelledby="films-heading">
            <h2 id="films-heading" className="text-xl font-bold text-film-cream mb-6 flex items-center gap-2">
              <Film className="w-5 h-5 text-film-gold" aria-hidden="true" />
              Films
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {movieLinks.map((link: any) => link.movie && (
                <MovieCard
                  key={link.movie.id}
                  id={link.movie.id}
                  title={link.movie.title}
                  release_year={link.movie.release_year}
                  genre={link.movie.genre}
                  poster_url={link.movie.poster_url}
                  average_rating={link.movie.average_rating}
                  review_count={link.movie.review_count}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  )
}
