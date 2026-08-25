// =====================================================
// Node provisioner — provisioning automático de nodos vía SSH
// =====================================================
// El panel guarda la clave SSH (encriptada), genera el .env del nodo,
// sube el código (streaming + compose) y levanta el stack por su cuenta.
// El trabajo corre en segundo plano y reporta progreso a la DB.

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

  let sshKey: string | null = null
  let sshPassword: string | null = null
  try {
    if (server.sshAuthType === 'key' && server.sshKeyEnc) sshKey = decrypt(server.sshKeyEnc)
    else if (server.sshPasswordEnc) sshPassword = decrypt(server.sshPasswordEnc)
  } catch {
    await setProgress(serverId, 'Error de credenciales', 'No se pudo descifrar la credencial SSH', 'ssh_decrypt_failed')
    return
  }

  const ssh: SshConfig = {
    host: server.sshHost,
    port: server.sshPort,
    username: server.sshUser,
    privateKey: sshKey || undefined,
    password: sshPassword || undefined,
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

    // 2. Descargar repo y subir por SFTP
    await step('Descargando código del panel', async () => {
      const res = await fetch(REPO_TARBALL, { signal: AbortSignal.timeout(120000) })
      if (!res.ok) throw new Error(`No se pudo descargar el código (${res.status})`)
      const buf = Buffer.from(await res.arrayBuffer())
      await sftpWrite(ssh, '/tmp/ipstream-node.tar.gz', buf)
      await setProgress(serverId, 'Descargando código', `Código subido (${(buf.length / 1024).toFixed(0)} KB)`)
    })

    // 3. Extraer + copiar streaming y compose
    await step('Preparando directorio del nodo', async () => {
      const setup = await sshExec(
        ssh,
        `set -e; rm -rf /tmp/ipstream-src /tmp/ipstream-node-tmp; mkdir -p /tmp/ipstream-src; ` +
        `tar -xzf /tmp/ipstream-node.tar.gz -C /tmp/ipstream-src; ` +
        `D=$(ls -d /tmp/ipstream-src/*/ | head -1); ` +
        `mkdir -p ${NODE_DIR}; ` +
        `rm -rf ${NODE_DIR}/streaming; cp -r "\${D}streaming" ${NODE_DIR}/; ` +
        `cp "\${D}docker-compose.streaming.yml" ${NODE_DIR}/ 2>/dev/null || true; ` +
        `echo LISTO; ls ${NODE_DIR}`
      )
      if (setup.code !== 0) throw new Error(`Fallo al preparar el nodo: ${setup.stderr.slice(-400)}`)
      await setProgress(serverId, 'Preparando directorio', setup.stdout.trim().split('\n').slice(-3).join(' '))
    })

    // 4. Escribir .env
    await step('Escribiendo configuración (.env)', async () => {
      const envContent = buildNodeEnv(server)
      await sftpWrite(ssh, `${NODE_DIR}/.env`, Buffer.from(envContent, 'utf8'))
    })

    // 5. Levantar el stack
    await step('Levantando el stack de streaming', async () => {
      const up = await sshExec(
        ssh,
        `cd ${NODE_DIR} && docker compose -f docker-compose.streaming.yml up -d --build`,
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
    })

    // 6. Health check del agente
    await step('Esperando al agente', async () => {
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
    })

    // 7. Done
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
