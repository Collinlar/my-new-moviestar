// Mood slug → browseMovies query options + display metadata

interface MoodQuery {
  genre?: string
  industry?: string
  yearFrom?: number
  yearTo?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface MoodConfig {
  slug: string
  label: string
  tagline: string
  chipBg: string
  chipText: string
  query: MoodQuery
}

export const MOOD_MAP: Record<string, MoodConfig> = {
  laugh: {
    slug: 'laugh',
    label: 'Make me laugh',
    tagline: 'Comedy from across Africa',
    chipBg: '#2C1A0E', chipText: '#E8A530',
    query: { genre: 'Comedy', sortBy: 'review_count', sortOrder: 'desc' },
  },
  thriller: {
    slug: 'thriller',
    label: 'Keep me guessing',
    tagline: 'Thrillers and mysteries',
    chipBg: '#1D2D3A', chipText: '#8FA8C8',
    query: { genre: 'Thriller', sortBy: 'review_count', sortOrder: 'desc' },
  },
  romance: {
    slug: 'romance',
    label: 'Give me butterflies',
    tagline: 'Romance and love stories',
    chipBg: '#3A1520', chipText: '#E0735A',
    query: { genre: 'Romance', sortBy: 'review_count', sortOrder: 'desc' },
  },
  drama: {
    slug: 'drama',
    label: 'Gut punch',
    tagline: 'Drama that hits hard',
    chipBg: '#231C14', chipText: '#D8CFC0',
    query: { genre: 'Drama', sortBy: 'review_count', sortOrder: 'desc' },
  },
  nollywood: {
    slug: 'nollywood',
    label: 'Night in Nigeria',
    tagline: 'Nollywood cinema',
    chipBg: '#1A1D0E', chipText: '#7FA88B',
    query: { industry: 'Nollywood', sortBy: 'review_count', sortOrder: 'desc' },
  },
  obg: {
    slug: 'obg',
    label: 'Old but Gold',
    tagline: 'Classics before 2000',
    chipBg: '#201510', chipText: '#C8963E',
    query: { yearTo: 2000, sortBy: 'review_count', sortOrder: 'desc' },
  },
  performance: {
    slug: 'performance',
    label: 'Great performances',
    tagline: 'Films built on acting',
    chipBg: '#0F2230', chipText: '#8FA8C8',
    query: { genre: 'Drama', sortBy: 'average_rating', sortOrder: 'desc' },
  },
  discover: {
    slug: 'discover',
    label: 'Something different',
    tagline: 'Off the beaten path',
    chipBg: '#1C1230', chipText: '#D9A6B3',
    query: { sortBy: 'created_at', sortOrder: 'desc' },
  },
}
