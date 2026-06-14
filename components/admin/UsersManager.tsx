'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, Ban, CheckCircle, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

type Role = 'user' | 'moderator' | 'admin'

interface UserRow {
  id: string
  user_id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  role: Role
  is_suspended: boolean
  suspension_reason: string | null
  created_at: string
}

const ROLE_LABELS: Record<Role, string> = { user: 'User', moderator: 'Moderator', admin: 'Admin' }
const ROLE_COLOURS: Record<Role, string> = {
  user: 'text-film-muted',
  moderator: 'text-blue-400',
  admin: 'text-film-gold',
}

interface Props { users: UserRow[] }

export function UsersManager({ users: initial }: Props) {
  const [users, setUsers] = useState(initial)
  const [acting, setActing] = useState<string | null>(null)
  const [suspendId, setSuspendId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const router = useRouter()
  const supabase = createClient() as any

  const updateRole = async (userId: string, role: Role) => {
    setActing(userId)
    const { error } = await supabase.from('profiles').update({ role }).eq('user_id', userId)
    if (error) { toast.error('Could not update role'); setActing(null); return }
    setUsers(p => p.map(u => u.user_id === userId ? { ...u, role } : u))
    toast.success(`Role updated to ${ROLE_LABELS[role]}`)
    setActing(null)
    router.refresh()
  }

  const toggleSuspend = async (user: UserRow) => {
    if (user.is_suspended) {
      // Unsuspend
      setActing(user.user_id)
      const { error } = await supabase.from('profiles')
        .update({ is_suspended: false, suspension_reason: null, suspension_until: null })
        .eq('user_id', user.user_id)
      if (error) { toast.error('Could not unsuspend'); setActing(null); return }
      setUsers(p => p.map(u => u.user_id === user.user_id ? { ...u, is_suspended: false, suspension_reason: null } : u))
      toast.success('User unsuspended')
      setActing(null)
    } else {
      setSuspendId(user.user_id)
      setSuspendReason('')
    }
  }

  const confirmSuspend = async () => {
    if (!suspendId) return
    setActing(suspendId)
    const { error } = await supabase.from('profiles')
      .update({ is_suspended: true, suspension_reason: suspendReason || 'Suspended by admin' })
      .eq('user_id', suspendId)
    if (error) { toast.error('Could not suspend'); setActing(null); return }
    setUsers(p => p.map(u => u.user_id === suspendId
      ? { ...u, is_suspended: true, suspension_reason: suspendReason || 'Suspended by admin' }
      : u))
    toast.success('User suspended')
    setSuspendId(null)
    setActing(null)
    router.refresh()
  }

  return (
    <div>
      {/* Suspend modal */}
      {suspendId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setSuspendId(null)}>
          <div className="absolute inset-0 bg-cinema-black/80 backdrop-blur-sm" />
          <div className="relative bg-cinema-dark border border-cinema-border rounded-xl p-6 w-full max-w-sm"
               onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-film-cream mb-4">Suspend user</h3>
            <label className="block text-xs text-film-muted mb-1.5">Reason (optional)</label>
            <input
              className="cinema-input text-sm mb-4"
              value={suspendReason}
              onChange={e => setSuspendReason(e.target.value)}
              placeholder="Violation of community guidelines"
            />
            <div className="flex gap-2">
              <button onClick={confirmSuspend} disabled={!!acting}
                className="btn-gold py-2 text-sm flex-1 disabled:opacity-50">
                Suspend account
              </button>
              <button onClick={() => setSuspendId(null)} className="btn-ghost py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="cinema-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cinema-border">
                <th className="text-left py-3 px-4 text-xs font-semibold text-film-muted tracking-wide">User</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-film-muted tracking-wide hidden sm:table-cell">Joined</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-film-muted tracking-wide">Role</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-film-muted tracking-wide hidden md:table-cell">Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-film-muted tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cinema-border">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-cinema-surface/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover bg-cinema-surface shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-cinema-surface shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-film-cream text-sm leading-tight">
                          {user.display_name || user.username || 'Unnamed user'}
                        </div>
                        {user.username && user.display_name && (
                          <div className="text-xs text-film-subtle">@{user.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 hidden sm:table-cell">
                    <span className="text-film-muted text-xs">
                      {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="relative inline-block">
                      <select
                        value={user.role}
                        disabled={acting === user.user_id}
                        onChange={e => updateRole(user.user_id, e.target.value as Role)}
                        className={`appearance-none bg-transparent border-0 text-xs font-medium cursor-pointer pr-4 focus:outline-none disabled:opacity-50 ${ROLE_COLOURS[user.role]}`}
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-0 top-0.5 w-3 h-3 text-film-subtle" />
                    </div>
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    {user.is_suspended ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                        <Ban className="w-3 h-3" /> Suspended
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleSuspend(user)}
                      disabled={acting === user.user_id}
                      className={`text-xs font-medium transition-colors disabled:opacity-40 ${
                        user.is_suspended
                          ? 'text-green-400 hover:text-green-300'
                          : 'text-red-400 hover:text-red-300'
                      }`}
                    >
                      {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
