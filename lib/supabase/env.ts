function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function getSupabaseUrl(): string {
  const url = readEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
  )

  if (!url) {
    throw new Error(
      'Supabase URL is missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in your environment.',
    )
  }

  return url
}

export function getSupabaseAnonKey(): string {
  const key = readEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
  )

  if (!key) {
    throw new Error(
      'Supabase anon key is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) in your environment.',
    )
  }

  return key
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    readEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL', 'VITE_SUPABASE_URL') &&
      readEnv(
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_ANON_KEY',
        'VITE_SUPABASE_PUBLISHABLE_KEY',
      ),
  )
}
