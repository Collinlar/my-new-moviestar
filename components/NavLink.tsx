'use client'

import Link, { useLinkStatus } from 'next/link'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Link> & {
  /**
   * For links that look like buttons: they press in when touched, and show a small ring while the page is on the way.
   * Plain links (rows, chips, text links) only dim, so nothing moves or changes size.
   */
  button?: boolean
  /** What a button-link says while its page is on the way, e.g. "Opening Swipe...". */
  pendingLabel?: string
}

/** Sits inside the Link so it can read that link's own navigation status. */
function Inner({ button, pendingLabel, children }: { button?: boolean; pendingLabel?: string; children: React.ReactNode }) {
  const { pending } = useLinkStatus()
  return (
    <>
      {pending && pendingLabel ? pendingLabel : children}
      {pending && <span className="ms-pending-mark" hidden />}
      {pending && button && <span className="ms-ring" aria-hidden="true" />}
      {pending && <span className="sr-only" role="status">Opening the page</span>}
    </>
  )
}

/**
 * A link that answers the tap straight away. Every NavLink dims the moment its page is being fetched. A button-link
 * also presses in and shows a ring, and can name what is happening ("Opening the Club..."). Use it for navigation
 * you want to feel instant. Poster cards in long lists stay plain links: the top progress bar covers them.
 */
export function NavLink({ button, pendingLabel, children, className, ...props }: Props) {
  const classes = ['ms-nav', button ? 'ms-press' : '', className].filter(Boolean).join(' ')
  return (
    <Link {...props} className={classes}>
      <Inner button={button} pendingLabel={pendingLabel}>{children}</Inner>
    </Link>
  )
}
