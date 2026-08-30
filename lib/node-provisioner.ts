// =====================================================
// Node provisioner — provisioning automático de nodos vía SSH
// =====================================================
// El panel guarda la clave SSH (encriptada), genera el .env del nodo,
// sube el código (streaming + compose) y levanta el stack por su cuenta.
// El trabajo corre en segundo plano y reporta progreso a la DB.
//
// Además del provisioning inicial, soporta ACTUALIZAR un nodo ya
// provisionado: re-descarga el código del repo, lo copia al nodo,
// re-escribe .env/Caddyfile/override y levanta el stack con --build.

import { prisma } from '@/lib/prisma'
import { decrypt } from './encryption'
import { sshExec, sftpWrite, SshConfig } from './ssh'
import crypto from 'crypto'

const REPO_TARBALL = 'https://github.com/FelipeVegaEsparza/ipstream-panel2/archive/refs/heads/main.tar.gz'
const NODE_DIR = '/opt/ipstream-node'
const MAX_LOG_LINES = 200

const activeJobs = new Map<string, Promise<void>>()

export function isProvisioning(serverId: string): boolean {
  return activeJobs.has(serverId)
}

async function setProgress(
  serverId: string,
  step: string,
  line: string,
  error: string | null = null
) {
  const server = await prisma.streamingServer.findUnique({
    where: { id: serverId },
    select: { provisionLog: true },
  })
  const log: string[] = Array.isArray(server?.provisionLog)
    ? (server.provisionLog as unknown as string[])
    : []
  log.push(line)
  while (log.length > MAX_LOG_LINES) log.shift()

  await prisma.streamingServer.update({
    where: { id: serverId },
    data: {
      provisionStep: step,
      provisionLog: log as any,
      provisionError: error,
      provisionStatus: error ? 'failed' : undefined,
    },
  })
}

function panelHost(): string {
  if (process.env.PANEL_PUBLIC_HOST) return process.env.PANEL_PUBLIC_HOST
  try {
    const u = process.env.NEXTAUTH_URL || ''
    return new URL(u).hostname || 'localhost'
  } catch {
    return 'localhost'
  }
}

function dbCreds(): { user: string; password: string; database: string } {
  const url = process.env.DATABASE_URL || ''
  try {
    const u = new URL(url)
    return {
      user: decodeURIComponent(u.username) || process.env.MYSQL_USER || 'ipstream',
      password: decodeURIComponent(u.password) || process.env.MYSQL_PASSWORD || '',
      database: (u.pathname || '').replace(/^\//, '') || process.env.MYSQL_DATABASE || 'ipstream_panel',
    }
  } catch {
    return {
      user: process.env.MYSQL_USER || 'ipstream',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'ipstream_panel',
    }
  }
}

function buildNodeEnv(server: {
  publicHostname: string
  sshHost: string
  tokenEnc: string
}): string {
  const token = decrypt(server.tokenEnc)
  const db = dbCreds()
  const rand = (len = 16) => crypto.randomBytes(len).toString('hex')
  const env: Record<string, string> = {
    NODE_ENV: 'production',
    DB_HOST: panelHost(),
    DB_PORT: '3307',
    DB_USER: db.user,
    DB_PASSWORD: db.password,
    DB_DATABASE: db.database,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '',
    STREAMING_AGENT_TOKEN: token,
    HARBOR_CALLBACK_SECRET: process.env.HARBOR_CALLBACK_SECRET || '',
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || '',
    ICE_ADMIN_USER: 'admin',
    ICE_ADMIN_PASSWORD: rand(),
    ICE_SOURCE_PASSWORD: rand(),
    ICE_RELAY_PASSWORD: rand(),
    ICE_HOSTNAME: server.publicHostname,
    HARBOR_PUBLIC_HOSTNAME: server.publicHostname,
    RTMP_RELAY_PUBLIC_HOST: server.publicHostname,
    SITE_DOMAIN: server.publicHostname,
    ICE_HOST: 'icecast',
    ICE_PORT: '8000',
    HARBOR_PORT_RANGE: '22340-22350',
    MYSQL_HOST: process.env.MYSQL_HOST || panelHost(),
    MYSQL_PORT: '3307',
  }

  return Object.entries(env)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n'
}

const CADDYFILE = `# IPStream — Caddyfile para nodos de streaming
{$SITE_DOMAIN} {
\treverse_proxy icecast:8000
}
`

/** Override para nodos SOLO radio: excluye SRS y video-encoder (perfiles). */
function radioOverrideYml(): string {
  return `services:
  srs:
    profiles: ["disabled"]
  video-encoder:
    profiles: ["disabled"]
`
}

/** Resuelve la config SSH de un servidor (clave o password). Devuelve null + mensaje si falla. */
async function resolveSsh(server: {
  sshHost: string
  sshPort: number | null
  sshUser: string | null
  sshAuthType: string | null
  sshKeyEnc: string | null
  sshPasswordEnc: string | null
}): Promise<{ ssh: SshConfig; error: string | null }> {
  try {
    let sshKey: string | null = null
    let sshPassword: string | null = null
    if (server.sshAuthType === 'key' && server.sshKeyEnc) sshKey = decrypt(server.sshKeyEnc)
    else if (server.sshPasswordEnc) sshPassword = decrypt(server.sshPasswordEnc)
    return {
      ssh: {
        host: server.sshHost,
        port: server.sshPort,
        username: server.sshUser,
        privateKey: sshKey || undefined,
        password: sshPassword || undefined,
      },
      error: null,
    }
  } catch {
    return { ssh: {} as SshConfig, error: 'ssh_decrypt_failed' }
  }
}

// =====================================================
// Pasos compartidos (provision inicial y update)
// =====================================================

/** Descarga el repo y sube el tarball al nodo. */
async function syncCodeTarball(serverId: string, ssh: SshConfig, label: string): Promise<void> {
  const res = await fetch(REPO_TARBALL, { signal: AbortSignal.timeout(120000) })
  if (!res.ok) throw new Error(`No se pudo descargar el código (${res.status})`)
  const buf = Buffer.from(await res.arrayBuffer())
  await sftpWrite(ssh, '/tmp/ipstream-node.tar.gz', buf)
  await setProgress(serverId, label, `Código subido (${(buf.length / 1024).toFixed(0)} KB)`)
}

/** Extrae el código, copia streaming + compose y crea los data dirs con permisos. */
async function extractNodeCode(serverId: string, ssh: SshConfig): Promise<void> {
  const setup = await sshExec(
    ssh,
    `set -e; rm -rf /tmp/ipstream-src /tmp/ipstream-node-tmp; mkdir -p /tmp/ipstream-src; ` +
    `tar -xzf /tmp/ipstream-node.tar.gz -C /tmp/ipstream-src; ` +
    `D=$(ls -d /tmp/ipstream-src/*/ | head -1); ` +
    `mkdir -p ${NODE_DIR}; ` +
    `mkdir -p ${NODE_DIR}/data/radio ${NODE_DIR}/data/logs/liquidsoap ${NODE_DIR}/data/scripts; ` +
    `chmod -R u+rwX,g+rwX,o+rwX ${NODE_DIR}/data/logs/liquidsoap; ` +
    `rm -rf ${NODE_DIR}/streaming; cp -r "\${D}streaming" ${NODE_DIR}/; ` +
    `cp "\${D}docker-compose.streaming.yml" ${NODE_DIR}/ 2>/dev/null || true; ` +
    `echo LISTO; ls ${NODE_DIR}`
  )
  if (setup.code !== 0) throw new Error(`Fallo al preparar el nodo: ${setup.stderr.slice(-400)}`)
  await setProgress(serverId, 'Preparando directorio', setup.stdout.trim().split('\n').slice(-3).join(' '))
}

/** Escribe .env + Caddyfile + override según el tipo de nodo. */
async function writeNodeConfig(server: StreamingServerRow, ssh: SshConfig): Promise<void> {
  const envContent = buildNodeEnv(server)
  await sftpWrite(ssh, `${NODE_DIR}/.env`, Buffer.from(envContent, 'utf8'))
  await sftpWrite(ssh, `${NODE_DIR}/Caddyfile`, Buffer.from(CADDYFILE, 'utf8'))
  if (server.type === 'radio') {
    await sftpWrite(ssh, `${NODE_DIR}/docker-compose.streaming.override.yml`, Buffer.from(radioOverrideYml(), 'utf8'))
  }
}

/** Levanta el stack con --build y espera al agente en /health. Si `forceRecreate`, fuerza recrear los contenedores. */
async function upAndHealth(serverId: string, ssh: SshConfig, type: string, forceRecreate = false): Promise<void> {
  const override = type === 'radio' ? ' -f docker-compose.streaming.override.yml' : ''
  const up = await sshExec(
    ssh,
    `cd ${NODE_DIR} && docker compose -f docker-compose.streaming.yml${override} up -d --build${forceRecreate ? ' --force-recreate' : ''}`,
    (l) => {
      const t = l.trim()
      if (t && !t.startsWith('#') && !t.includes('=>') && !t.includes('extracting') && !t.includes('waiting') && !t.includes('Downloading')) {
        setProgress(serverId, 'Levantando el stack', t.slice(0, 180)).catch(() => {})
      }
    },
  )
  if (up.code !== 0) {
    throw new Error(`Fallo al levantar el stack: ${up.stderr.slice(-400)}`)
  }

  let ok = false
  for (let i = 0; i < 24; i++) {
    const r = await sshExec(ssh, 'curl -fsS http://localhost:4000/health 2>/dev/null || echo down')
    if (r.stdout.trim() !== 'down') {
      ok = true
      break
    }
    await new Promise((res) => setTimeout(res, 5000))
  }
  if (!ok) throw new Error('El agente no respondió en /health tras 120s')
  await setProgress(serverId, 'Agente en línea', '✓ /health respondió correctamente')
}

type StreamingServerRow = {
  id: string
  publicHostname: string
  sshHost: string
  sshPort: number | null
  sshUser: string | null
  sshAuthType: string | null
  sshKeyEnc: string | null
  sshPasswordEnc: string | null
  tokenEnc: string
  type: string
}

// =====================================================
// Provision inicial
// =====================================================

export async function startNodeProvisioning(serverId: string): Promise<void> {
  if (activeJobs.has(serverId)) return
  const job = runProvision(serverId).finally(() => activeJobs.delete(serverId))
  activeJobs.set(serverId, job)
}

async function runProvision(serverId: string): Promise<void> {
  const server = await prisma.streamingServer.findUnique({ where: { id: serverId } })
  if (!server) return
  if (!server.sshHost) {
    await setProgress(serverId, 'Sin datos SSH', 'Error: el servidor no tiene host SSH configurado', 'ssh_host_missing')
    return
  }
  if (server.provisionStatus === 'done') return

  const { ssh, error } = await resolveSsh(server)
  if (error) {
    await setProgress(serverId, 'Error de credenciales', 'No se pudo descifrar la credencial SSH', error)
    return
  }

  await prisma.streamingServer.update({
    where: { id: serverId },
    data: {
      provisionStatus: 'provisioning',
      provisionStep: 'Conectando al servidor...',
      provisionError: null,
      provisionLog: [] as any,
      provisionStartedAt: new Date(),
    },
  })

  const step = async (label: string, fn: () => Promise<void>) => {
    await setProgress(serverId, label, `▶ ${label}`)
    await fn()
  }

  try {
    // 1. Docker
    await step('Verificando Docker', async () => {
      const r = await sshExec(ssh, 'command -v docker >/dev/null 2>&1 && echo present || echo absent', (l) => {
        void l
      })
      if (r.stdout.trim() !== 'present') {
        await setProgress(serverId, 'Instalando Docker', 'Docker no detectado — instalando (curl get.docker.com)...')
        const install = await sshExec(ssh, 'curl -fsSL https://get.docker.com | sh', (l) => {
          setProgress(serverId, 'Instalando Docker', l.trim() || '...').catch(() => {})
        })
        if (install.code !== 0) {
          throw new Error(`Fallo al instalar Docker: ${install.stderr.slice(-400)}`)
        }
      }
      const ver = await sshExec(ssh, 'docker compose version 2>&1 | head -1')
      await setProgress(serverId, 'Docker OK', ver.stdout.trim() || 'docker disponible')
    })

    // 2. Código
    await step('Descargando código del panel', () => syncCodeTarball(serverId, ssh, 'Descargando código'))
    await step('Preparando directorio del nodo', () => extractNodeCode(serverId, ssh))

    // 3. Config
    await step('Escribiendo configuración (.env)', () => writeNodeConfig(server, ssh))

    // 4. Levantar + health
    await step('Levantando el stack de streaming', () => upAndHealth(serverId, ssh, server.type))

    // 5. Done
    await prisma.streamingServer.update({
      where: { id: serverId },
      data: {
        provisionStatus: 'done',
        provisionStep: 'Listo',
        provisionError: null,
        provisionedAt: new Date(),
        isActive: true,
      },
    })
  } catch (err) {
    const msg = (err as Error).message
    await setProgress(serverId, 'Provisioning falló', `✗ ${msg}`, msg)
  }
}

// =====================================================
// Update de un nodo ya provisionado
// =====================================================

export async function startNodeUpdate(serverId: string): Promise<void> {
  if (activeJobs.has(serverId)) return
  const job = runNodeUpdate(serverId).finally(() => activeJobs.delete(serverId))
  activeJobs.set(serverId, job)
}

async function runNodeUpdate(serverId: string): Promise<void> {
  const server = await prisma.streamingServer.findUnique({ where: { id: serverId } })
  if (!server) return
  if (!server.sshHost) {
    await setProgress(serverId, 'Sin datos SSH', 'Error: el servidor no tiene host SSH configurado', 'ssh_host_missing')
    return
  }

  const { ssh, error } = await resolveSsh(server)
  if (error) {
    await setProgress(serverId, 'Error de credenciales', 'No se pudo descifrar la credencial SSH', error)
    return
  }

  await prisma.streamingServer.update({
    where: { id: serverId },
    data: {
      provisionStatus: 'updating',
      provisionStep: 'Conectando al servidor...',
      provisionError: null,
      provisionLog: [] as any,
      provisionStartedAt: new Date(),
    },
  })

  const step = async (label: string, fn: () => Promise<void>) => {
    await setProgress(serverId, label, `▶ ${label}`)
    await fn()
  }

  try {
    // 0. Snapshot de streams activos en ESTE servidor (para reiniciarlos tras el update)
    const running = await snapshotRunningStreams(serverId)
    if (running.radio.length + running.video.length > 0) {
      await setProgress(
        serverId,
        'Streams activos detectados',
        `Se reiniciarán tras el update: ${running.radio.length} radio, ${running.video.length} TV`
      )
    }

    // 1. Código nuevo
    await step('Descargando código del panel', () => syncCodeTarball(serverId, ssh, 'Descargando código'))
    await step('Preparando directorio del nodo', () => extractNodeCode(serverId, ssh))

    // 2. Config (re-escribe .env por si cambió el token/hostname del panel)
    await step('Escribiendo configuración (.env)', () => writeNodeConfig(server, ssh))

    // 3. Levantar + health (reconstruye las imágenes con el código nuevo y
    //    fuerza recrear los contenedores: el rm -rf streaming del paso 2 cambia
    //    el inode del dir de scripts, dejando el bind mount stale en liquidsoap)
    await step('Actualizando el stack de streaming', () => upAndHealth(serverId, ssh, server.type, true))

    // 4. Reiniciar los streams que estaban activos (el update los detuvo)
    if (running.radio.length + running.video.length > 0) {
      await step('Reiniciando streams activos', () => restartStreams(serverId, running))
    }

    // 5. Done
    await prisma.streamingServer.update({
      where: { id: serverId },
      data: {
        provisionStatus: 'done',
        provisionStep: 'Actualizado',
        provisionError: null,
        provisionedAt: new Date(),
        isActive: true,
      },
    })
  } catch (err) {
    const msg = (err as Error).message
    await setProgress(serverId, 'Actualización falló', `✗ ${msg}`, msg)
  }
}

// =====================================================
// Auto-reinicio de streams tras actualizar un nodo
// =====================================================

interface RunningSnapshot {
  radio: string[] // clientIds con radio activa (autodj/live)
  video: string[] // clientIds con video activo (autodj/live)
}

/** Snapshot de los streams activos asignados a ESTE servidor. */
async function snapshotRunningStreams(serverId: string): Promise<RunningSnapshot> {
  const [radios, videos] = await Promise.all([
    prisma.radioStream.findMany({
      where: { serverId, status: { in: ['autodj', 'live'] } },
      select: { clientId: true },
    }),
    prisma.videoStream.findMany({
      where: { serverId, status: { in: ['autodj', 'live'] } },
      select: { clientId: true },
    }),
  ])
  return {
    radio: radios.map((r) => r.clientId),
    video: videos.map((v) => v.clientId),
  }
}

/** Reinicia los streams del snapshot vía el agente correspondiente. Aislado: nunca lanza. */
async function restartStreams(serverId: string, running: RunningSnapshot): Promise<void> {
  const { streamingClient, videoClient } = await import('@/lib/streaming-client')
  const failed: string[] = []

  for (const clientId of running.radio) {
    try {
      await streamingClient.start(clientId)
    } catch (err) {
      failed.push(`radio:${clientId} (${(err as Error).message})`)
    }
  }
  for (const clientId of running.video) {
    try {
      await videoClient.start(clientId)
    } catch (err) {
      failed.push(`tv:${clientId} (${(err as Error).message})`)
    }
  }

  await setProgress(
    serverId,
    failed.length === 0 ? 'Streams reiniciados' : 'Algunos streams fallaron',
    failed.length === 0
      ? `✓ ${running.radio.length + running.video.length} streams reiniciados`
      : `Reiniciados ${running.radio.length + running.video.length - failed.length}/${running.radio.length + running.video.length}. Fallaron: ${failed.join(', ').slice(0, 300)}`,
    failed.length === running.radio.length + running.video.length ? 'streams_restart_all_failed' : null
  )
}
