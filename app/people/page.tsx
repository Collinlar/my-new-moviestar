import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Users } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'African Film Actors and People',
  description:
    'Discover the actors, actresses, writers, and crew who bring African cinema to life. Browse biographies and filmographies of African screen talent.',
  keywords: [
    'African actors', 'Nollywood actors', 'Ghanaian actors', 'African actresses',
    'African cinema talent', 'African film stars', 'South African actors',
  ],
  alternates: { canonical: `${SITE_URL}/people` },
}

export const revalidate = 3600

export default async function PeoplePage() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: people } = await (supabase as any)
    .from('people')
    .select('id, full_name, profile_image, country, verified')
    .order('full_name', { ascending: true })
    .limit(60)

  const crumbs = breadcrumbSchema([
    { name: 'Home',   url: SITE_URL },
    { name: 'People', url: `${SITE_URL}/people` },
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
            <h1 className="text-3xl font-bold text-film-cream flex items-center gap-3">
              <Users className="w-7 h-7 text-film-gold" aria-hidden="true" />
              African screen talent
            </h1>
            <p className="mt-2 text-film-muted max-w-lg">
              Actors, actresses, and crew bringing African stories to the screen.
            </p>
          </div>
        </section>

        <div className="section-container py-12">
          {people && (people as any[]).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
              {(people as any[]).map((person: any) => (
                <Link
                  key={person.id}
                  href={`/person/${person.id}`}
                  className="cinema-card group text-center p-4"
                  itemScope
                  itemType="https://schema.org/Person"
                >
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-cinema-surface border border-cinema-border mb-3 group-hover:border-film-gold/40 transition-colors">
                    {person.profile_image ? (
                      <Image
                        src={person.profile_image}
                        alt={person.full_name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        itemProp="image"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-film-muted">
                        {person.full_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h2 className="text-xs font-semibold text-film-cream group-hover:text-film-gold transition-colors line-clamp-2" itemProp="name">
                    {person.full_name}
                  </h2>
                  {person.country && (
                    <p className="text-[10px] text-film-muted mt-0.5">{person.country}</p>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-film-muted">Actor profiles are being added to the archive.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}
