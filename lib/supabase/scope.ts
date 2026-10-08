import { AsyncLocalStorage } from 'node:async_hooks'

// Lets a block of code run every database call with one chosen client instead of the visitor's own.
//
// The shared parts of a page (this week's Club film, the featured decks and so on) are the same for everyone, so they are
// fetched once a minute and shared (see lib/home-public.ts). Next.js does not allow a cache to read the visitor's cookies,
// and these queries do not need them, so inside withClient() createClient() hands back a cookie-free client. Nothing
// outside the block is affected.

const store = new AsyncLocalStorage<unknown>()

export const clientOverride = (): unknown => store.getStore()

export const withClient = <T>(client: unknown, fn: () => Promise<T>): Promise<T> => store.run(client, fn)
