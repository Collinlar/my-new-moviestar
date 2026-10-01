import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/** Who is asking, and are they an admin. Never redirects, so API routes can answer 401 or 403. */
export async function getAdmin() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, isAdmin: false }

  let isAdmin = user.email === 'kofcollkcl100@gmail.com'

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  return { supabase, user, isAdmin }
}

export async function requireAdmin() {
  const { supabase, user, isAdmin } = await getAdmin()

  if (!user) redirect('/auth?next=/admin')
  if (!isAdmin) redirect('/')

  return { user, supabase }
}
