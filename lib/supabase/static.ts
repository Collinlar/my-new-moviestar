/**
 * A simple Supabase client with no cookie handling.
 * Use ONLY in generateStaticParams and other build-time contexts
 * where the Next.js `cookies()` API is unavailable.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createStaticClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
