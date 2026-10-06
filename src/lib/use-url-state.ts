'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Keeps list state (filters, page, open drawer) in the URL.
 *
 * Three reasons this is not component state: the view is shareable, the back
 * button works, and a refresh does not reset someone's filters mid-task.
 * Updates use `replace` with `scroll: false` so the scroll position in a long
 * table survives a filter change.
 */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParams = React.useCallback(
    (
      updates: Record<string, string | string[] | number | boolean | null | undefined>,
      options?: { resetPage?: boolean },
    ) => {
      const params = new URLSearchParams(searchParams.toString())

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === '' ) {
          params.delete(key)
          continue
        }
        if (Array.isArray(value)) {
          if (value.length === 0) params.delete(key)
          else params.set(key, value.join(','))
          continue
        }
        params.set(key, String(value))
      }

      if (options?.resetPage) params.delete('page')

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const getList = React.useCallback(
    (key: string): string[] => {
      const raw = searchParams.get(key)
      if (!raw) return []
      return raw.split(',').filter(Boolean)
    },
    [searchParams],
  )

  const getNumber = React.useCallback(
    (key: string, fallback: number): number => {
      const raw = searchParams.get(key)
      if (!raw) return fallback
      const parsed = Number(raw)
      return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
    },
    [searchParams],
  )

  return { searchParams, setParams, getList, getNumber }
}

/**
 * True only after hydration.
 *
 * Needed by every overlay whose open state comes from the URL. During the
 * server render `useSearchParams()` is empty, so the panel renders closed; on
 * the client it is already `?new=1`, so the first client render says open.
 * React reconciles the two without ever running an open *transition*, and the
 * portal never mounts — the deep link silently does nothing.
 *
 * Gating on this hook forces the honest sequence: closed on the first render
 * (matching the server), open on the next.
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = React.useState(false)
  React.useEffect(() => setHydrated(true), [])
  return hydrated
}

/**
 * Debounced mirror of a URL-backed text filter: the input stays responsive
 * while the query (and the URL) only updates once typing settles.
 */
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
