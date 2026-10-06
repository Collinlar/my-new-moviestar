import type { Metadata } from 'next'
import { NavLink } from '@/components/NavLink'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SITE_URL } from '@/lib/utils'
import { breadcrumbSchema, faqSchema } from '@/lib/schema'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

export const metadata: Metadata = {
  title: 'How Films Get Listed on MuvieStars',
  description:
    'What a MuvieStars Listed film is, what we check before listing one, what never counts against a film, and why a listing cannot be bought.',
  alternates: { canonical: `${SITE_URL}/how-listing-works` },
}

const CHECKS = [
  ['A real film with a title and a release year', 'Not a clip, a trailer, a recap or a compilation.'],
  ['African origin, with a country', 'Made in Africa or by African filmmakers, with the country of origin named.'],
  ['A synopsis', 'At least a few sentences saying what the film is about.'],
  ['A poster', 'The film’s own artwork.'],
  ['Evidence it has been released or shown', 'A video, a streaming link, a festival record or an award record.'],
  ['No rights or identity concerns', 'The film is not passed off as someone else’s work.'],
]

const NEVER = [
  'A small budget',
  'Independent or self-funded production',
  'A language other than English',
  'Low box office or limited distribution',
  'Being a short film or a documentary',
]

const FAQ = [
  {
    question: 'What does Listed on MuvieStars mean?',
    answer: 'A person at MuvieStars has checked the film against our minimum standard. Listed films appear in Swipe, in recommendations and on the homepage.',
  },
  {
    question: 'Why is a film on MuvieStars but not Listed?',
    answer: 'Every film keeps its page. Films that have not been reviewed yet stay out of Swipe, recommendations and the homepage until they are.',
  },
  {
    question: 'Can a listing be bought?',
    answer: 'No. Payment cannot get a film listed, ranked or recognised.',
  },
]

export default function HowListingWorksPage() {
  const schema = [
    breadcrumbSchema([
      { name: 'Home', url: SITE_URL },
      { name: 'How listing works', url: `${SITE_URL}/how-listing-works` },
    ]),
    faqSchema(FAQ),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': schema }) }} />
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '124px', paddingBottom: '96px' }}>
          <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '56px' }}>

            <header style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ ...MONO, fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                How listing works
              </p>
              <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.98, color: '#F6EFE2', margin: 0 }}>
                Not every film needs to be here. The ones worth your time should be.
              </h1>
              <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>
                A Listed film has been checked by a person at MuvieStars. Listed films are the ones we put in
                front of you: in Swipe, in recommendations and on the homepage. Films still waiting for that
                check keep their page, they just stay out of those places until they are reviewed.
              </p>
            </header>

            <section aria-labelledby="checks-heading">
              <h2 id="checks-heading" style={{ ...SERIF, fontWeight: 400, fontSize: '36px', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 8px' }}>
                What we check
              </h2>
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {CHECKS.map(([title, body], i) => (
                  <li key={title} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: '12px', padding: '18px 0', borderTop: '1px solid rgba(237,228,210,0.1)' }}>
                    <span style={{ ...MONO, fontSize: '13px', color: '#6E675E', paddingTop: '4px' }}>{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      <span style={{ display: 'block', fontSize: '18px', fontWeight: 500, color: '#F6EFE2' }}>{title}</span>
                      <span style={{ display: 'block', fontSize: '15px', color: '#A39B8F', lineHeight: 1.55, marginTop: '2px' }}>{body}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p style={{ margin: '16px 0 0', fontSize: '15px', color: '#8C857A', lineHeight: 1.6 }}>
                We also ask for the director and cast to be credited. It does not decide a listing, but it makes a film easier to find and trust.
              </p>
            </section>

            <section aria-labelledby="never-heading">
              <h2 id="never-heading" style={{ ...SERIF, fontWeight: 400, fontSize: '36px', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 8px' }}>
                What never counts against a film
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {NEVER.map((n) => (
                  <li key={n} style={{ padding: '14px 0', borderTop: '1px solid rgba(237,228,210,0.1)', fontSize: '17px', color: '#D8CFC0' }}>{n}</li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="bought-heading" style={{ borderLeft: '3px solid #C8963E', paddingLeft: '24px' }}>
              <h2 id="bought-heading" style={{ ...SERIF, fontWeight: 400, fontSize: '36px', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 12px' }}>
                A listing cannot be bought
              </h2>
              <p style={{ margin: 0, fontSize: '18px', lineHeight: 1.6, color: '#C7BFB2' }}>
                No payment can get a film listed, ranked or recognised on MuvieStars. That is what makes being listed worth something.
              </p>
            </section>

            <section aria-labelledby="own-heading">
              <h2 id="own-heading" style={{ ...SERIF, fontWeight: 400, fontSize: '36px', lineHeight: 1.05, color: '#F6EFE2', margin: '0 0 12px' }}>
                Made a film?
              </h2>
              <p style={{ margin: '0 0 20px', fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                If you own the rights to a film, or you are authorised by the people who do, you can put it forward. Sending a film does not list it. An editor checks it against everything above, and you can follow its status from your submissions list.
              </p>
              <p style={{ margin: '0 0 20px', fontSize: '17px', lineHeight: 1.6, color: '#C7BFB2' }}>
                Think a film we have not listed belongs here? Anyone can nominate it. When 5 different people nominate the same film, an editor takes a look.
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <NavLink button pendingLabel="Opening the film form..."
                  href="/submit"
                  style={{ height: '52px', padding: '0 24px', borderRadius: '14px', background: '#C8963E', color: '#0B0A09', fontSize: '16px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  Put a film forward
                </NavLink>
                <NavLink button pendingLabel="Searching..."
                  href="/search"
                  style={{ height: '52px', padding: '0 24px', borderRadius: '14px', border: '1px solid rgba(237,228,210,0.18)', color: '#EDE4D2', fontSize: '16px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                >
                  Find my film
                </NavLink>
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
