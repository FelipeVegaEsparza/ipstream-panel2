import { useQuery } from '@tanstack/react-query'
import { getAllClientData } from '@/core/api'
import type { FullClientData } from '@/core/types'

export function useFullClientData(clientId: string) {
  return useQuery<FullClientData>({
    queryKey: ['fullClientData', clientId],
    queryFn: () => getAllClientData(clientId),
    enabled: Boolean(clientId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1
  })
}
