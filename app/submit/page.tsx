import type { Metadata } from 'next'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SubmitFilmForm } from '@/components/SubmitFilmForm'
import { NominateForm } from '@/components/NominateForm'
import { createClient } from '@/lib/supabase/server'
import { SUBMISSION_STATUS_LABELS } from '@/lib/submissions'
import { REJECTION_LABELS } from '@/lib/listing'
import { SITE_URL } from '@/lib/utils'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'Put a Film Forward: Submit or Nominate an African Film',
  description: 'Own the rights to an African film? Send it for consideration. Know a film that belongs on MuvieStars? Nominate it. Editors check every film before it is listed.',
  alternates: { canonical: `${SITE_URL}/submit` },
}

export const dynamic = 'force-dynamic'

const STATUS_COLOUR: Record<string, string> = {
  received: '#8FA8C8', needs_information: '#E8A020', accepted: '#7FA88B', declined: '#8C857A',
}

export default async function SubmitPage() {
  const supabase = (await createClient()) as any
  const { data: { user } } = await supabase.auth.getUser()

  const { data: mine } = user
    ? await supabase
        .from('movie_listing_submissions')
        .select('id, title, release_year, status, public_note, decline_reason, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const signInHref = '/auth?next=/submit'

  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>

          <header style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '56px' }}>
            <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>Put a film forward</p>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(44px,7vw,88px)', lineHeight: 0.95, color: '#F6EFE2', margin: 0 }}>
              Every listed film was checked by a person.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>
              Own the rights to a film? Send it. Know a film that should be here? Nominate it. Neither one lists a film by itself. An editor checks the title, the year, the country, the story and proof it has been shown, and a film is never turned away for being low budget, independent, short or in a local language.{' '}
              <Link href="/how-listing-works" style={{ color: '#C8963E' }}>How listing works</Link>
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] gap-14 lg:gap-20">
            <section aria-labelledby="send-heading">
              <h2 id="send-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 8px' }}>
                Send your own film.
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.6, color: '#A39B8F' }}>
                For filmmakers, producers, distributors and studios. You can have 5 films waiting at a time.
              </p>
              {user ? (
                <SubmitFilmForm defaultEmail={user.email ?? ''} />
              ) : (
                <Link
                  href={signInHref}
                  style={{ minHeight: '56px', padding: '0 28px', borderRadius: '16px', background: '#C8963E', color: '#0B0A09', fontSize: '17px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  Sign in to send my film
                </Link>
              )}
            </section>

            <section aria-labelledby="nominate-heading">
              <h2 id="nominate-heading" style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(30px,4vw,44px)', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 8px' }}>
                Nominate a film you love.
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: '15px', lineHeight: 1.6, color: '#A39B8F' }}>
                When 5 different people nominate the same film, an editor looks at it. To nominate a film that is already in our catalogue, open its page and use the button there.
              </p>
              {user ? (
                <NominateForm />
              ) : (
                <Link href={signInHref} style={{ minHeight: '48px', display: 'inline-flex', alignItems: 'center', color: '#C8963E', fontSize: '16px' }}>
                  Sign in to nominate a film
                </Link>
              )}
            </section>
          </div>

          {(mine ?? []).length > 0 && (
            <section aria-labelledby="mine-heading" style={{ paddingTop: '72px', maxWidth: '760px' }}>
              <h2 id="mine-heading" style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8C857A', margin: '0 0 8px' }}>Your submissions</h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {(mine as any[]).map((s) => (
                  <li key={s.id} style={{ padding: '16px 0', borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ ...SERIF, fontSize: '26px', color: '#F6EFE2' }}>{s.title} <span style={{ color: '#6E675E', fontSize: '18px' }}>{s.release_year}</span></span>
                      <span style={{ ...MONO, fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: STATUS_COLOUR[s.status] ?? '#8C857A' }}>
                        {SUBMISSION_STATUS_LABELS[s.status] ?? s.status}
                      </span>
                    </div>
                    {s.public_note && <p style={{ margin: '8px 0 0', fontSize: '15px', lineHeight: 1.55, color: '#C7BFB2' }}>{s.public_note}</p>}
                    {s.status === 'declined' && s.decline_reason && (
                      <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#8C857A' }}>{REJECTION_LABELS[s.decline_reason] ?? s.decline_reason}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
