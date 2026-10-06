import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware class merge used by every component. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** `Mario Rossi` -> `MR`, `mario@example.com` -> `MA`. */
export function initials(name: string | null | undefined, fallback = '?'): string {
  const source = (name ?? '').trim()
  if (!source) return fallback
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  if (parts.length === 0) return fallback
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** URL-safe organization identifier derived from a display name. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '')
}

/** Stable, deterministic tone for an identifier — used for avatar fills. */
export function toneFromId(id: string): 'brand' | 'info' | 'success' | 'warning' | 'danger' {
  const tones = ['brand', 'info', 'success', 'warning', 'danger'] as const
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 100000
  }
  return tones[hash % tones.length]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Debounce for input-driven queries. Returns a cancellable function. */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
): ((...args: Args) => void) & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
  }
  return wrapped
}

/** PostgREST `or` filters need commas escaped inside the pattern. */
export function escapeFilterValue(value: string): string {
  return value.replace(/[,()]/g, ' ').trim()
}

export function isNonEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/** Groups rows by a key, preserving insertion order. */
export function groupBy<T, K extends string | number>(
  items: readonly T[],
  key: (item: T) => K,
): Map<K, T[]> {
  const result = new Map<K, T[]>()
  for (const item of items) {
    const group = key(item)
    const existing = result.get(group)
    if (existing) existing.push(item)
    else result.set(group, [item])
  }
  return result
}

/** Builds a `?a=1&b=2` string, dropping empty values. */
export function toSearchParams(input: Record<string, string | number | boolean | undefined | null>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  return params
}
