import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isSameMonth,
  isSameYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
} from 'date-fns'
import { it } from 'date-fns/locale'

const LOCALE = { locale: it }

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : parseISO(value)
}

/** `485` -> `8h 05m`. Durations always read the same way across the app. */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const mins = total % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${String(mins).padStart(2, '0')}m`
}

/** Decimal hours for exports and billing rows: `485` -> `8,08`. */
export function formatHoursDecimal(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—'
  return (minutes / 60).toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return format(toDate(value), 'd MMM yyyy', LOCALE)
}

export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  const now = new Date()
  if (isSameYear(date, now)) return format(date, 'd MMM', LOCALE)
  return format(date, 'd MMM yy', LOCALE)
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return format(toDate(value), "d MMM yyyy 'alle' HH:mm", LOCALE)
}

export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return format(toDate(value), 'HH:mm', LOCALE)
}

/** `14:30:00` (a SQL `time`) -> `14:30`. */
export function formatSqlTime(value: string | null | undefined): string {
  if (!value) return '—'
  return value.slice(0, 5)
}

export function formatWeekday(value: string | Date): string {
  return format(toDate(value), 'EEEE', LOCALE)
}

export function formatWeekdayShort(value: string | Date): string {
  return format(toDate(value), 'EEE', LOCALE)
}

/** `Oggi`, `Ieri`, `Domani`, otherwise a short date. */
export function formatRelativeDay(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = toDate(value)
  if (isToday(date)) return 'Oggi'
  if (isTomorrow(date)) return 'Domani'
  if (isYesterday(date)) return 'Ieri'
  return formatDateShort(date)
}

/** `3 giorni fa` — used in timelines and comment metadata. */
export function formatTimeAgo(value: string | Date | null | undefined): string {
  if (!value) return '—'
  return formatDistanceToNowStrict(toDate(value), { addSuffix: true, locale: it })
}

/** Signed day distance from today; negative means overdue. */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null
  return differenceInCalendarDays(toDate(value), new Date())
}

/** Human due-date label with an explicit overdue wording. */
export function formatDueDate(value: string | null | undefined): {
  label: string
  tone: 'neutral' | 'warning' | 'danger'
} {
  if (!value) return { label: '—', tone: 'neutral' }
  const diff = daysUntil(value)
  if (diff === null) return { label: '—', tone: 'neutral' }
  if (diff < -1) return { label: `${Math.abs(diff)} giorni di ritardo`, tone: 'danger' }
  if (diff === -1) return { label: 'Scaduto ieri', tone: 'danger' }
  if (diff === 0) return { label: 'Scade oggi', tone: 'warning' }
  if (diff === 1) return { label: 'Scade domani', tone: 'warning' }
  if (diff <= 7) return { label: `Tra ${diff} giorni`, tone: 'neutral' }
  return { label: formatDateShort(value), tone: 'neutral' }
}

/** `6 – 10 ottobre 2025` / `29 settembre – 3 ottobre 2025`. */
export function formatDateRange(from: Date, to: Date): string {
  if (isSameMonth(from, to)) {
    return `${format(from, 'd', LOCALE)} – ${format(to, 'd MMMM yyyy', LOCALE)}`
  }
  if (isSameYear(from, to)) {
    return `${format(from, 'd MMM', LOCALE)} – ${format(to, 'd MMM yyyy', LOCALE)}`
  }
  return `${formatDateShort(from)} – ${formatDateShort(to)}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('it-IT')
}

export function formatPercent(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${(value * 100).toLocaleString('it-IT', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}%`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** ISO date (`2025-10-06`) used for `date` columns and query keys. */
export function toISODate(value: Date): string {
  return format(value, 'yyyy-MM-dd')
}

/** `08:30` -> minutes from midnight. */
export function timeToMinutes(value: string): number {
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

/** Minutes from midnight -> `08:30`. */
export function minutesToTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}
