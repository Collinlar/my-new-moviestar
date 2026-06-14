'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Film, Mail, Lock, Eye, EyeOff } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

type Mode = 'login' | 'signup'

export function AuthForm() {
  const [mode, setMode]         = useState<Mode>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState<string | null>(null)

  const searchParams = useSearchParams()
  const supabase = createClient()

  // Show error passed back from the auth callback route
  const urlError = searchParams.get('error')

  const handleGoogleSignIn = async () => {
    const next = searchParams.get('next') || '/'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = searchParams.get('next') || '/'
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email to confirm your account.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-cinema-dark border border-cinema-border rounded-2xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <Film className="w-8 h-8 text-film-gold mx-auto mb-3" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-film-cream">
          {mode === 'login' ? 'Welcome back' : 'Join MuvieStars'}
        </h1>
        <p className="text-film-muted text-sm mt-2">
          {mode === 'login'
            ? 'Sign in to your account'
            : 'Create your free account to review African cinema'}
        </p>
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-cinema-border bg-cinema-black hover:bg-cinema-surface transition-colors text-sm font-medium text-film-cream"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Divider */}
      <div className="relative my-6" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-cinema-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-cinema-dark px-3 text-xs text-film-subtle">or use your email</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-film-muted mb-1.5">
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-film-subtle pointer-events-none" aria-hidden="true" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="cinema-input pl-10"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-film-muted mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-film-subtle pointer-events-none" aria-hidden="true" />
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
              className="cinema-input pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-film-subtle hover:text-film-muted transition-colors"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error / success */}
        {(error || urlError) && (
          <p role="alert" className="text-sm text-film-red bg-film-red/10 border border-film-red/20 rounded-lg px-4 py-3">
            {error || urlError}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-film-gold bg-film-gold/10 border border-film-gold/20 rounded-lg px-4 py-3">
            {success}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold w-full justify-center py-3 text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? 'One moment...'
            : mode === 'login'
              ? 'Sign in to MuvieStars'
              : 'Create my account'}
        </button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-sm text-film-muted mt-6">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
          className="text-film-gold hover:text-film-amber transition-colors font-medium"
        >
          {mode === 'login' ? 'Create one free' : 'Sign in'}
        </button>
      </p>
    </div>
  )
}
