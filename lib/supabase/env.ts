function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

/** Publishable credentials for the MuvieStars Supabase project (RLS-protected). */
const PROJECT_SUPABASE_URL = 'https://anjavnuqkkmpsnjmopou.supabase.co'
const PROJECT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuamF2bnVxa2ttcHNuam1vcG91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDcyMTUsImV4cCI6MjA3MDkyMzIxNX0.FO0Wj6MQoCA8-CVj172TgW37qi2xxebV0Xt16P-2scM'

export function getSupabaseUrl(): string {
  return (
    readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'VITE_SUPABASE_URL') ??
    PROJECT_SUPABASE_URL
  )
}

export function getSupabaseAnonKey(): string {
  return (
    readEnv(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_ANON_KEY',
      'VITE_SUPABASE_PUBLISHABLE_KEY',
    ) ?? PROJECT_SUPABASE_ANON_KEY
  )
}

export function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey())
}
