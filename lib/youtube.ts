// What a YouTube link tells us about watching a film. Pure rules, no network, so they can be tested alone.
// The server code that asks YouTube lives in lib/youtube-server.ts.

export type WatchState = 'ok' | 'ghana_blocked' | 'gone' | 'not_a_video' | 'unchecked'

/** One row of movie_watch_checks, as the database holds it. */
export interface WatchCheck {
  movie_id: string
  video_id: string | null
  state: WatchState
  source: 'api' | 'oembed'
  channel_title: string | null
  channel_id: string | null
  duration_seconds: number | null
  published_at: string | null
  captions: boolean | null
  definition: 'hd' | 'sd' | null
  region_mode: 'allowed' | 'blocked' | null
  region_codes: string[] | null
  note: string | null
  checked_at: string
}

/** What a check says about a video, before it is tied to a film. */
export type VideoFacts = Omit<WatchCheck, 'movie_id' | 'checked_at'>

const ID = /^[A-Za-z0-9_-]{11}$/

/** The 11 character video id in a YouTube link, or null for a channel, playlist or anything that is not one video. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  let u: URL
  try { u = new URL(url.trim()) } catch { return null }
  const host = u.hostname.replace(/^www\.|^m\./, '')
  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.split('/')[1] ?? null
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else {
      const m = /^\/(embed|shorts|live|v)\/([^/?#]+)/.exec(u.pathname)
      if (m) id = m[2]
    }
  }
  return id && ID.test(id) ? id : null
}

/** "PT1H48M12S" to seconds. Null for anything that is not a duration, and for live streams ("P0D"). */
export function parseDuration(iso: string | null | undefined): number | null {
  if (!iso) return null
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso)
  if (!m) return null
  const [d, h, mi, s] = [m[1], m[2], m[3], m[4]].map((x) => Number(x ?? 0))
  const total = d * 86400 + h * 3600 + mi * 60 + s
  return total > 0 ? total : null
}

export function formatDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null
  const mins = Math.max(1, Math.round(seconds / 60))
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Below this a YouTube link is more likely a trailer or a clip than the film. */
export const SHORT_MINUTES = 25
export const isShort = (seconds: number | null | undefined): boolean => !!seconds && seconds < SHORT_MINUTES * 60

const GHANA = 'GH'

/** Does YouTube's region rule keep the video away from Ghana? Allowed lists name who may watch, blocked lists who may not. */
export function blockedInGhana(mode: 'allowed' | 'blocked' | null, codes: string[] | null): boolean {
  if (!mode) return false
  const list = (codes ?? []).map((c) => c.toUpperCase())
  return mode === 'allowed' ? !list.includes(GHANA) : list.includes(GHANA)
}

/** The fields of a videos.list item we read. */
export interface ApiVideo {
  id?: string
  snippet?: { channelId?: string; channelTitle?: string; publishedAt?: string }
  contentDetails?: {
    duration?: string
    definition?: string
    caption?: string
    regionRestriction?: { allowed?: string[]; blocked?: string[] }
  }
  status?: { privacyStatus?: string; uploadStatus?: string; embeddable?: boolean }
}

/** A video that came back from the Data API. A video that did not come back at all is gone: see goneFacts. */
export function factsFromApi(videoId: string, item: ApiVideo): VideoFacts {
  const status = item.status ?? {}
  const base: VideoFacts = {
    video_id: videoId, state: 'ok', source: 'api',
    channel_title: item.snippet?.channelTitle ?? null,
    channel_id: item.snippet?.channelId ?? null,
    duration_seconds: parseDuration(item.contentDetails?.duration),
    published_at: item.snippet?.publishedAt ?? null,
    captions: item.contentDetails?.caption === 'true' ? true : item.contentDetails?.caption === 'false' ? false : null,
    definition: item.contentDetails?.definition === 'hd' ? 'hd' : item.contentDetails?.definition === 'sd' ? 'sd' : null,
    region_mode: null, region_codes: null, note: null,
  }
  if (status.privacyStatus === 'private' || ['deleted', 'rejected', 'failed'].includes(status.uploadStatus ?? '')) {
    return { ...base, state: 'gone', note: status.privacyStatus === 'private' ? 'The video is private.' : 'The video was removed.' }
  }
  const rr = item.contentDetails?.regionRestriction
  if (rr?.allowed) { base.region_mode = 'allowed'; base.region_codes = rr.allowed }
  else if (rr?.blocked) { base.region_mode = 'blocked'; base.region_codes = rr.blocked }
  if (blockedInGhana(base.region_mode, base.region_codes)) {
    return { ...base, state: 'ghana_blocked', note: 'The owner has blocked this video in Ghana.' }
  }
  return base
}

export const goneFacts = (videoId: string, source: 'api' | 'oembed', note = 'YouTube has no public video at this link.'): VideoFacts => ({
  video_id: videoId, state: 'gone', source, channel_title: null, channel_id: null, duration_seconds: null, published_at: null,
  captions: null, definition: null, region_mode: null, region_codes: null, note,
})

export const notAVideoFacts = (): VideoFacts => ({
  video_id: null, state: 'not_a_video', source: 'oembed', channel_title: null, channel_id: null, duration_seconds: null,
  published_at: null, captions: null, definition: null, region_mode: null, region_codes: null,
  note: 'This is a channel or playlist link, not one video.',
})

/**
 * The no-key fallback. oEmbed says whether the video exists and who owns it, and nothing about length, subtitles or
 * regions. 404 means gone. 401 means the owner switched embedding off: the video is still there. Anything else
 * (a timeout, a 500) says nothing about the video, so the answer is null and the old check stays.
 */
export function factsFromOEmbed(videoId: string, status: number, body: { author_name?: string; author_url?: string } | null): VideoFacts | null {
  if (status === 404 || status === 403) return goneFacts(videoId, 'oembed')
  if (status !== 200 && status !== 401) return null
  const channelId = /\/channel\/([^/?#]+)/.exec(body?.author_url ?? '')?.[1] ?? null
  return {
    video_id: videoId, state: 'ok', source: 'oembed',
    channel_title: body?.author_name ?? null, channel_id: channelId, duration_seconds: null, published_at: null,
    captions: null, definition: null, region_mode: null, region_codes: null,
    note: status === 401 ? 'Embedding is off for this video. It still plays on YouTube.' : null,
  }
}
