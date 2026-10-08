import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'
import { clientOverride } from './scope'

type ServerClient = ReturnType<typeof createServerClient<Database>>

export async function createClient(): Promise<ServerClient> {
  // Inside withClient() (the shared, cached parts of a page) the visitor's cookies are not read at all.
  const override = clientOverride()
  if (override) return override as ServerClient

  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
