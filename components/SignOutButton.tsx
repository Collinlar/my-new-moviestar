'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MONO: React.CSSProperties = { fontFamily: '"Geist Mono", monospace' }

export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        height: '36px', padding: '0 16px', borderRadius: '10px',
        border: '1px solid rgba(237,228,210,0.12)',
        background: 'transparent', color: '#8C857A',
        fontSize: '14px', cursor: 'pointer',
        ...MONO,
      }}
    >
      Sign out
    </button>
  )
}
