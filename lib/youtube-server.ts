import 'server-only'
import { factsFromApi, factsFromOEmbed, goneFacts, notAVideoFacts, youtubeId, type ApiVideo, type VideoFacts } from '@/lib/youtube'

const API = process.env.YOUTUBE_API_BASE || 'https://www.googleapis.com/youtube/v3'
const OEMBED = process.env.YOUTUBE_OEMBED_BASE || 'https://www.youtube.com/oembed'
const TIMEOUT_MS = 8000
const BATCH = 50   // the most ids one videos.list call takes

export const hasYouTubeKey = (): boolean => !!process.env.YOUTUBE_API_KEY?.trim()

export interface CheckInput { movieId: string; url: string | null }
export interface CheckResult { movieId: string; facts: VideoFacts | null }   // null: could not be reached, keep the old check

const signal = () => AbortSignal.timeout(TIMEOUT_MS)

/** Up to 50 videos in one call. A video the API does not return is gone. Null for the whole batch when YouTube cannot be reached. */
async function apiBatch(ids: string[], key: string): Promise<Map<string, VideoFacts> | null> {
  const url = `${API}/videos?part=snippet,contentDetails,status&id=${ids.join(',')}&maxResults=${ids.length}&key=${encodeURIComponent(key)}`
  try {
    const res = await fetch(url, { signal: signal(), cache: 'no-store' })
    if (!res.ok) {
      // A bad key, an exhausted quota or a blocked referrer are the admin's to fix, so say so in the logs.
      console.error('[youtube] videos.list answered', res.status, (await res.text().catch(() => '')).slice(0, 200))
      return null
    }
    const json = (await res.json()) as { items?: ApiVideo[] }
    const seen = new Map<string, VideoFacts>()
    for (const item of json.items ?? []) if (item.id) seen.set(item.id, factsFromApi(item.id, item))
    const out = new Map<string, VideoFacts>()
    for (const id of ids) out.set(id, seen.get(id) ?? goneFacts(id, 'api'))
    return out
  } catch (e) {
    console.error('[youtube] videos.list failed:', e)
    return null
  }
}

async function oembed(id: string): Promise<VideoFacts | null> {
  const target = `https://www.youtube.com/watch?v=${id}`
  try {
    const res = await fetch(`${OEMBED}?url=${encodeURIComponent(target)}&format=json`, { signal: signal(), cache: 'no-store' })
    const body = res.status === 200 ? await res.json().catch(() => null) : null
    return factsFromOEmbed(id, res.status, body)
  } catch (e) {
    console.error('[youtube] oembed failed:', e)
    return null
  }
}

/**
 * Checks each film's YouTube link. With YOUTUBE_API_KEY it asks the Data API, 50 videos per call, and learns length,
 * subtitles, definition and region rules. Without a key it falls back to oEmbed, which only says whether the video
 * exists and who owns it, and runs a few at a time.
 */
export async function checkLinks(items: CheckInput[]): Promise<{ results: CheckResult[]; source: 'api' | 'oembed' }> {
  const key = process.env.YOUTUBE_API_KEY?.trim()
  const results: CheckResult[] = []
  const videos: Array<{ movieId: string; id: string }> = []
  for (const it of items) {
    const id = youtubeId(it.url)
    if (id) videos.push({ movieId: it.movieId, id })
    else results.push({ movieId: it.movieId, facts: notAVideoFacts() })
  }

  if (key) {
    for (let i = 0; i < videos.length; i += BATCH) {
      const chunk = videos.slice(i, i + BATCH)
      const got = await apiBatch([...new Set(chunk.map((v) => v.id))], key)
      for (const v of chunk) results.push({ movieId: v.movieId, facts: got?.get(v.id) ?? null })
    }
    return { results, source: 'api' }
  }

  const POOL = 5
  for (let i = 0; i < videos.length; i += POOL) {
    const chunk = videos.slice(i, i + POOL)
    const facts = await Promise.all(chunk.map((v) => oembed(v.id)))
    chunk.forEach((v, k) => results.push({ movieId: v.movieId, facts: facts[k] }))
  }
  return { results, source: 'oembed' }
}
