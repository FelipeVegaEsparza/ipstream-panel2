// =====================================================
// Icecast config — genera icecast.xml con per-mount
// <source-password> por cliente y lo deploya via docker exec
// =====================================================

import { exec } from 'child_process'
import { promisify } from 'util'
import { pool } from './db.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { decrypt, isEncrypted } from './encryption.js'

const execp = promisify(exec)

const ICECAST_CONTAINER = config.ice.host === 'localhost' ? 'ipstream-icecast' : 'ipstream-icecast'
const ICECAST_CONFIG_PATH = '/etc/icecast2/icecast.xml'
const ICECAST_BIN = 'icecast2'

/**
 * Genera el XML completo de icecast con per-client mounts.
 */
function generateIcecastXml(streams) {
  const p = (value) => {
    if (value === null || value === undefined) return ''
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  let xml = `<icecast>
    <location>IPStream Panel Streaming</location>
    <admin>admin@ipstream.local</admin>

    <limits>
        <clients>500</clients>
        <sources>200</sources>
        <queue-size>1048576</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
    </limits>

    <authentication>
        <admin-user>${p(config.ice.adminUser)}</admin-user>
        <admin-password>${p(config.ice.adminPassword)}</admin-password>
        <source-password>${p(config.ice.sourcePassword)}</source-password>
        <relay-password>${p(config.ice.relayPassword)}</relay-password>
    </authentication>

    <hostname>${p(config.ice.hostname)}</hostname>
    <listen-socket>
        <port>${p(config.ice.port)}</port>
    </listen-socket>

    <!-- Auth-source global: se llama para TODA conexión de fuente.
         Reemplaza el <password> per-mount para que Icecast SIEMPRE
         consulte al agente y nunca use match local de password. -->
    <auth-http-source>
        <option name="auth_url" value="http://agent:4000/api/streams/auth-source"/>
        <option name="method" value="POST"/>
    </auth-http-source>

    <!-- Mount por defecto -->
    <mount type="default">
        <public>1</public>
        <bitrate>128</bitrate>
        <type>audio/mpeg</type>
    </mount>`

  // Per-client mounts with decrypted livePassword
  for (const s of streams) {
    if (!s.livePasswordDecrypted) continue
    const mountName = s.icecastMount.startsWith('/') ? s.icecastMount : `/${s.icecastMount}`
    xml += `
    <mount>
        <mount-name>${p(mountName)}</mount-name>
        <public>1</public>
        <bitrate>${p(s.bitrate || 128)}</bitrate>
        <type>audio/mpeg</type>
    </mount>`
  }

  xml += `
    <fileserve>1</fileserve>

    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
        <alias source="/" destination="/status-json.xsl"/>
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
        <logsize>10000</logsize>
    </logging>

    <security>
        <chroot>0</chroot>
    </security>

    <changeowner>
        <user>root</user>
    </changeowner>
</icecast>`

  return xml
}

/**
 * Lee todos los streams, descifra livePasswordEnc y genera el XML.
 */
async function buildConfig() {
  const [rows] = await pool.query(`
    SELECT icecastMount, bitrate, livePasswordEnc
    FROM radio_streams
    WHERE status != 'disabled'
  `)

  const streams = []
  for (const row of rows) {
    const s = { icecastMount: row.icecastMount, bitrate: row.bitrate, livePasswordDecrypted: null }
    if (row.livePasswordEnc && isEncrypted(row.livePasswordEnc)) {
      try {
        s.livePasswordDecrypted = decrypt(row.livePasswordEnc)
      } catch (err) {
        logger.warn({ mount: row.icecastMount, err: err.message }, 'icecast-config: fallo descifrado, usa shared password')
      }
    }
    streams.push(s)
  }

  return generateIcecastXml(streams)
}

/**
 * Escribe el XML en el container de icecast via docker exec.
 */
async function writeConfigToContainer(xml) {
  return new Promise((resolve, reject) => {
    const child = exec(
      `docker exec -i ${ICECAST_CONTAINER} sh -c 'cat > ${ICECAST_CONFIG_PATH}'`,
      (err, stdout, stderr) => {
        if (err) {
          logger.error({ err: err.message, stderr: stderr?.slice(0, 200) }, 'icecast-config: fallo escritura config')
          return reject(err)
        }
        logger.info('icecast-config: config escrita en icecast container')
        resolve(stdout)
      }
    )
    child.stdin.write(xml)
    child.stdin.end()
  })
}

/**
 * Envía SIGHUP a icecast para que recargue la config.
 * docker kill -s HUP envía la señal a PID 1 (tini), que la reenvía
 * a icecast2. No requiere permisos especiales.
 */
async function reloadIcecast() {
  try {
    await execp(`docker kill -s HUP ${ICECAST_CONTAINER}`)
    logger.info('icecast-config: SIGHUP enviado a icecast via docker kill')
  } catch (err) {
    logger.warn({ err: err.message }, 'icecast-config: SIGHUP via docker kill falló')
    throw err
  }
}

/**
 * Genera la config completa y la deploya al container de icecast.
 * Llámese después de cambios en streams.
 */
export async function deployIcecastConfig() {
  try {
    logger.info('icecast-config: desplegando config...')
    const xml = await buildConfig()
    await writeConfigToContainer(xml)
    await reloadIcecast()
    logger.info('icecast-config: deploy exitoso')
    return { ok: true }
  } catch (err) {
    logger.error({ err: err.message }, 'icecast-config: deploy falló')
    return { ok: false, error: err.message }
  }
}
