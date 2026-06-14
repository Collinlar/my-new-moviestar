'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { List, Plus, Trash2, Globe, Lock, Film, ExternalLink, Loader2 } from 'lucide-react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'

interface MovieList {
  id: string
  name: string
  description: string | null
  is_public: boolean
  created_at: string
  movie_count: number
}

export default function AccountListsPage() {
  const [lists, setLists]       = useState<MovieList[]>([])
  const [loading, setLoading]   = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName]   = useState('')
  const [newDesc, setNewDesc]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [userId, setUserId]     = useState<string | null>(null)

  const supabase = createClient() as any

  const loadLists = async (uid: string) => {
    const { data } = await supabase
      .from('movie_lists')
      .select('id, name, description, is_public, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    const withCounts = await Promise.all(
      (data || []).map(async (list: any) => {
        const { count } = await supabase
          .from('movie_list_items')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id)
        return { ...list, movie_count: count || 0 }
      })
    )
    setLists(withCounts)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      if (!user) { window.location.href = '/auth?next=/account/lists'; return }
      setUserId(user.id)
      loadLists(user.id)
    })
  }, [])

  const createList = async () => {
    const name = newName.trim()
    if (!name || !userId) return
    setSaving(true)
    const { data } = await supabase
      .from('movie_lists')
      .insert({ user_id: userId, name, description: newDesc.trim() || null, is_public: true })
      .select('id, name, description, is_public, created_at')
      .single()
    if (data) setLists(prev => [{ ...data, movie_count: 0 }, ...prev])
    setNewName('')
    setNewDesc('')
    setCreating(false)
    setSaving(false)
  }

  const deleteList = async (id: string) => {
    if (!confirm('Delete this list? This cannot be undone.')) return
    setDeleting(id)
    await supabase.from('movie_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
    setDeleting(null)
  }

  const togglePublic = async (list: MovieList) => {
    await supabase
      .from('movie_lists')
      .update({ is_public: !list.is_public })
      .eq('id', list.id)
    setLists(prev => prev.map(l => l.id === list.id ? { ...l, is_public: !l.is_public } : l))
  }

  return (
    <>
      <Navigation />

      <main className="pt-16 min-h-screen">

        <section className="py-12 bg-cinema-dark border-b border-cinema-border">
          <div className="section-container max-w-3xl">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-film-cream flex items-center gap-2">
                  <List className="w-6 h-6 text-film-gold" aria-hidden="true" />
                  My lists
                </h1>
                <p className="text-sm text-film-muted mt-1">
                  Curate and share collections of African films.
                </p>
              </div>
              <button
                onClick={() => setCreating(true)}
                className="btn-gold text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                New list
              </button>
            </div>
          </div>
        </section>

        <div className="section-container max-w-3xl py-10 space-y-6">

          {/* Create form */}
          {creating && (
            <div className="bg-cinema-dark border border-film-gold/30 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-film-cream mb-4">New list</h2>
              <div className="space-y-3">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createList()}
                  placeholder="List name"
                  maxLength={80}
                  className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2.5 text-sm text-film-cream placeholder-film-subtle outline-none focus:border-film-gold/50 transition-colors"
                />
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  maxLength={300}
                  className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2.5 text-sm text-film-cream placeholder-film-subtle outline-none focus:border-film-gold/50 transition-colors resize-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={createList}
                    disabled={!newName.trim() || saving}
                    className="btn-gold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create list
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
                    className="text-sm text-film-muted hover:text-film-cream transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lists */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-film-subtle animate-spin" />
            </div>
          ) : lists.length === 0 && !creating ? (
            <div className="text-center py-20 border border-cinema-border rounded-xl">
              <List className="w-8 h-8 text-film-subtle mx-auto mb-3" aria-hidden="true" />
              <p className="text-film-muted text-sm mb-4">
                No lists yet. Create one to start curating African cinema.
              </p>
              <button onClick={() => setCreating(true)} className="btn-gold text-sm">
                Create my first list
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {lists.map(list => (
                <div
                  key={list.id}
                  className="bg-cinema-dark border border-cinema-border rounded-xl p-4 flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-cinema-surface border border-cinema-border flex items-center justify-center flex-shrink-0">
                    {list.is_public
                      ? <List className="w-4 h-4 text-film-gold" aria-hidden="true" />
                      : <Lock className="w-4 h-4 text-film-subtle" aria-hidden="true" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <Link
                          href={`/lists/${list.id}`}
                          className="font-semibold text-film-cream hover:text-film-gold transition-colors text-sm"
                        >
                          {list.name}
                        </Link>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-film-subtle">
                            {list.movie_count} {list.movie_count === 1 ? 'film' : 'films'}
                          </span>
                          <button
                            onClick={() => togglePublic(list)}
                            className="flex items-center gap-1 text-xs text-film-subtle hover:text-film-muted transition-colors"
                          >
                            {list.is_public
                              ? <><Globe className="w-3 h-3" aria-hidden="true" /> Public</>
                              : <><Lock className="w-3 h-3" aria-hidden="true" /> Private</>
                            }
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {list.is_public && (
                          <Link
                            href={`/lists/${list.id}`}
                            className="text-film-subtle hover:text-film-muted transition-colors"
                            title="View public page"
                            aria-label="View public page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          </Link>
                        )}
                        <button
                          onClick={() => deleteList(list.id)}
                          disabled={deleting === list.id}
                          className="text-film-subtle hover:text-red-400 transition-colors disabled:opacity-40"
                          aria-label="Delete list"
                        >
                          {deleting === list.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          }
                        </button>
                      </div>
                    </div>

                    {list.description && (
                      <p className="text-xs text-film-subtle mt-1.5 leading-relaxed line-clamp-2">
                        {list.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2">
            <Link href="/account" className="text-sm text-film-muted hover:text-film-cream transition-colors">
              ← Back to account
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </>
  )
}
