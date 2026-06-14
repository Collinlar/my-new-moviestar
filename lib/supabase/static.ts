/**
 * A simple Supabase client with no cookie handling.
 * Use ONLY in generateStaticParams and other build-time contexts
 * where the Next.js `cookies()` API is unavailable.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'
import { getSupabaseAnonKey, getSupabaseUrl } from './env'

export function createStaticClient() {
  return createSupabaseClient<Database>(
    getSupabaseUrl(),
    getSupabaseAnonKey()
  )
}
