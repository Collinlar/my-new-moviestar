'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { capitalise } from '@/lib/utils'
import { Edit2, Trash2, Star, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import type { Movie } from '@/lib/queries'

interface Props {
  movies: Movie[]
}

export function MovieTable({ movies: initial }: Props) {
  const [movies, setMovies] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient() as any

  const toggle = async (id: string, field: 'featured' | 'is_canon', current: boolean) => {
    const { error } = await supabase
      .from('movies')
      .update({ [field]: !current })
      .eq('id', id)
    if (error) {
      toast.error('Could not update movie')
      return
    }
    setMovies(prev => prev.map(m => m.id === id ? { ...m, [field]: !current } : m))
    toast.success(field === 'featured' ? (!current ? 'Marked featured' : 'Removed from featured') : (!current ? 'Added to canon' : 'Removed from canon'))
  }

  const remove = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from the database? This cannot be undone.`)) return
    setDeleting(id)
    const { error } = await supabase.from('movies').delete().eq('id', id)
    if (error) {
      toast.error('Could not delete movie')
      setDeleting(null)
      return
    }
    setMovies(prev => prev.filter(m => m.id !== id))
    toast.success(`"${title}" removed`)
    setDeleting(null)
    router.refresh()
  }

  if (!movies.length) {
    return (
      <div className="text-center py-16 text-film-muted text-sm">
        No movies found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-cinema-border">
            <th className="text-left py-3 px-4 text-xs font-semibold text-film-muted tracking-wide">Title</th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-film-muted tracking-wide hidden md:table-cell">Genre</th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-film-muted tracking-wide hidden lg:table-cell">Language</th>
            <th className="text-left py-3 px-3 text-xs font-semibold text-film-muted tracking-wide hidden md:table-cell">Year</th>
            <th className="text-center py-3 px-3 text-xs font-semibold text-film-muted tracking-wide">Featured</th>
            <th className="text-center py-3 px-3 text-xs font-semibold text-film-muted tracking-wide hidden sm:table-cell">Canon</th>
            <th className="text-right py-3 px-4 text-xs font-semibold text-film-muted tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cinema-border">
          {movies.map(movie => (
            <tr key={movie.id} className="hover:bg-cinema-surface/50 transition-colors group">
              <td className="py-3 px-4">
                <div className="font-medium text-film-cream leading-tight max-w-[200px] truncate">{movie.title}</div>
                {movie.director && (
                  <div className="text-xs text-film-subtle mt-0.5 truncate max-w-[200px]">{movie.director}</div>
                )}
              </td>
              <td className="py-3 px-3 hidden md:table-cell">
                <span className="text-film-muted">{capitalise(movie.genre)}</span>
              </td>
              <td className="py-3 px-3 hidden lg:table-cell">
                <span className="text-film-muted">{capitalise(movie.language)}</span>
              </td>
              <td className="py-3 px-3 hidden md:table-cell">
                <span className="text-film-muted">{movie.release_year}</span>
              </td>
              <td className="py-3 px-3 text-center">
                <button
                  onClick={() => toggle(movie.id, 'featured', !!movie.featured)}
                  title={movie.featured ? 'Remove from featured' : 'Mark as featured'}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                    movie.featured
                      ? 'text-film-gold hover:text-film-muted'
                      : 'text-cinema-border hover:text-film-gold'
                  }`}
                >
                  <Star className="w-4 h-4" fill={movie.featured ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
              </td>
              <td className="py-3 px-3 text-center hidden sm:table-cell">
                <button
                  onClick={() => toggle(movie.id, 'is_canon', !!movie.is_canon)}
                  title={movie.is_canon ? 'Remove from canon' : 'Add to canon'}
                  className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
                    movie.is_canon
                      ? 'text-film-gold hover:text-film-muted'
                      : 'text-cinema-border hover:text-film-gold'
                  }`}
                >
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </button>
              </td>
              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/admin/movies/${movie.id}/edit`}
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-film-cream hover:bg-cinema-surface transition-colors"
                    title="Edit movie"
                  >
                    <Edit2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                  <button
                    onClick={() => remove(movie.id, movie.title)}
                    disabled={deleting === movie.id}
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-film-muted hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                    title="Delete movie"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
