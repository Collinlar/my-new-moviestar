import type { Metadata } from 'next'
import Link from 'next/link'
import { Clapperboard, MapPin, Calendar } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'
import { breadcrumbSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'African Film Festivals — AMAA, FESPACO, AFRIFF and More',
  description:
    'Explore the major African film festivals: AMAA, FESPACO, AFRIFF, DIFF, ZIFF, and more. Discover award-winning African films and the festivals that celebrate them.',
  alternates: { canonical: `${SITE_URL}/festivals` },
}

export const revalidate = 86400

export default async function FestivalsPage() {
  const supabase = await createClient() as any

  const { data: festivals } = await supabase
    .from('festivals')
    .select('id, name, short_name, slug, country, city, description, founded, frequency')
    .order('founded', { ascending: true })

  const list = (festivals as any[]) || []

  const crumbs = breadcrumbSchema([
    { name: 'Home',      url: SITE_URL },
    { name: 'Festivals', url: `${SITE_URL}/festivals` },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }}
      />

      <Navigation />

      <main className="pt-16">

        {/* ─── HEADER ─────────────────────────────────────────────── */}
        <section className="py-16 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container max-w-3xl">
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-xs text-film-muted">
                <li><Link href="/" className="hover:text-film-cream transition-colors">Home</Link></li>
                <li aria-hidden="true">/</li>
                <li className="text-film-cream" aria-current="page">Festivals</li>
              </ol>
            </nav>

            <div className="flex items-start gap-4">
              <Clapperboard className="w-10 h-10 text-film-gold flex-shrink-0 mt-1" aria-hidden="true" />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-film-cream">
                  African Film Festivals
                </h1>
                <p className="mt-3 text-film-muted leading-relaxed text-lg">
                  The festivals that celebrate, honour, and shape African cinema. From Ouagadougou to Lagos
                  to Cairo — where the continent's films are seen and remembered.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FESTIVAL LIST ───────────────────────────────────────── */}
        <div className="section-container max-w-4xl py-14">
          {list.length === 0 ? (
            <div className="text-center py-20">
              <Clapperboard className="w-10 h-10 text-film-subtle mx-auto mb-4" aria-hidden="true" />
              <p className="text-film-muted">Festival data is being added.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {list.map((fest: any) => (
                <Link
                  key={fest.id}
                  href={`/festival/${fest.slug}`}
                  className="group block bg-cinema-dark border border-cinema-border rounded-xl p-6 hover:border-film-gold/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-xs font-bold text-film-gold tracking-widest uppercase">
                          {fest.short_name}
                        </span>
                        <span className="text-xs text-film-subtle">{fest.frequency}</span>
                      </div>
                      <h2 className="text-lg font-bold text-film-cream mt-1 group-hover:text-film-gold transition-colors leading-tight">
                        {fest.name}
                      </h2>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-xs text-film-subtle">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {fest.city ? `${fest.city}, ` : ''}{fest.country}
                        </span>
                        {fest.founded && (
                          <span className="flex items-center gap-1.5 text-xs text-film-subtle">
                            <Calendar className="w-3 h-3" aria-hidden="true" />
                            Est. {fest.founded}
                          </span>
                        )}
                      </div>
                      {fest.description && (
                        <p className="text-sm text-film-muted mt-3 leading-relaxed line-clamp-2">
                          {fest.description}
                        </p>
                      )}
                    </div>
                    <span className="text-film-subtle group-hover:text-film-gold transition-colors text-lg flex-shrink-0 mt-1">
                      →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </main>

      <Footer />
    </>
  )
}
