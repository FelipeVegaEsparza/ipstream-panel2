// =====================================================
// Analytics — orquestador de crons
// =====================================================
// Muestreo de audiencia (radio/TV) y recolección de sesiones
// desde el access log de Caddy. Los rollups se agregan aquí.

import { config } from '../config.js'
import { logger } from '../logger.js'
import {
  collectRadioSamples,
  collectViewerSamples,
  collectRadioSessions,
  collectViewerSessions,
} from './collect.js'
import { runHourlyRollup, runDailyRollup } from './rollups.js'

let sampleTimer = null
let sessionTimer = null
let rollupTimer = null

async function runSamples() {
  await Promise.allSettled([collectRadioSamples(), collectViewerSamples()])
}

async function runSessions() {
  await Promise.allSettled([collectRadioSessions(), collectViewerSessions()])
}

export function startAnalyticsCrons() {
  if (sampleTimer) return
  const intervalMs = config.analytics.sampleIntervalMs
  logger.info({ intervalMs }, 'Analytics: crons de muestreo y sesiones iniciados')

  runSamples().catch((err) => logger.error({ err: err.message }, 'Analytics: error en muestreo inicial'))
  runSessions().catch((err) => logger.error({ err: err.message }, 'Analytics: error en sesiones inicial'))

  sampleTimer = setInterval(() => {
    runSamples().catch((err) => logger.error({ err: err.message }, 'Analytics: error en muestreo'))
  }, intervalMs)

  sessionTimer = setInterval(() => {
    runSessions().catch((err) => logger.error({ err: err.message }, 'Analytics: error en sesiones'))
  }, intervalMs)

  runHourlyRollup().catch((err) => logger.error({ err: err.message }, 'Analytics: error en rollup inicial'))
  runDailyRollup().catch((err) => logger.error({ err: err.message }, 'Analytics: error en rollup diario inicial'))
  rollupTimer = setInterval(() => {
    runHourlyRollup().catch((err) => logger.error({ err: err.message }, 'Analytics: error en rollup horario'))
    runDailyRollup().catch((err) => logger.error({ err: err.message }, 'Analytics: error en rollup diario'))
  }, config.analytics.rollupIntervalMs)
}

export function stopAnalyticsCrons() {
  if (sampleTimer) {
    clearInterval(sampleTimer)
    sampleTimer = null
  }
  if (sessionTimer) {
    clearInterval(sessionTimer)
    sessionTimer = null
  }
  if (rollupTimer) {
    clearInterval(rollupTimer)
    rollupTimer = null
  }
}
