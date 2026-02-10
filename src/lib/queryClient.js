import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is fresh for 30 seconds, then becomes stale
      staleTime: 30 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Refetch when window regains focus
      refetchOnWindowFocus: true,
      // Refetch when component mounts if data is stale
      refetchOnMount: true,
      // Retry failed requests once
      retry: 1,
    },
  },
})

// Query keys for consistent cache management
export const queryKeys = {
  contracts: ['contracts'],
  contract: (id) => ['contracts', id],
  user: ['user'],
}
