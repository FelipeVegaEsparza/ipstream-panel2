// =====================================================
// Liquidsoap Telnet client
// Conecta al puerto telnet de un proceso Liquidsoap para
// consultar estado de harbor inputs y ejecutar acciones.
// =====================================================

import net from 'net'
import { logger } from './logger.js'
import { config } from './config.js'

const DEFAULT_TIMEOUT_MS = 5000
const END_MARKER = 'END\n'

function sendCommand(host, port, command, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let buffer = ''
    let settled = false

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      socket.destroy()
      reject(new Error(`Telnet timeout (${timeoutMs}ms) para ${host}:${port}`))
    }, timeoutMs)

    socket.on('data', (data) => {
      buffer += data.toString('utf8')
      // Liquidsoap telnet responde con el resultado del comando seguido de "END"
      if (buffer.endsWith(END_MARKER)) {
        if (settled) return
        settled = true
        clearTimeout(timer)
        socket.end()
        // Remover el eco del comando y el END final
        const lines = buffer.split('\n')
        // La primera línea suele ser el eco del comando; filtrarla
        const responseLines = lines.filter((line) => {
          if (line.trim() === command.trim()) return false
          if (line.trim() === 'END') return false
          return line.trim() !== ''
        })
        resolve(responseLines.join('\n').trim())
      }
    })

    socket.on('error', (err) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(err)
    })

    socket.on('close', () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      // Si no vimos END, devolvemos lo que haya en el buffer
      resolve(buffer.trim())
    })

    socket.connect(port, host, () => {
      socket.write(`${command}\n`)
    })
  })
}

/**
 * Ejecuta un comando telnet contra Liquidsoap.
 * @param {number} port
 * @param {string} command
 */
export async function telnetCommand(port, command) {
  const host = config.liquidsoap.host === 'localhost' ? '127.0.0.1' : config.liquidsoap.host
  return sendCommand(host, port, command)
}

/**
 * Verifica si una variable de source está activa (ready).
 * NOTA: en Liquidsoap 2.4.x el método source.is_ready() NO está expuesto
 * por telnet. Este helper queda para versiones antiguas / compatibilidad;
 * el watcher principal usa isAnyHarborSourceConnected().
 * @param {number} port
 * @param {string} sourceName
 */
export async function isSourceReady(port, sourceName) {
  try {
    const res = await telnetCommand(port, `${sourceName}.is_ready`)
    return res.trim() === 'true'
  } catch (err) {
    logger.debug({ port, sourceName, err: err.message }, 'isSourceReady falló (esperado en LS 2.4.x)')
    return null
  }
}

/**
 * Liquidsoap 2.4.x no expone source.is_ready() por telnet. En cambio,
 * input.harbor.status devuelve una línea por cada fuente conectada
 * ("source client connected from <ip>"). Usamos eso como proxy de
 * "hay al menos un DJ conectado".
 * @param {number} port
 * @returns {Promise<boolean|null>}
 */
export async function isAnyHarborSourceConnected(port) {
  try {
    const res = await telnetCommand(port, 'input.harbor.status')
    // Ejemplos:
    //   - "source client connected from 201.187.111.162"
    //   - "No source connected"
    return /connected from/i.test(res)
  } catch (err) {
    logger.warn({ port, err: err.message }, 'isAnyHarborSourceConnected falló')
    return null
  }
}

/**
 * Detiene un harbor input (kick DJ).
 * @param {number} port
 * @param {string} sourceName
 */
export async function stopHarborInput(port, sourceName) {
  try {
    await telnetCommand(port, `${sourceName}.stop`)
    return true
  } catch (err) {
    logger.warn({ port, sourceName, err: err.message }, 'stopHarborInput falló')
    return false
  }
}

/**
 * Lista los harbor inputs conectados para un array de slots.
 * @param {number} port
 * @param {{ mount: string, sourceName: string }[]} slots
 * @returns {Promise<string[]>} mounts conectados
 */
export async function listActiveHarborMounts(port, slots) {
  const active = []
  for (const slot of slots) {
    try {
      const ready = await isSourceReady(port, slot.sourceName)
      if (ready) active.push(slot.mount)
    } catch (err) {
      logger.warn({ port, slot }, 'listActiveHarborMounts: error en slot')
    }
  }
  return active
}
