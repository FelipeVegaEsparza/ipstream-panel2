import { useQuery } from '@tanstack/react-query'
import { getStreaming } from '@/core/api'
import type { Streaming } from '@/core/types'

interface UseStreamingOptions {
  /** Permite desactivar el polling (p. ej. en clientes solo TV). */
  enabled?: boolean
}

export function useStreaming(
  clientId: string,
  options: UseStreamingOptions = {}
) {
  const enabled = options.enabled ?? true
  return useQuery<Streaming>({
    queryKey: ['streaming', clientId],
    queryFn: () => getStreaming(clientId),
    enabled: Boolean(clientId) && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1
  })
}
