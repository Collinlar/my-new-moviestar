import type { Movie, StreamingLink } from '@/lib/queries'
import { brandFor, type Brand } from '@/lib/watch-brand'
import { formatDuration, isShort, youtubeId, type WatchCheck } from '@/lib/youtube'

export type Access = NonNullable<StreamingLink['access']>
export type Region = NonNullable<StreamingLink['regions']>

export const ACCESS_OPTIONS: Array<{ value: Access; label: string }> = [
  { value: 'free', label: 'Free' },
  { value: 'ads', label: 'Free with ads' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'rent', label: 'Rent' },
  { value: 'buy', label: 'Buy' },
]
export const REGION_OPTIONS: Array<{ value: Region; label: string }> = [
  { value: 'ghana', label: 'Works in Ghana' },
  { value: 'africa', label: 'Works across Africa' },
  { value: 'world', label: 'Works worldwide' },
]
const ACCESS_LABEL = Object.fromEntries(ACCESS_OPTIONS.map((o) => [o.value, o.label])) as Record<Access, string>
const REGION_LABEL = Object.fromEntries(REGION_OPTIONS.map((o) => [o.value, o.label])) as Record<Region, string>

/** ok: as far as we know it plays. blocked: the owner blocked it in Ghana. unverified: nobody has checked this link. */
export type WatchState = 'ok' | 'blocked' | 'unverified'

export interface WatchOption {
  label: string
  url: string
  /** Costs nothing to watch (free, or free with ads). */
  free: boolean
  state: WatchState
  /** "Free", "Rent, GHS 15", or "Price not listed". */
  access: string
  /** "From Iroko TV", "1h 48m", "Captions". Short facts, in the order a viewer weighs them. */
  facts: string[]
  note: string | null
  warning: string | null
  checkedAt: string | null
  brand: Brand
}

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u)

const ghs = (n: number) => `GHS ${Number.isInteger(n) ? n : n.toFixed(2)}`

export function accessText(link: Pick<StreamingLink, 'access' | 'price_ghs' | 'free'>): string {
  const access = link.access ?? (link.free ? 'free' : null)
  if (!access) return 'Price not listed'
  const price = typeof link.price_ghs === 'number' && link.price_ghs > 0 ? link.price_ghs : null
  if (access === 'free' || access === 'ads') return ACCESS_LABEL[access]
  if (access === 'subscription') return price ? `Subscription, ${ghs(price)} a month` : 'Subscription'
  return price ? `${ACCESS_LABEL[access]}, ${ghs(price)}` : ACCESS_LABEL[access]
}

const isFree = (link: Pick<StreamingLink, 'access' | 'free'>) => link.access ? link.access === 'free' || link.access === 'ads' : !!link.free

/** What YouTube told us about a video, as short facts and at most one warning. */
function youtubeFacts(check: WatchCheck | null): { facts: string[]; warning: string | null; state: WatchState } {
  if (!check || check.state === 'unchecked' || check.state === 'not_a_video') return { facts: [], warning: null, state: 'unverified' }
  const facts: string[] = []
  if (check.channel_title) facts.push(`From ${check.channel_title}`)
  const length = formatDuration(check.duration_seconds)
  if (length) facts.push(length)
  if (check.captions) facts.push('Captions')
  if (check.definition === 'hd') facts.push('HD')
  if (check.state === 'ghana_blocked') return { facts, warning: 'Blocked in Ghana. It plays in some other countries.', state: 'blocked' }
  if (isShort(check.duration_seconds)) {
    return { facts, warning: `Only ${length}. This may be a trailer or a short, not the full film.`, state: 'ok' }
  }
  return { facts, warning: null, state: check.source === 'api' || check.channel_title ? 'ok' : 'unverified' }
}

/**
 * Every place a film can be watched, best first. Listed platforms come first, then YouTube. A link that is not a real
 * web address (some imported records hold junk) is dropped, and so is a YouTube video that has been removed. Links
 * that play for everyone come before links that are blocked in Ghana.
 */
export function watchLinks(
  m: Pick<Movie, 'streaming_links' | 'youtube_url'>,
  check: WatchCheck | null = null,
): WatchOption[] {
  const out: WatchOption[] = []
  // A check belongs to the video it was made for. If the film's link has changed since, the old answer is stale.
  const checked = check && check.state !== 'unchecked' && (check.video_id ?? null) === youtubeId(m.youtube_url) ? check : null
  const gone = checked?.state === 'gone'
  const sameVideo = (url: string) => !!checked?.video_id && youtubeId(url) === checked.video_id

  for (const l of m.streaming_links ?? []) {
    if (!isHttp(l.url) || !l.platform) continue
    const yt = sameVideo(l.url)
    if (yt && gone) continue
    const y = yt ? youtubeFacts(checked) : { facts: [] as string[], warning: null, state: 'unverified' as WatchState }
    const facts = [...y.facts]
    if (l.regions) facts.push(REGION_LABEL[l.regions])
    out.push({
      label: l.platform, url: l.url, free: isFree(l), state: yt ? y.state : 'unverified',
      access: accessText(l), facts, note: l.note?.trim() || null, warning: y.warning,
      checkedAt: yt ? checked!.checked_at : null, brand: brandFor(l.platform),
    })
  }

  if (isHttp(m.youtube_url) && !out.some((o) => o.url === m.youtube_url) && !(checked && out.some((o) => sameVideo(o.url)))) {
    if (!gone) {
      const y = youtubeFacts(checked)
      out.push({
        label: 'YouTube', url: m.youtube_url, free: true, state: y.state, access: 'Free',
        facts: y.facts, note: null, warning: y.warning, checkedAt: checked?.checked_at ?? null, brand: brandFor('YouTube'),
      })
    }
  }
  // Stable: blocked links sink, nothing else moves.
  return out.map((o, i) => ({ o, i })).sort((a, b) => Number(a.o.state === 'blocked') - Number(b.o.state === 'blocked') || a.i - b.i).map((x) => x.o)
}

/** The links worth showing on a card or in a quick strip: the ones that are not known to be blocked. */
export const playable = (options: WatchOption[]): WatchOption[] => options.filter((o) => o.state !== 'blocked')

/** The one line for a card: "Free on YouTube", "On Netflix", "Rent on Prime Video". Null when there is nothing to watch. */
export function watchHeadline(options: WatchOption[]): { text: string; label: string; color: string | null; free: boolean } | null {
  const best = playable(options).sort((a, b) => Number(b.free) - Number(a.free))[0]
  if (!best) return null
  const lead = best.free ? 'Free on' : best.access.startsWith('Rent') ? 'Rent on' : best.access.startsWith('Buy') ? 'Buy on' : 'On'
  return { text: `${lead} ${best.label}`, label: best.label, color: best.brand.color, free: best.free }
}
