/**
 * Application-level constants: naming, pagination limits, calendar bounds and
 * cache windows. Keeping them here makes the performance budget explicit and
 * reviewable in one place (see PERFORMANCE.md).
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'Work-Hub'

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

/** Cookie holding the organization active in the current session. */
export const ACTIVE_ORG_COOKIE = 'wh_active_org'

/** Cookie holding the sidebar collapsed preference (read during SSR). */
export const SIDEBAR_COOKIE = 'wh_sidebar'

/** Page sizes. Every list is paginated; nothing is ever fetched unbounded. */
export const PAGE_SIZE = {
  tickets: 25,
  clients: 25,
  timeEntries: 50,
  members: 50,
  auditLogs: 50,
  comments: 50,
  notifications: 20,
  searchResults: 6,
} as const

/** Above this row count the table switches to a virtualized body. */
export const VIRTUALIZE_THRESHOLD = 60

/** TanStack Query cache windows, in milliseconds. */
export const CACHE = {
  /** Reference data that rarely changes (taxonomy, members, clients lookup). */
  reference: { staleTime: 10 * 60_000, gcTime: 30 * 60_000 },
  /** Operational lists (tickets, calendar, time entries). */
  operational: { staleTime: 60_000, gcTime: 10 * 60_000 },
  /** Aggregations shown on dashboard and reports. */
  analytics: { staleTime: 5 * 60_000, gcTime: 15 * 60_000 },
  /** Anything typed by the user right now (global search). */
  volatile: { staleTime: 30_000, gcTime: 2 * 60_000 },
} as const

/** Working week shown in the calendar: Monday–Friday, 08:00–18:00. */
export const CALENDAR = {
  /** 1 = Monday (date-fns weekStartsOn). */
  weekStartsOn: 1,
  /** Number of columns rendered (Mon–Fri). */
  days: 5,
  dayStartHour: 8,
  dayEndHour: 18,
  /** Grid resolution in minutes — drives snapping and row height. */
  slotMinutes: 30,
  /** Pixel height of one slot on desktop. */
  slotHeight: 36,
  /** Smallest event duration the UI will create. */
  minEventMinutes: 15,
} as const

export const CALENDAR_HOURS: number[] = Array.from(
  { length: CALENDAR.dayEndHour - CALENDAR.dayStartHour },
  (_, index) => CALENDAR.dayStartHour + index,
)

/** Upload limits, enforced client-side and documented for storage policies. */
export const UPLOAD = {
  avatarMaxBytes: 2 * 1024 * 1024,
  logoMaxBytes: 2 * 1024 * 1024,
  attachmentMaxBytes: 10 * 1024 * 1024,
  maxAttachmentsPerTicket: 20,
  imageMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
} as const

/** Invite links are valid for this many days. */
export const INVITE_TTL_DAYS = 14

export const DEFAULT_WORKDAY_MINUTES = 480
