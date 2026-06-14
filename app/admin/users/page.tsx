import { requireAdmin } from '@/lib/admin'
import { UsersManager } from '@/components/admin/UsersManager'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const { supabase } = await requireAdmin()

  const { data } = await supabase
    .from('profiles')
    .select('id, user_id, display_name, username, avatar_url, role, is_suspended, suspension_reason, created_at')
    .order('created_at', { ascending: false })

  const users = (data as any[]) || []

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="section-label mb-1">Community</p>
        <h1 className="text-2xl font-bold text-film-cream">
          Users
          <span className="ml-2 text-base font-normal text-film-muted">({users.length})</span>
        </h1>
      </div>

      {users.length === 0 ? (
        <div className="cinema-card p-12 text-center text-film-muted text-sm">
          No registered users yet.
        </div>
      ) : (
        <UsersManager users={users} />
      )}
    </div>
  )
}
