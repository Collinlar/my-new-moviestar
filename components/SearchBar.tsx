'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  defaultValue?: string
  placeholder?: string
  className?: string
  size?: 'default' | 'large'
  onSearch?: (q: string) => void
}

export function SearchBar({
  defaultValue = '',
  placeholder = 'Search African movies, directors, actors...',
  className,
  size = 'default',
  onSearch,
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const submit = (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    if (onSearch) {
      onSearch(trimmed)
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submit(value)
    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className={cn('relative w-full', className)}>
      <label className="sr-only" htmlFor="movie-search">
        Search African movies and filmmakers
      </label>
      <div className={cn(
        'flex items-center gap-2 bg-cinema-surface border border-cinema-border rounded-xl',
        'transition-all duration-200 focus-within:border-film-gold/50 focus-within:shadow-[0_0_0_3px_rgba(200,150,62,0.12)]',
        size === 'large' ? 'px-5 py-4' : 'px-4 py-3',
      )}>
        <Search
          className={cn(
            'flex-shrink-0 text-film-muted pointer-events-none',
            size === 'large' ? 'w-5 h-5' : 'w-4 h-4',
          )}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="movie-search"
          type="search"
          role="searchbox"
          aria-label="Search movies"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            'flex-1 bg-transparent text-film-cream placeholder-film-subtle',
            'outline-none border-none appearance-none',
            size === 'large' ? 'text-base' : 'text-sm',
          )}
          autoComplete="off"
          spellCheck="false"
          style={{ fontSize: '16px' }} /* prevent iOS zoom */
        />
        {value && (
          <button
            onClick={() => setValue('')}
            className="flex-shrink-0 text-film-subtle hover:text-film-muted transition-colors"
            aria-label="Clear search"
            type="button"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <button
          onClick={() => submit(value)}
          className="flex-shrink-0 btn-gold py-1.5 px-4 text-sm"
          type="button"
          aria-label="Run search"
        >
          Find films
        </button>
      </div>
    </div>
  )
}
