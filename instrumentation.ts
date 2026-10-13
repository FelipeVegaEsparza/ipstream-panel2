// =====================================================
// Instrumentation — tareas de fondo del panel
// =====================================================
// Poller de salud de servidores de streaming: actualiza isHealthy/lastHealthAt
// en DB periódicamente para que la alerta funcione aunque el admin no tenga
// abierto el monitor. NUNCA ejecuta acciones automáticas.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Con cluster, solo el worker dueño del poller lo arranca (PANEL_POLLER=1).
    // En modo de un solo proceso (sin la variable) se mantiene encendido.
    if (process.env.PANEL_POLLER === '0') return
    // Dinámico para no afectar el boot si la DB no está lista aún
    const { startServerHealthPoller } = await import('./lib/server-health-poller')
    startServerHealthPoller()
  }
}
