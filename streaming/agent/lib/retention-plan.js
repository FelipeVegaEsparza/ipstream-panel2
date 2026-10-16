// =====================================================
// Retention — plan por capas (puro, sin DB)
// =====================================================
//   - Datos crudos de analytics: 30 días
//   - Rollups agregados: 24 meses
//   - Tablas legacy (play_history, audit): 90 días

export const RAW_RETENTION_DAYS = 30
export const ROLLUP_RETENTION_DAYS = 730
export const LEGACY_RETENTION_DAYS = 90

export const RETENTION_PLAN = [
  { name: 'listener_samples', dateColumn: 'timestamp', days: RAW_RETENTION_DAYS },
  { name: 'viewer_samples', dateColumn: 'timestamp', days: RAW_RETENTION_DAYS },
  { name: 'listener_sessions', dateColumn: 'startedAt', days: RAW_RETENTION_DAYS },
  { name: 'viewer_sessions', dateColumn: 'startedAt', days: RAW_RETENTION_DAYS },
  { name: 'metrics_hourly', dateColumn: 'bucketStartUtc', days: ROLLUP_RETENTION_DAYS },
  { name: 'metrics_daily', dateColumn: 'dayLocal', days: ROLLUP_RETENTION_DAYS },
  { name: 'play_history', dateColumn: 'playedAt', days: LEGACY_RETENTION_DAYS },
  { name: 'streaming_audit_logs', dateColumn: 'createdAt', days: LEGACY_RETENTION_DAYS },
]

/**
 * Instante de corte para una ventana de retención.
 */
export function retentionCutoff(days, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
