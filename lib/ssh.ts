// =====================================================
// SSH helper — conexión del panel a los nodos de streaming
// =====================================================
// Usa ssh2. Soporta clave privada o password. Ejecuta comandos y
// sube archivos por SFTP. Solo se usa en provisioning (ADMIN).

import { Client } from 'ssh2'
import { Readable } from 'stream'

export interface SshConfig {
  host: string
  port?: number
  username?: string
  privateKey?: string
  password?: string
}

export interface ExecResult {
  code: number
  stdout: string
  stderr: string
}

function connect(conf: SshConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    conn.on('ready', () => resolve(conn))
    conn.on('error', (err) => reject(err))
    conn.connect({
      host: conf.host,
      port: conf.port || 22,
      username: conf.username || 'root',
      privateKey: conf.privateKey || undefined,
      password: conf.password || undefined,
      readyTimeout: 20000,
      keepaliveInterval: 10000,
    })
  })
}

function exec(conn: Client, command: string, onOutput?: (line: string, stream: 'stdout' | 'stderr') => void): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    conn.exec(command, { pty: false }, (err, stream) => {
      if (err) return reject(err)
      let stdout = ''
      let stderr = ''
      stream.on('close', (code: number) => {
        resolve({ code: code ?? 0, stdout, stderr })
      })
      stream.on('data', (data: Buffer) => {
        const s = data.toString()
        stdout += s
        onOutput?.(s, 'stdout')
      })
      stream.stderr.on('data', (data: Buffer) => {
        const s = data.toString()
        stderr += s
        onOutput?.(s, 'stderr')
      })
      stream.on('error', reject)
    })
  })
}

/**
 * Conecta, ejecuta un comando y cierra la conexión.
 * `onOutput` recibe cada fragmento de salida (para progreso).
 * `timeoutMs` aborta el comando si tarda demasiado (default 20 min).
 */
export async function sshExec(
  conf: SshConfig,
  command: string,
  onOutput?: (line: string, stream: 'stdout' | 'stderr') => void,
  timeoutMs = 20 * 60 * 1000,
): Promise<ExecResult> {
  const conn = await connect(conf)
  const timer = setTimeout(() => {
    conn.end()
  }, timeoutMs)
  try {
    return await exec(conn, command, onOutput)
  } finally {
    clearTimeout(timer)
    conn.end()
  }
}

/**
 * Sube un buffer a un path remoto vía SFTP.
 */
export async function sftpWrite(conf: SshConfig, remotePath: string, data: Buffer): Promise<void> {
  const conn = await connect(conf)
  try {
    await new Promise<void>((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err)
        const stream = sftp.createWriteStream(remotePath)
        stream.on('close', () => resolve())
        stream.on('error', reject)
        Readable.from(data).pipe(stream)
      })
    })
  } finally {
    conn.end()
  }
}
