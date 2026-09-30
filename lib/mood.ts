// Mood slug -> deck filter + display metadata.
// Genres in the database are lowercase. Most films are YouTube imports that default to
// "drama", so the real signal for comedy, thriller and romance often sits in the title,
// keywords or description. A film matches a mood when its genre is listed OR any term
// appears in those text fields. Industry and year rules narrow the result.

export interface MoodQuery {
  genres?: string[]
  terms?: string[]
  industries?: string[]
  notIndustries?: string[]
  yearFrom?: number
  yearTo?: number
  // 0 to 1. How much random exploration to mix in over taste and popularity.
  explore?: number
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
    query: { genres: ['comedy'], terms: ['comedy', 'funny', 'hilarious'] },
  },
  thriller: {
    slug: 'thriller',
    label: 'Keep me guessing',
    tagline: 'Thrillers, mysteries and edge-of-seat crime',
    chipBg: '#1D2D3A', chipText: '#8FA8C8',
    query: { genres: ['thriller', 'horror', 'action'], terms: ['thriller', 'mystery', 'suspense', 'crime'] },
  },
  romance: {
    slug: 'romance',
    label: 'Give me butterflies',
    tagline: 'Romance and love stories',
    chipBg: '#3A1520', chipText: '#E0735A',
    query: { genres: ['romance'], terms: ['romance', 'love story'] },
  },
  drama: {
    slug: 'drama',
    label: 'Gut punch',
    tagline: 'Drama that hits hard',
    chipBg: '#231C14', chipText: '#D8CFC0',
    query: { genres: ['drama'], terms: ['tragedy', 'betrayal', 'heartbreak', 'revenge'] },
  },
  nollywood: {
    slug: 'nollywood',
    label: 'Night in Nigeria',
    tagline: 'Nollywood cinema',
    chipBg: '#1A1D0E', chipText: '#7FA88B',
    query: { industries: ['Nollywood', 'Nollywood Yoruba'] },
  },
  obg: {
    slug: 'obg',
    label: 'Old but Gold',
    tagline: 'Films from before 2010',
    chipBg: '#201510', chipText: '#C8963E',
    query: { yearTo: 2010, explore: 0.2 },
  },
  performance: {
    slug: 'performance',
    label: 'Great performances',
    tagline: 'Films built on acting',
    chipBg: '#0F2230', chipText: '#8FA8C8',
    query: { genres: ['drama', 'historical'], terms: ['performance', 'acting', 'actress'], explore: 0.3 },
  },
  discover: {
    slug: 'discover',
    label: 'Something different',
    tagline: 'Beyond Nollywood, off the beaten path',
    chipBg: '#1C1230', chipText: '#D9A6B3',
    query: { notIndustries: ['Nollywood', 'Nollywood Yoruba'], explore: 1 },
  },
}
