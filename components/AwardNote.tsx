'use client'

import Link from 'next/link'
import { cycleHref } from '@/lib/awards-shared'

export interface AwardsInfo {
  /** Set when the take has a star rating and falls inside a qualification window. */
  counts: { cycle_name: string } | null
  /** Set when the film qualifies this month but the take has no star rating yet. */
  needsRating: { cycle_name: string } | null
  shortlisted: Array<{ category_name: string; category_slug: string; cycle_name: string; cycle_slug: string; stage: string; ballot: boolean }>
}

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

const BOX: React.CSSProperties = {
  display: 'block', padding: '14px 16px', borderRadius: '14px', border: '1px solid rgba(200,150,62,0.45)',
  background: 'rgba(200,150,62,0.1)', textDecoration: 'none', minHeight: '44px',
}

/** Tells someone what their take does for the monthly honours (Awards spec section 28). Shows nothing when there is nothing to say. */
export function AwardNote({ info }: { info: AwardsInfo | null | undefined }) {
  if (!info) return null
  const lines: Array<{ key: string; label: string; text: string; href: string }> = []

  if (info.counts) lines.push({ key: 'counts', label: 'Monthly honours', text: `Your rating counts toward ${info.counts.cycle_name}'s honours.`, href: '/awards' })
  else if (info.needsRating) lines.push({ key: 'needs', label: 'Monthly honours', text: `Add a star rating and this take counts toward ${info.needsRating.cycle_name}'s honours.`, href: '/awards' })

  for (const s of info.shortlisted) {
    lines.push({
      key: `${s.cycle_slug}-${s.category_slug}`,
      label: s.stage === 'voting_open' && s.ballot ? 'Voting is open' : 'Shortlisted',
      text: s.stage === 'voting_open' && s.ballot
        ? `This film is on the ${s.category_name} shortlist. Tap to cast your vote.`
        : `This film is on the ${s.category_name} shortlist for ${s.cycle_name}.`,
      href: cycleHref(s.cycle_slug, s.category_slug),
    })
  }
  if (lines.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((l) => (
        <Link key={l.key} href={l.href} style={BOX}>
          <span style={{ ...MONO, display: 'block', fontSize: '13px', color: '#C8963E', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{l.label}</span>
          <span style={{ display: 'block', fontSize: '16px', color: '#F6EFE2', marginTop: '2px' }}>{l.text}</span>
        </Link>
      ))}
    </div>
  )
}
