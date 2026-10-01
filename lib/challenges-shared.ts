// Parts of the challenges model with no server code, so client components can import them.

export { sponsorLabel } from '@/lib/decks-shared'

export const CHALLENGE_DEFAULT_DAYS = 30

export type ChallengeState = 'upcoming' | 'open' | 'ended'

export function challengeState(c: { starts_at: string; ends_at: string }, now: Date = new Date()): ChallengeState {
  if (now.getTime() < new Date(c.starts_at).getTime()) return 'upcoming'
  if (now.getTime() > new Date(c.ends_at).getTime()) return 'ended'
  return 'open'
}

/** Whole days left, rounded up, never negative. */
export function daysLeft(endsAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now.getTime()) / 86_400_000))
}

/** "14 Oct 2026", in the same style on the server and the browser. */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** "Take all 3" when the goal is the whole deck, otherwise "Take 2 of 5". */
export function goalPhrase(goal: number, total: number): string {
  return goal >= total ? `Take all ${total}` : `Take ${goal} of ${total}`
}

/** The short line that says where a challenge stands. */
export function stateLine(c: { starts_at: string; ends_at: string }, now: Date = new Date()): string {
  const state = challengeState(c, now)
  if (state === 'upcoming') return `Starts ${formatDay(c.starts_at)}`
  if (state === 'ended') return `Ended ${formatDay(c.ends_at)}`
  const d = daysLeft(c.ends_at, now)
  return d <= 1 ? 'Last day' : `${d} days left`
}
