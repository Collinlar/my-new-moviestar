/**
 * Spread a pool of films across industries, so a preview deck is not six films from one industry, and shuffle
 * within each. Pure, with the random source passed in so it can be tested.
 */
export function spreadByIndustry<T extends { industry?: string | null }>(films: T[], limit: number, rand: () => number = Math.random): T[] {
  const shuffle = <U,>(xs: U[]): U[] => {
    const a = [...xs]
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
    return a
  }
  const groups = new Map<string, T[]>()
  for (const f of films) {
    const k = f.industry && f.industry !== 'Other' ? f.industry : 'Other'
    groups.set(k, [...(groups.get(k) ?? []), f])
  }
  const queues = shuffle([...groups.values()]).map(shuffle)
  const out: T[] = []
  while (out.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) {
      const next = q.shift()
      if (next) out.push(next)
      if (out.length >= limit) break
    }
  }
  return out
}
