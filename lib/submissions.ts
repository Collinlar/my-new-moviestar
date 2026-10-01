// Filmmaker submissions and community nominations: the rules for what a form may send.
// The database enforces the same limits; these give people a specific message before they hit it.

import type { Parsed } from '@/lib/parsed'

export const SUBMITTER_ROLES = [
  { key: 'filmmaker',      label: 'Filmmaker' },
  { key: 'producer',       label: 'Producer' },
  { key: 'distributor',    label: 'Distributor' },
  { key: 'studio',         label: 'Studio or production company' },
  { key: 'representative', label: 'Authorised representative' },
  { key: 'other',          label: 'Someone else with the rights' },
] as const
export type SubmitterRole = (typeof SUBMITTER_ROLES)[number]['key']

/** Distinct viewers it takes to flag a film for an editor's attention. A flag is not a listing. */
export const NOMINATION_REVIEW_THRESHOLD = 5
export const MAX_OPEN_SUBMISSIONS = 5

export const SUBMISSION_STATUS_LABELS: Record<string, string> = {
  received: 'Received',
  needs_information: 'We need more from you',
  accepted: 'Accepted for review',
  declined: 'Not taken forward',
}

export interface SubmissionInput {
  title: string
  release_year: number
  country: string
  director: string | null
  synopsis: string
  submitter_role: SubmitterRole
  organisation: string | null
  contact_email: string
  evidence_url: string
  poster_url: string | null
  rights_confirmed: true
}

const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const webUrl = (v: string) => /^https?:\/\/[^\s]+$/i.test(v)
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function parseSubmission(body: any): Parsed<SubmissionInput> {
  const fail = (error: string): Parsed<SubmissionInput> => ({ ok: false, error })

  const title = clean(body?.title, 120)
  if (!title) return fail('What is the film called?')

  const year = Number(body?.release_year)
  const maxYear = new Date().getFullYear() + 2
  if (!Number.isInteger(year) || year < 1900 || year > maxYear) return fail(`Give the year it was released or made, from 1900 to ${maxYear}.`)

  const country = clean(body?.country, 80)
  if (!country) return fail('Which country is the film from?')

  const synopsis = clean(body?.synopsis, 2000)
  if (synopsis.length < 40) return fail('Tell us what the film is about in at least a couple of sentences (40 characters or more).')

  const role = SUBMITTER_ROLES.find((r) => r.key === body?.submitter_role)?.key
  if (!role) return fail('Tell us how you are connected to the film.')

  const contact_email = clean(body?.contact_email, 200)
  if (!EMAIL.test(contact_email)) return fail('Add an email address we can reach you on.')

  const evidence_url = clean(body?.evidence_url, 500)
  if (!webUrl(evidence_url)) return fail('Add a link that shows the film has been released or shown: a YouTube link, a streaming page or a festival page. It has to start with https://')

  const poster_url = clean(body?.poster_url, 500)
  if (poster_url && !webUrl(poster_url)) return fail('The poster link has to start with https://')

  if (body?.rights_confirmed !== true) return fail('Please confirm you own the rights to this film or are authorised to put it forward.')

  return {
    ok: true,
    value: {
      title, release_year: year, country,
      director: clean(body?.director, 120) || null,
      synopsis, submitter_role: role,
      organisation: clean(body?.organisation, 120) || null,
      contact_email, evidence_url,
      poster_url: poster_url || null,
      rights_confirmed: true,
    },
  }
}

export type NominationInput =
  | { kind: 'catalogue'; movie_id: string; reason: string | null }
  | { kind: 'title'; title: string; release_year: number | null; link: string | null; reason: string | null }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseNomination(body: any): Parsed<NominationInput> {
  const reason = clean(body?.reason, 300) || null
  if (typeof body?.movie_id === 'string' && body.movie_id) {
    if (!UUID.test(body.movie_id)) return { ok: false, error: 'That film link is not valid.' }
    return { ok: true, value: { kind: 'catalogue', movie_id: body.movie_id, reason } }
  }

  const title = clean(body?.title, 120)
  if (!title) return { ok: false, error: 'What is the film called?' }

  let release_year: number | null = null
  if (body?.release_year !== undefined && body?.release_year !== null && body?.release_year !== '') {
    const y = Number(body.release_year)
    if (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear() + 2) return { ok: false, error: 'That year does not look right. Leave it blank if you are not sure.' }
    release_year = y
  }

  const link = clean(body?.link, 500)
  if (link && !webUrl(link)) return { ok: false, error: 'The link has to start with https://' }

  return { ok: true, value: { kind: 'title', title, release_year, link: link || null, reason } }
}
