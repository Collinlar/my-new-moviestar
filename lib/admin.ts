import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth?next=/admin')

  let isAdmin = user.email === 'kofcollkcl100@gmail.com'

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  if (!isAdmin) redirect('/')

  return { user, supabase }
}
