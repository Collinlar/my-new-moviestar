'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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

const SERIF: React.CSSProperties = { fontFamily: '"Instrument Serif", Georgia, serif' }
const MONO: React.CSSProperties  = { fontFamily: '"Geist Mono", monospace' }

const INPUT: React.CSSProperties = {
  width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px',
  border: '1px solid rgba(237,228,210,0.12)', background: '#15120E',
  color: '#EDE4D2', fontSize: '15px', fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
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
    await supabase.from('movie_lists').update({ is_public: !list.is_public }).eq('id', list.id)
    setLists(prev => prev.map(l => l.id === list.id ? { ...l, is_public: !l.is_public } : l))
  }

  return (
    <>
      <Navigation />

      <main style={{ background: '#0B0A09', color: '#EDE4D2', minHeight: '100vh' }}>

        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <section style={{ background: '#0D1F26', paddingTop: '76px', paddingBottom: '0', borderBottom: '1px solid rgba(237,228,210,0.06)' }}>
          <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '48px', paddingBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ ...MONO, fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C8963E', margin: 0 }}>
                  Your account
                </p>
                <h1 style={{ ...SERIF, fontWeight: 400, fontSize: 'clamp(36px,5vw,64px)', lineHeight: 1, color: '#F6EFE2', margin: 0 }}>
                  Your lists
                  {lists.length > 0 && (
                    <span style={{ ...MONO, fontSize: '18px', fontStyle: 'normal', color: '#6A6258', marginLeft: '14px' }}>
                      {lists.length}
                    </span>
                  )}
                </h1>
                <p style={{ margin: 0, fontSize: '16px', color: '#8C857A' }}>
                  Curate and share collections of African films.
                </p>
              </div>

              {!creating && (
                <button
                  onClick={() => setCreating(true)}
                  style={{
                    height: '48px', padding: '0 24px', borderRadius: '14px',
                    background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
                    color: '#C8963E', fontSize: '15px', fontWeight: 600,
                    cursor: 'pointer', ...MONO,
                  }}
                >
                  + New list
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── CONTENT ────────────────────────────────────────────────── */}
        <div className="max-w-screen-2xl mx-auto px-5 sm:px-10 lg:px-20" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
          <div style={{ maxWidth: '760px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Create form */}
            {creating && (
              <div style={{
                padding: '28px', borderRadius: '20px',
                border: '1px solid rgba(200,150,62,0.2)', background: '#0F0D0B',
                display: 'flex', flexDirection: 'column', gap: '16px',
              }}>
                <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#F6EFE2' }}>New list</p>

                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createList()}
                  placeholder="What's this list called?"
                  maxLength={80}
                  style={INPUT}
                />

                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Describe it (optional)"
                  rows={2}
                  maxLength={300}
                  style={{
                    ...INPUT, height: 'auto', padding: '12px 14px',
                    resize: 'none', lineHeight: '1.5',
                  }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={createList}
                    disabled={!newName.trim() || saving}
                    style={{
                      height: '44px', padding: '0 20px', borderRadius: '12px',
                      background: saving ? 'rgba(127,168,139,0.12)' : 'rgba(127,168,139,0.2)',
                      border: '1px solid rgba(127,168,139,0.3)',
                      color: '#7FA88B', fontSize: '14px', fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer', ...MONO,
                      opacity: !newName.trim() ? 0.5 : 1,
                    }}
                  >
                    {saving ? 'Creating...' : 'Create list'}
                  </button>
                  <button
                    onClick={() => { setCreating(false); setNewName(''); setNewDesc('') }}
                    style={{
                      height: '44px', padding: '0 16px', borderRadius: '12px',
                      border: '1px solid rgba(237,228,210,0.1)', background: 'transparent',
                      color: '#6A6258', fontSize: '14px', cursor: 'pointer', ...MONO,
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Lists */}
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
                <div style={{ ...MONO, fontSize: '13px', color: '#6A6258' }}>Loading your lists...</div>
              </div>
            ) : lists.length === 0 && !creating ? (
              <div style={{
                padding: '64px 24px', borderRadius: '20px',
                border: '1px solid rgba(237,228,210,0.06)',
                textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center',
              }}>
                <p style={{ fontSize: '17px', color: '#6A6258', margin: 0 }}>
                  No lists yet. Create one to start curating African cinema.
                </p>
                <button
                  onClick={() => setCreating(true)}
                  style={{
                    height: '44px', padding: '0 20px', borderRadius: '12px',
                    background: 'rgba(200,150,62,0.15)', border: '1px solid rgba(200,150,62,0.3)',
                    color: '#C8963E', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', ...MONO,
                  }}
                >
                  Create my first list
                </button>
              </div>
            ) : (
              lists.map(list => (
                <div
                  key={list.id}
                  style={{
                    padding: '20px 24px', borderRadius: '16px',
                    background: '#0F0D0B', border: '1px solid rgba(237,228,210,0.06)',
                    display: 'flex', alignItems: 'center', gap: '20px',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                    background: list.is_public ? 'rgba(200,150,62,0.1)' : 'rgba(106,98,88,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>
                    {list.is_public ? '🎞' : '🔒'}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      href={`/lists/${list.id}`}
                      style={{ textDecoration: 'none' }}
                    >
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#F6EFE2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {list.name}
                      </p>
                    </Link>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ ...MONO, fontSize: '12px', color: '#6A6258' }}>
                        {list.movie_count} {list.movie_count === 1 ? 'film' : 'films'}
                      </span>
                      <button
                        onClick={() => togglePublic(list)}
                        style={{
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                          ...MONO, fontSize: '12px',
                          color: list.is_public ? '#7FA88B' : '#6A6258',
                        }}
                      >
                        {list.is_public ? 'Public' : 'Private'}
                      </button>
                    </div>
                    {list.description && (
                      <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6A6258', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {list.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <Link
                      href={`/lists/${list.id}`}
                      style={{
                        height: '36px', padding: '0 16px', borderRadius: '10px',
                        border: '1px solid rgba(237,228,210,0.1)', background: 'transparent',
                        color: '#8C857A', fontSize: '13px', textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', ...MONO,
                      }}
                    >
                      Open
                    </Link>
                    <button
                      onClick={() => deleteList(list.id)}
                      disabled={deleting === list.id}
                      style={{
                        height: '36px', width: '36px', borderRadius: '10px',
                        border: '1px solid rgba(224,115,90,0.15)', background: 'transparent',
                        color: '#8C4A3A', fontSize: '14px', cursor: deleting === list.id ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: deleting === list.id ? 0.5 : 1,
                      }}
                      aria-label="Delete list"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}

            <div style={{ paddingTop: '8px' }}>
              <Link
                href="/account"
                style={{ fontSize: '14px', color: '#6A6258', textDecoration: 'none', ...MONO }}
              >
                ← Back to account
              </Link>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </>
  )
}
