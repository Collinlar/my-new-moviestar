// Is someone signed in on this device? Answered without loading the Supabase library, which is about 120 KB of JavaScript
// that a signed-out visitor never needs. Supabase keeps the session in a cookie called sb-<project>-auth-token (split into
// .0, .1 and so on when it is long), and the cookie can be read by the page.

/** True when this cookie string holds a Supabase session. The server still decides what the session is worth. */
export function hasSessionIn(cookie: string): boolean {
  return /(?:^|;\s*)sb-[^=;\s]*-auth-token(?:\.\d+)?=[^;\s]/.test(cookie)
}

/** Browser only. False on the server and for a visitor with no session cookie. */
export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  try { return hasSessionIn(document.cookie) } catch { return false }
}

/**
 * The browser Supabase client, loaded only when something needs it. Call it for a signed-in visitor or at the moment of a
 * sign-in or sign-out, never on page load for everyone.
 */
export async function loadSupabase() {
  const { createClient } = await import('@/lib/supabase/client')
  return createClient()
}
