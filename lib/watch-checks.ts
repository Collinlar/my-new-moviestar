import type { WatchCheck } from '@/lib/youtube'

/**
 * What the last link check found, for these films. A film nobody has checked has no entry. If the checks table does
 * not exist yet (the migration has not been run) this quietly returns nothing, so pages work the same as before.
 */
export async function loadWatchChecks(supabase: any, ids: string[]): Promise<Map<string, WatchCheck>> {
  const out = new Map<string, WatchCheck>()
  if (ids.length === 0) return out
  const { data, error } = await supabase.from('movie_watch_checks').select('*').in('movie_id', ids)
  if (error || !data) return out
  for (const row of data as WatchCheck[]) out.set(row.movie_id, row)
  return out
}

export async function withWatchChecks<T extends { id: string }>(supabase: any, movies: T[]): Promise<Array<T & { watch_check: WatchCheck | null }>> {
  const checks = await loadWatchChecks(supabase, movies.map((m) => m.id))
  return movies.map((m) => ({ ...m, watch_check: checks.get(m.id) ?? null }))
}
