'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CACHE } from '@/config/app'

/**
 * One QueryClient per browser session.
 *
 * Defaults are deliberately conservative: operational lists stay fresh for a
 * minute, nothing refetches on window focus (this is a tool people keep open
 * all day — refetching on every tab switch would hammer the database for no
 * visible benefit), and retries stop at one so a failing permission surfaces
 * immediately instead of after four round trips.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CACHE.operational.staleTime,
        gcTime: CACHE.operational.gcTime,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const code = (error as { code?: string } | null)?.code
          if (code === '42501' || code === 'PGRST301' || code === 'PGRST205') return false
          return failureCount < 1
        },
      },
      mutations: {
        retry: 0,
      },
    },
  })
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
