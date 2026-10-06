import type { Transition, Variants } from 'framer-motion'

/**
 * Motion vocabulary.
 *
 * Motion in Work-Hub answers one of three questions: *where did this come
 * from*, *what just changed*, *is something happening*. Anything that answers
 * none of them is removed.
 *
 * All values are kept in sync with the duration/easing tokens in
 * `src/config/tokens.ts`; Framer Motion needs seconds and cubic-bezier arrays,
 * so they are restated here in that shape.
 */

export const EASE = {
  standard: [0.2, 0, 0, 1],
  exit: [0.4, 0, 1, 1],
  inout: [0.4, 0, 0.2, 1],
} as const

export const DURATION = {
  instant: 0.08,
  fast: 0.14,
  standard: 0.18,
  moderate: 0.22,
  slow: 0.26,
} as const

export const transition = {
  micro: { duration: DURATION.fast, ease: EASE.standard },
  standard: { duration: DURATION.standard, ease: EASE.standard },
  enter: { duration: DURATION.moderate, ease: EASE.standard },
  exit: { duration: DURATION.fast, ease: EASE.exit },
  drawer: { duration: DURATION.slow, ease: EASE.standard },
  drawerExit: { duration: DURATION.moderate, ease: EASE.exit },
} satisfies Record<string, Transition>

/** Page / route content: fade with a 6px lift. Never slides sideways. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: DURATION.moderate, ease: EASE.standard } },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast, ease: EASE.exit } },
}

/** Modal panel: fade + max 8px translate. */
export const modalVariants: Variants = {
  initial: { opacity: 0, y: 8, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1, transition: transition.enter },
  exit: { opacity: 0, y: 4, scale: 0.995, transition: transition.exit },
}

/** Scrim behind modals and drawers. */
export const scrimVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DURATION.standard, ease: EASE.standard } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE.exit } },
}

/** Side drawer: translateX only, GPU friendly, interruptible. */
export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: transition.drawer },
  exit: { x: '100%', transition: transition.drawerExit },
}

/** Bottom sheet used on mobile instead of the side drawer. */
export const sheetVariants: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: transition.drawer },
  exit: { y: '100%', transition: transition.drawerExit },
}

/** Popovers, dropdowns, command palette results. */
export const popoverVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: transition.micro },
  exit: { opacity: 0, y: -2, scale: 0.99, transition: { duration: DURATION.instant } },
}

/** Toasts slide up from the bottom edge. */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: transition.enter },
  exit: { opacity: 0, y: 8, transition: transition.exit },
}

/**
 * Staggered list reveal, used only the first time a list paints (never on
 * refetch) and capped so long tables do not animate 200 rows.
 */
export const listVariants: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.018, delayChildren: 0.02 } },
}

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: transition.standard },
}

/** Value that just changed: a one-shot, 140ms acknowledgement. */
export const acknowledgeVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: { opacity: 1, transition: transition.micro },
}

/** Collapsible height animation (sidebar groups, ticket sections). */
export const collapseTransition: Transition = {
  duration: DURATION.moderate,
  ease: EASE.inout,
}
