import type { Movie } from '@/lib/queries'

export interface WatchLink {
  label: string
  url: string
  free: boolean
}

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u)

/**
 * Every place a film can be watched, best first: listed streaming platforms, then YouTube.
 * Links that are not real web addresses (some imported records hold junk) are dropped.
 */
export function watchLinks(m: Pick<Movie, 'streaming_links' | 'youtube_url'>): WatchLink[] {
  const out: WatchLink[] = []
  for (const l of m.streaming_links ?? []) {
    if (isHttp(l.url) && l.platform) out.push({ label: l.platform, url: l.url, free: !!l.free })
  }
  if (isHttp(m.youtube_url) && !out.some((o) => o.url === m.youtube_url)) {
    out.push({ label: 'YouTube', url: m.youtube_url, free: true })
  }
  return out
}
