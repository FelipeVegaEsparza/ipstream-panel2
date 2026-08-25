// =====================================================
// Instrumentation — tareas de fondo del panel
// =====================================================
// Poller de salud de servidores de streaming: actualiza isHealthy/lastHealthAt
// en DB periódicamente para que la alerta funcione aunque el admin no tenga
// abierto el monitor. NUNCA ejecuta acciones automáticas.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dinámico para no afectar el boot si la DB no está lista aún
    const { startServerHealthPoller } = await import('./lib/server-health-poller')
    startServerHealthPoller()
  }
}
