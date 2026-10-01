export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string }

export function parseErrorMessage<T>(result: Parsed<T>): string | null {
  if ('error' in result) return result.error
  return null
}

export function parseSuccessValue<T>(result: Parsed<T>): T {
  if ('value' in result) return result.value
  throw new Error('Expected a successful parse result.')
}
