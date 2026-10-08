import { useQuery } from '@tanstack/react-query'
import { getStreamingStatus } from '@/core/api'
import type { StreamingStatus } from '@/core/types'

export function useStreamingStatus(clientId: string) {
  return useQuery<StreamingStatus>({
    queryKey: ['streamingStatus', clientId],
    queryFn: () => getStreamingStatus(clientId),
    enabled: Boolean(clientId),
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry: 1
  })
}
