import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await (supabase as any).auth.getUser()
    if (!user) redirect('/auth?next=/account')
  } catch (err: unknown) {
    // Re-throw Next.js redirect — only swallow genuine Supabase errors at build time
    if (
      err != null &&
      typeof err === 'object' &&
      'digest' in err &&
      typeof (err as { digest: unknown }).digest === 'string' &&
      (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw err
    }
    redirect('/auth?next=/account')
  }
  return <>{children}</>
}
