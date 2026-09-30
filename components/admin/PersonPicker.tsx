'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cleanSearchTerm, type PersonLite } from '@/lib/people'

interface Props {
  label: string
  placeholder?: string
  excludeIds?: string[]
  onPick: (person: PersonLite) => void
}

/** Search-and-select over existing profiles. It never creates people, so a name is spelled once and every credit links to the same profile. */
export function PersonPicker({ label, placeholder = 'Start typing a name', excludeIds = [], onPick }: Props) {
  const uid = useId()
  const listId = `${uid}-list`
  const supabase = createClient() as any
  const wrapRef = useRef<HTMLDivElement>(null)

  const [value, setValue]     = useState('')
  const [results, setResults] = useState<PersonLite[]>([])
  const [open, setOpen]       = useState(false)
  const [active, setActive]   = useState(0)
  const [busy, setBusy]       = useState(false)
  const [failed, setFailed]   = useState(false)
  const [alreadyAdded, setAlreadyAdded] = useState(false)

  const term = cleanSearchTerm(value)

  useEffect(() => {
    if (term.length < 2) { setResults([]); setFailed(false); return }
    setBusy(true)
    const handle = setTimeout(async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, slug, full_name, profile_image, country')
        .ilike('search_text', `%${term}%`)
        .order('full_name', { ascending: true })
        .limit(10)
      setBusy(false)
      setFailed(!!error)
      const found = (data as PersonLite[]) || []
      const available = found.filter(p => !excludeIds.includes(p.id))
      setAlreadyAdded(found.length > 0 && available.length === 0)
      setResults(available)
      setActive(0)
    }, 200)
    return () => clearTimeout(handle)
    // excludeIds changes identity every render; the joined string is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, excludeIds.join(',')])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const pick = (p: PersonLite) => {
    onPick(p)
    setValue('')
    setResults([])
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') {
      // Inside the movie form, a stray Enter must never submit the film.
      e.preventDefault()
      if (open && results[active]) pick(results[active])
    }
    else if (e.key === 'Escape') setOpen(false)
  }

  const showPanel = open && term.length >= 2

  return (
    <div ref={wrapRef} className="relative">
      <label htmlFor={`${uid}-input`} className="block text-xs text-film-muted mb-1">{label}</label>
      <input
        id={`${uid}-input`}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showPanel && results[active] ? `${uid}-opt-${active}` : undefined}
        className="cinema-input text-sm py-2"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={e => { setValue(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {showPanel && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-lg border border-cinema-border bg-cinema-dark shadow-xl"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${uid}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(p) }}
              onMouseEnter={() => setActive(i)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer ${i === active ? 'bg-cinema-surface' : ''}`}
            >
              {p.profile_image ? (
                <img src={p.profile_image} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-cinema-surface border border-cinema-border shrink-0 flex items-center justify-center text-xs text-film-muted">
                  {p.full_name.charAt(0)}
                </span>
              )}
              <span className="text-sm text-film-cream">{p.full_name}</span>
              {p.country && <span className="text-xs text-film-subtle ml-auto">{p.country}</span>}
            </li>
          ))}

          {!busy && results.length === 0 && (
            <li className="px-3 py-3 text-sm text-film-muted" role="option" aria-selected={false}>
              {failed ? (
                'Could not search People just now. Check your connection and try again.'
              ) : alreadyAdded ? (
                'Everyone matching that is already in this list.'
              ) : (
                <>
                  Nobody called &quot;{value.trim()}&quot; yet.{' '}
                  <a
                    href={`/admin/people?add=${encodeURIComponent(value.trim())}`}
                    target="_blank"
                    rel="noopener"
                    className="text-film-gold underline underline-offset-2"
                  >
                    Create their profile
                  </a>{' '}
                  then search again.
                </>
              )}
            </li>
          )}
          {busy && results.length === 0 && (
            <li className="px-3 py-3 text-sm text-film-muted" role="option" aria-selected={false}>Searching People...</li>
          )}
        </ul>
      )}
    </div>
  )
}
