import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { ChallengeEditor } from '@/components/admin/ChallengeEditor'
import { loadChallengeOptions } from '@/lib/admin-challenges'

export const dynamic = 'force-dynamic'

export default async function NewChallengePage() {
  const { supabase } = await requireAdmin()
  const options = await loadChallengeOptions(supabase)

  return (
    <div className="p-8">
      <Link href="/admin/challenges" className="text-sm text-film-muted">← All challenges</Link>
      <h1 className="text-2xl font-bold text-film-cream mt-3 mb-8">Start a challenge</h1>
      <ChallengeEditor challenge={null} decks={options.decks} cycles={options.cycles} stats={null} />
    </div>
  )
}
