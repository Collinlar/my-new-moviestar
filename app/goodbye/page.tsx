import type { Metadata } from 'next'
import { NavLink } from '@/components/NavLink'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }

export const metadata: Metadata = {
  title: 'Your account is deleted',
  robots: { index: false },
}

export default function GoodbyePage() {
  return (
    <>
      <Navigation />
      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '140px', paddingBottom: '96px' }}>
          <div style={{ maxWidth: '620px', display: 'grid', gap: '18px' }}>
            <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(40px,6vw,72px)', lineHeight: 0.98, color: '#F6EFE2', margin: 0 }}>
              Your account is gone.
            </h1>
            <p style={{ margin: 0, fontSize: '19px', lineHeight: 1.6, color: '#C7BFB2' }}>
              Your profile, takes, lists and votes have been removed, and you are signed out. Films stay on MuvieStars for the next person to find.
            </p>
            <p style={{ margin: 0, fontSize: '17px', lineHeight: 1.6, color: '#A39B8F' }}>
              You are welcome back any time. A new account starts fresh.
            </p>
            <p style={{ margin: 0 }}>
              <NavLink href="/" style={{ color: '#C8963E', fontSize: '17px', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>Back to the films</NavLink>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
