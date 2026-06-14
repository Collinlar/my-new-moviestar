'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Profile {
  display_name: string | null
  username: string | null
  bio: string | null
  avatar_url: string | null
}

interface Props {
  userId: string
  profile: Profile
}

export function EditProfileForm({ userId, profile }: Props) {
  const [open, setOpen]               = useState(false)
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [username, setUsername]       = useState(profile.username ?? '')
  const [bio, setBio]                 = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl]     = useState(profile.avatar_url ?? '')
  const [saving, setSaving]           = useState(false)

  const supabase = createClient() as any

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        username:     username.trim()     || null,
        bio:          bio.trim()          || null,
        avatar_url:   avatarUrl.trim()    || null,
        updated_at:   new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      toast.error(
        error.message.includes('unique')
          ? 'That username is already taken.'
          : 'Could not save your profile.'
      )
    } else {
      toast.success('Profile updated')
      setOpen(false)
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline text-sm">
        Edit profile
      </button>
    )
  }

  return (
    <div className="bg-cinema-dark border border-cinema-border rounded-xl p-6 mt-4">
      <h3 className="text-sm font-semibold text-film-cream mb-4">Edit your profile</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-film-muted mb-1">Display name</label>
          <input
            className="cinema-input w-full text-sm"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How your name appears"
          />
        </div>
        <div>
          <label className="block text-xs text-film-muted mb-1">Username</label>
          <input
            className="cinema-input w-full text-sm"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="lowercase_only"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Bio</label>
          <textarea
            className="cinema-input w-full text-sm resize-none"
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell other film fans a bit about yourself"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-film-muted mb-1">Avatar URL</label>
          <input
            className="cinema-input w-full text-sm"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button onClick={save} disabled={saving} className="btn-gold text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
      </div>
    </div>
  )
}
