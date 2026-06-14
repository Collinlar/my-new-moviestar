import Link from 'next/link'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { cn, capitalise, formatRating } from '@/lib/utils'

interface MovieCardProps {
  id: string
  title: string
  release_year: number
  genre: string
  language?: string
  poster_url?: string
  average_rating?: number
  review_count?: number
  director?: string
  isCanon?: boolean
  className?: string
}

export function MovieCard({
  id, title, release_year, genre, language,
  poster_url, average_rating, review_count,
  director, isCanon, className,
}: MovieCardProps) {
  return (
    <Link
      href={`/movie/${id}`}
      className={cn('cinema-card group block', className)}
      title={`${title} (${release_year})`}
    >
      {/* Poster */}
      <div className="poster-wrap">
        {poster_url ? (
          <Image
            src={poster_url}
            alt={`${title} movie poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-cinema-surface">
            <span className="text-4xl opacity-20">🎬</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-cinema-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <span className="text-xs text-film-cream font-medium line-clamp-2">{title}</span>
        </div>

        {/* Canon badge */}
        {isCanon && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-film-gold text-cinema-black uppercase tracking-wider">
            Canon
          </div>
        )}

        {/* Rating chip */}
        {average_rating != null && average_rating > 0 && (
          <div className="absolute top-2 right-2 rating-badge">
            <Star className="w-3 h-3 fill-current" aria-hidden="true" />
            <span>{formatRating(average_rating)}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-film-cream line-clamp-1 group-hover:text-film-gold transition-colors">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-film-muted">
          <span>{release_year}</span>
          <span aria-hidden="true">·</span>
          <span>{capitalise(genre)}</span>
          {language && (
            <>
              <span aria-hidden="true">·</span>
              <span>{capitalise(language)}</span>
            </>
          )}
        </div>
        {director && (
          <p className="text-xs text-film-subtle line-clamp-1">dir. {director}</p>
        )}
        {review_count != null && review_count > 0 && (
          <p className="text-xs text-film-subtle">
            {review_count.toLocaleString()} {review_count === 1 ? 'review' : 'reviews'}
          </p>
        )}
      </div>
    </Link>
  )
}

/* Wide / horizontal variant */
export function MovieCardWide({
  id, title, release_year, genre, language,
  poster_url, average_rating, review_count,
  director, className,
}: MovieCardProps) {
  return (
    <Link
      href={`/movie/${id}`}
      className={cn(
        'cinema-card group flex gap-4 p-3',
        className
      )}
      title={`${title} (${release_year})`}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-20 rounded overflow-hidden bg-cinema-surface"
           style={{ aspectRatio: '2/3' }}>
        {poster_url ? (
          <Image
            src={poster_url}
            alt={`${title} poster`}
            fill
            sizes="80px"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl opacity-20">🎬</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        <div>
          <h3 className="text-sm font-semibold text-film-cream line-clamp-2 group-hover:text-film-gold transition-colors">
            {title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-1.5 mt-1 text-xs text-film-muted">
            <span>{release_year}</span>
            <span aria-hidden="true">·</span>
            <span>{capitalise(genre)}</span>
            {language && (
              <>
                <span aria-hidden="true">·</span>
                <span>{capitalise(language)}</span>
              </>
            )}
          </div>
          {director && (
            <p className="text-xs text-film-subtle mt-1">dir. {director}</p>
          )}
        </div>

        {average_rating != null && average_rating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-3 h-3 text-film-amber fill-current" aria-hidden="true" />
            <span className="text-xs font-semibold text-film-amber">{formatRating(average_rating)}</span>
            {review_count != null && (
              <span className="text-xs text-film-subtle">({review_count})</span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
