'use client'

import { useState, useEffect, useRef } from 'react'
import { List, Plus, Check, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  movieId: string
}

interface MovieList {
  id: string
  name: string
  is_public: boolean
}

export function SaveToListButton({ movieId }: Props) {
  const [open, setOpen]           = useState(false)
  const [lists, setLists]         = useState<MovieList[]>([])
  const [inLists, setInLists]     = useState<Set<string>>(new Set())
  const [loading, setLoading]     = useState(false)
  const [toggling, setToggling]   = useState<string | null>(null)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [userId, setUserId]       = useState<string | null>(null)
  const [ready, setReady]         = useState(false)

  const ref        = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)
  const supabase   = createClient() as any

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: any) => {
      setUserId(user?.id ?? null)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (!open || !userId) return
    const load = async () => {
      setLoading(true)
      const [listsRes, itemsRes] = await Promise.all([
        supabase.from('movie_lists').select('id, name, is_public').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('movie_list_items').select('list_id').eq('movie_id', movieId),
      ])
      setLists(listsRes.data || [])
      setInLists(new Set((itemsRes.data || []).map((r: any) => r.list_id)))
      setLoading(false)
    }
    load()
  }, [open, userId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
        setNewName('')
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const handleOpen = () => {
    if (!userId) {
      window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`
      return
    }
    setOpen(v => !v)
  }

  const toggleList = async (listId: string) => {
    if (toggling) return
    setToggling(listId)
    const inList = inLists.has(listId)
    if (inList) {
      await supabase
        .from('movie_list_items')
        .delete()
        .eq('list_id', listId)
        .eq('movie_id', movieId)
      setInLists(prev => { const s = new Set(prev); s.delete(listId); return s })
    } else {
      await supabase
        .from('movie_list_items')
        .insert({ list_id: listId, movie_id: movieId })
      setInLists(prev => new Set(prev).add(listId))
    }
    setToggling(null)
  }

  const createList = async () => {
    const name = newName.trim()
    if (!name || !userId) return
    setToggling('new')
    const { data } = await supabase
      .from('movie_lists')
      .insert({ user_id: userId, name, is_public: true })
      .select('id, name, is_public')
      .single()
    if (data) {
      await supabase.from('movie_list_items').insert({ list_id: data.id, movie_id: movieId })
      setLists(prev => [data, ...prev])
      setInLists(prev => new Set(prev).add(data.id))
    }
    setNewName('')
    setCreating(false)
    setToggling(null)
  }

  if (!ready) return null

  const savedCount = inLists.size

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
          savedCount > 0
            ? 'text-film-gold'
            : 'text-film-subtle hover:text-film-muted'
        }`}
        aria-label="Save to a list"
        aria-expanded={open}
      >
        <List className={`w-3.5 h-3.5 ${savedCount > 0 ? 'fill-current' : ''}`} aria-hidden="true" />
        <span>{savedCount > 0 ? `In ${savedCount} list${savedCount > 1 ? 's' : ''}` : 'Save to list'}</span>
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-64 bg-cinema-dark border border-cinema-border rounded-xl shadow-lg shadow-black/40 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-cinema-border">
            <p className="text-xs font-semibold text-film-cream">Save to list</p>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 text-film-subtle animate-spin" />
              </div>
            ) : lists.length === 0 ? (
              <p className="text-xs text-film-muted px-3 py-4 text-center">
                No lists yet. Create your first one below.
              </p>
            ) : (
              lists.map(list => {
                const saved = inLists.has(list.id)
                const busy  = toggling === list.id
                return (
                  <button
                    key={list.id}
                    onClick={() => toggleList(list.id)}
                    disabled={!!toggling}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-cinema-surface transition-colors disabled:opacity-50 group"
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      saved ? 'bg-film-gold border-film-gold' : 'border-cinema-border group-hover:border-film-muted'
                    }`}>
                      {busy
                        ? <Loader2 className="w-2.5 h-2.5 animate-spin text-cinema-dark" />
                        : saved && <Check className="w-2.5 h-2.5 text-cinema-dark" />
                      }
                    </span>
                    <span className="text-xs text-film-muted group-hover:text-film-cream transition-colors truncate">
                      {list.name}
                    </span>
                    {!list.is_public && (
                      <span className="text-[10px] text-film-subtle ml-auto shrink-0">Private</span>
                    )}
                  </button>
                )
              })
            )}
          </div>

          <div className="border-t border-cinema-border px-3 py-2">
            {creating ? (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') createList()
                    if (e.key === 'Escape') { setCreating(false); setNewName('') }
                  }}
                  placeholder="List name"
                  maxLength={80}
                  className="flex-1 bg-cinema-surface border border-cinema-border rounded px-2 py-1 text-xs text-film-cream placeholder-film-subtle outline-none focus:border-film-gold/50"
                />
                <button
                  onClick={createList}
                  disabled={!newName.trim() || toggling === 'new'}
                  className="text-film-gold disabled:opacity-40 hover:text-film-amber transition-colors"
                  aria-label="Confirm"
                >
                  {toggling === 'new'
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Check className="w-3.5 h-3.5" />
                  }
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName('') }}
                  className="text-film-subtle hover:text-film-muted transition-colors"
                  aria-label="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 text-xs text-film-muted hover:text-film-cream transition-colors w-full"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                New list
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
