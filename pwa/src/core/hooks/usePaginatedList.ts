import { useQuery } from '@tanstack/react-query'
import type { PaginatedResponse } from '@/core/types'

export function usePaginatedList<T>(
  clientId: string | null,
  key: string,
  fetcher: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  page: number,
  limit = 12
) {
  return useQuery({
    queryKey: [key, clientId, page, limit],
    queryFn: () => fetcher(page, limit),
    enabled: Boolean(clientId),
    placeholderData: (previous) => previous,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1
  })
}
