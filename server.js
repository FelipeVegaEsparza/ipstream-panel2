// =====================================================
// IPStream Panel — launcher de cluster (Node)
// =====================================================
// Lanza N workers que comparten el puerto, para aprovechar varios núcleos de
// CPU sin cambiar la topología de deploy (un contenedor, Caddy, deploy.sh).
//
// - Cantidad de workers: WEB_CONCURRENCY (default: CPUs - 1, tope 16).
// - Solo el worker index 0 corre el poller de salud (PANEL_POLLER=1); el resto
//   recibe PANEL_POLLER=0 para no duplicar tareas de fondo.
// - El primario reinicia workers que mueran y reenvía SIGTERM/SIGINT.

const cluster = require('cluster')
const http = require('http')
const os = require('os')

const port = parseInt(process.env.PORT || '3000', 10)

function resolveWorkers() {
  const cpus = (os.cpus() || []).length || 1
  const fromEnv = parseInt(process.env.WEB_CONCURRENCY || '0', 10)
  const n = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : Math.max(1, cpus - 1)
  return Math.min(Math.max(1, n), 16)
}

if (cluster.isPrimary) {
  const workers = resolveWorkers()
  const cpus = (os.cpus() || []).length || 1
  console.log(`[cluster] primary pid=${process.pid} cpus=${cpus} workers=${workers}`)

  const fork = (index) => {
    cluster.fork({
      WORKER_INDEX: String(index),
      PANEL_POLLER: index === 0 ? '1' : '0',
    })
  }

  for (let i = 0; i < workers; i++) fork(i)

  let shuttingDown = false
  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`[cluster] recibido ${signal}; apagando workers...`)
    for (const id in cluster.workers) {
      cluster.workers[id].kill('SIGTERM')
    }
    setTimeout(() => process.exit(0), 10000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  cluster.on('exit', (worker, code, signal) => {
    const index = parseInt(worker.process.env.WORKER_INDEX || '0', 10)
    console.error(`[cluster] worker ${worker.process.pid} (index ${index}) salió (${signal || code})`)
    if (!shuttingDown) fork(index)
  })
} else {
  const next = require('next')
  const app = next({ dev: false })
  const handle = app.getRequestHandler()

  app
    .prepare()
    .then(() => {
      http
        .createServer((req, res) => handle(req, res))
        .listen(port, () => {
          console.log(
            `[cluster] worker pid=${process.pid} index=${process.env.WORKER_INDEX || '?'} escuchando en :${port}`
          )
        })
    })
    .catch((err) => {
      console.error('[cluster] error preparando Next:', err)
      process.exit(1)
    })
}
