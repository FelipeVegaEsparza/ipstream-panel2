// =====================================================
// Server health poller — ejecuta el health check de servidores
// de streaming en segundo plano (ver instrumentation.ts).
// =====================================================

import { checkAllServers } from './streaming-servers'

const POLL_INTERVAL_MS = 60000 // cada 60s
let started = false
let timer: ReturnType<typeof setInterval> | null = null

export function startServerHealthPoller() {
  if (started) return
  started = true

  const run = async () => {
    try {
      await checkAllServers()
    } catch (err) {
      console.error('[server-health-poller]', err)
    }
  }

  // Primer chequeo poco después del boot
  setTimeout(run, 5000)
  timer = setInterval(run, POLL_INTERVAL_MS)

  // No dejar que el timer impida apagar el proceso
  timer.unref?.()
}

export function stopServerHealthPoller() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  started = false
}
