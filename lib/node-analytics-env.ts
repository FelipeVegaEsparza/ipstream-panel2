/**
 * Variables de analítica que el panel escribe en el .env de cada nodo.
 * En un nodo el Caddy escribe radio y TV en el mismo access log, a diferencia
 * del servidor principal (radio en stream-access.log).
 */
export const NODE_ANALYTICS_ENV = {
  ANALYTICS_CADDY_CONTAINER: 'ipstream-caddy',
  ANALYTICS_RADIO_LOG: '/data/access.log',
  ANALYTICS_VIDEO_LOG: '/data/access.log',
} as const

export function nodeAnalyticsEnv(
  overrides: { tailBytes?: string; sessionGapSeconds?: string } = {}
): Record<string, string> {
  return {
    ...NODE_ANALYTICS_ENV,
    ANALYTICS_LOG_TAIL_BYTES: overrides.tailBytes || '5000000',
    ANALYTICS_TV_SESSION_GAP_SECONDS: overrides.sessionGapSeconds || '300',
  }
}
