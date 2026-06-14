import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalise(str: string) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function formatRating(rating: number) {
  return rating ? rating.toFixed(1) : '—'
}

export function formatYear(year: number) {
  return year ? String(year) : ''
}

export function truncate(str: string, length: number) {
  if (!str || str.length <= length) return str
  return str.slice(0, length).trimEnd() + '…'
}

export function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const SITE_URL = 'https://muviestars.com'
export const SITE_NAME = 'MuvieStars'

// Must match the movie_genre ENUM in Supabase exactly
export const GENRES = [
  'drama', 'comedy', 'action', 'romance', 'thriller',
  'horror', 'adventure', 'family', 'documentary', 'musical', 'historical',
]

// Must match the movie_language ENUM in Supabase exactly (see migration 20260613000002)
export const LANGUAGES = [
  // West Africa
  'english', 'french', 'yoruba', 'igbo', 'hausa', 'twi', 'wolof', 'pidgin',
  // East Africa
  'swahili', 'amharic', 'somali', 'luganda',
  // North Africa
  'arabic',
  // Southern / Central Africa
  'zulu', 'afrikaans', 'portuguese', 'lingala', 'shona',
  // Catch-all
  'other',
]

export const LANGUAGE_META: Record<string, string> = {
  english:    'West Africa · Diaspora',
  french:     'Francophone Africa',
  arabic:     'North Africa · Egypt',
  yoruba:     'Nigeria · Benin',
  igbo:       'Nigeria',
  hausa:      'Nigeria · Niger · Chad',
  twi:        'Ghana',
  wolof:      'Senegal · Gambia',
  pidgin:     'Nigeria',
  swahili:    'East Africa',
  amharic:    'Ethiopia',
  somali:     'Somalia · Djibouti',
  luganda:    'Uganda',
  zulu:       'South Africa',
  afrikaans:  'South Africa',
  portuguese: 'Angola · Mozambique',
  lingala:    'DRC · Congo',
  shona:      'Zimbabwe',
  other:      '',
}

// African film industries — stored in movies.industry
export const INDUSTRIES = [
  'Nollywood',
  'Ghallywood',
  'Nollywood Yoruba',
  'Francophone',
  'South African',
  'East African',
  'North African',
  'Wakaliwood',
  'Diaspora',
  'Other',
] as const

export type Industry = typeof INDUSTRIES[number]

export const INDUSTRY_META: Record<string, { region: string; description: string }> = {
  'Nollywood':       { region: 'Nigeria',           description: "The world's second-largest film industry" },
  'Ghallywood':      { region: 'Ghana',             description: 'Afrocentric stories from West Africa' },
  'Nollywood Yoruba':{ region: 'Nigeria',           description: 'Yoruba-language cinema from Lagos and beyond' },
  'Francophone':     { region: 'West & Central Africa', description: 'French-language African cinema' },
  'South African':   { region: 'South Africa',      description: 'Diverse stories from the Cape to Johannesburg' },
  'East African':    { region: 'Kenya · Ethiopia · Tanzania', description: 'Rising cinema from East Africa' },
  'North African':   { region: 'Egypt · Morocco · Algeria', description: 'The Maghreb and Nile Valley on film' },
  'Wakaliwood':      { region: 'Uganda',            description: "Uganda's action-packed grassroots industry" },
  'Diaspora':        { region: 'Worldwide',         description: 'African stories told from across the globe' },
}

export const STREAMING_PLATFORMS = [
  'Netflix', 'Showmax', 'Amazon Prime Video', 'YouTube',
  'IrokoTV', 'Nollyflex', 'Apple TV+', 'Disney+', 'Other',
]

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M+`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K+`
  return String(n)
}
