import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/admin'
import { ChallengeEditor } from '@/components/admin/ChallengeEditor'
import { loadChallengeOptions } from '@/lib/admin-challenges'
import { CHALLENGE_COLUMNS } from '@/lib/challenges'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function AdminChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  const { supabase } = await requireAdmin()

  const { data: challenge } = await (supabase as any).from('challenges').select(CHALLENGE_COLUMNS).eq('id', id).maybeSingle()
  if (!challenge) notFound()

  const [options, { data: joins }, { data: completions }] = await Promise.all([
    loadChallengeOptions(supabase),
    (supabase as any).from('challenge_joins').select('user_id').eq('challenge_id', id),
    (supabase as any).from('challenge_completions').select('user_id').eq('challenge_id', id),
  ])

  return (
    <div className="p-8">
      <Link href="/admin/challenges" className="text-sm text-film-muted">← All challenges</Link>
      <h1 className="text-2xl font-bold text-film-cream mt-3 mb-8">{challenge.title}</h1>
      <ChallengeEditor
        challenge={challenge}
        decks={options.decks}
        cycles={options.cycles}
        stats={{ joined: (joins ?? []).length, completed: (completions ?? []).length }}
      />
    </div>
  )
}
