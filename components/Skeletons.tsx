import { Navigation } from '@/components/Navigation'

/**
 * The shapes pages are made of, drawn quietly while the real page is on its way. They keep the page header in place and
 * hold the space the content will fill, so the page arrives without anything jumping. No spinner, no "loading" word:
 * the shimmer says it, and a screen reader is told the page is being got ready.
 */

const GUTTER = 'max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20'

export function Bar({ w = '100%', h = 16, r = 10, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <div className="ms-skeleton" style={{ width: typeof w === 'number' ? `${w}px` : w, maxWidth: '100%', height: `${h}px`, borderRadius: `${r}px`, ...style }} />
}

export function PageShell({ children, withNav = true, bg = '#0B0A09' }: { children: React.ReactNode; withNav?: boolean; bg?: string }) {
  return (
    <>
      {withNav && <Navigation />}
      <main role="status" aria-busy="true" aria-live="polite" style={{ background: bg, color: '#EDE4D2', minHeight: '100vh' }}>
        <span className="sr-only">Getting the page ready</span>
        {children}
      </main>
    </>
  )
}

export function PosterRow({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '18px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gap: '10px' }}>
          <div className="ms-skeleton" style={{ aspectRatio: '2 / 3', borderRadius: '12px' }} />
          <Bar w="80%" h={14} />
          <Bar w="40%" h={12} />
        </div>
      ))}
    </div>
  )
}

export function ShelfSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section className={GUTTER} style={{ paddingTop: '64px' }}>
      <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
        <Bar w={110} h={12} />
        <Bar w={260} h={30} />
      </div>
      <PosterRow count={count} />
    </section>
  )
}

/** Any page with no tailored skeleton of its own: a heading block and two shelves. */
export function GenericSkeleton() {
  return (
    <PageShell>
      <section className={GUTTER} style={{ paddingTop: '140px' }}>
        <div style={{ display: 'grid', gap: '16px', maxWidth: '720px' }}>
          <Bar w={120} h={12} />
          <Bar w="90%" h={54} r={12} />
          <Bar w="62%" h={54} r={12} />
          <Bar w="80%" h={18} style={{ marginTop: '10px' }} />
          <Bar w="55%" h={18} />
        </div>
      </section>
      <ShelfSkeleton />
      <ShelfSkeleton count={5} />
    </PageShell>
  )
}

/** The Club page: the teal hero with its title, a few chips and the poster side. */
export function ClubSkeleton() {
  return (
    <PageShell bg="#12242B">
      <div className="grid grid-cols-1 lg:grid-cols-12" style={{ minHeight: '680px', paddingTop: '76px' }}>
        <div className="lg:col-span-6 px-5 sm:px-10 lg:pl-20 lg:pr-6" style={{ display: 'grid', gap: '20px', alignContent: 'center', paddingTop: '56px', paddingBottom: '56px', order: 2 }}>
          <Bar w={190} h={30} r={999} />
          <Bar w={110} h={12} />
          <Bar w="70%" h={84} r={14} />
          <Bar w="55%" h={26} />
          <div style={{ display: 'flex', gap: '8px' }}>{[70, 90, 70, 130].map((w, i) => <Bar key={i} w={w} h={28} r={999} />)}</div>
          <Bar w="92%" h={16} /><Bar w="86%" h={16} /><Bar w="60%" h={16} />
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}><Bar w={160} h={54} r={16} /><Bar w={150} h={54} r={16} /></div>
        </div>
        <div className="lg:col-span-6 px-5 lg:px-0" style={{ order: 1, paddingTop: '20px' }}>
          <div className="ms-skeleton" style={{ height: '100%', minHeight: '260px', borderRadius: '20px' }} />
        </div>
      </div>
    </PageShell>
  )
}

/** A film page: poster beside the title, facts, and a block of text. */
export function FilmSkeleton() {
  return (
    <PageShell>
      <section className={GUTTER} style={{ paddingTop: '120px', paddingBottom: '64px' }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4"><div className="ms-skeleton" style={{ aspectRatio: '2 / 3', borderRadius: '16px' }} /></div>
          <div className="md:col-span-8" style={{ display: 'grid', gap: '16px', alignContent: 'start' }}>
            <Bar w={130} h={12} />
            <Bar w="75%" h={64} r={12} />
            <div style={{ display: 'flex', gap: '8px' }}>{[60, 90, 80, 140].map((w, i) => <Bar key={i} w={w} h={28} r={999} />)}</div>
            <Bar w="95%" h={16} /><Bar w="90%" h={16} /><Bar w="70%" h={16} />
            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}><Bar w={170} h={54} r={16} /><Bar w={140} h={54} r={16} /></div>
          </div>
        </div>
      </section>
      <ShelfSkeleton count={5} />
    </PageShell>
  )
}

/** Browse and search: a heading, a row of filters, and a grid of posters. */
export function GridSkeleton() {
  return (
    <PageShell>
      <section className={GUTTER} style={{ paddingTop: '130px', paddingBottom: '80px' }}>
        <div style={{ display: 'grid', gap: '14px', marginBottom: '28px' }}>
          <Bar w={120} h={12} /><Bar w={360} h={48} r={12} />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{[80, 100, 90, 110, 70].map((w, i) => <Bar key={i} w={w} h={36} r={999} />)}</div>
        </div>
        <PosterRow count={12} />
      </section>
    </PageShell>
  )
}

/** The admin area has its own frame, so its skeleton is a table, with no public navigation. */
export function AdminSkeleton() {
  return (
    <PageShell withNav={false} bg="transparent">
      <div style={{ padding: '32px', display: 'grid', gap: '14px' }}>
        <Bar w={90} h={12} /><Bar w={260} h={32} r={10} />
        <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
          {Array.from({ length: 8 }).map((_, i) => <Bar key={i} h={52} r={12} />)}
        </div>
      </div>
    </PageShell>
  )
}
