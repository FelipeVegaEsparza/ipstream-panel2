// =====================================================
// WebSocket — push de status en vivo
// =====================================================
// El IPStream Panel se conecta a ws://agent:4000/ws/streams/:clientId
// y recibe updates cada N segundos con el estado actual de la radio.

import { getMountStatus } from '../lib/icecast.js'
import { isProcessRunning } from '../lib/liquidsoap.js'
import { pool } from '../lib/db.js'
import { logger } from '../lib/logger.js'

const PUSH_INTERVAL_MS = 3000

export default async function websocketRoutes(app) {
  app.get('/ws/streams/:clientId', { websocket: true }, (socket, request) => {
    const { clientId } = request.params
    logger.info({ clientId, reqId: request.id }, 'WebSocket conectado')

    let interval = null
    let closed = false

    const send = async () => {
      if (closed || socket.readyState !== 1) return  // 1 = OPEN
      try {
        const [rsRows] = await pool.query(
          `SELECT rs.icecastMount, rs.bitrate FROM radio_streams rs WHERE rs.clientId = ?`,
          [clientId]
        )
        if (rsRows.length === 0) {
          socket.send(JSON.stringify({ error: 'not_found' }))
          return
        }
        const rs = rsRows[0]
        const proc = await isProcessRunning(rs.icecastMount)
        let mount = null
        try {
          mount = await getMountStatus(rs.icecastMount)
        } catch (err) {
          // Icecast caído temporalmente; no es error fatal para el WS
        }
        socket.send(JSON.stringify({
          type: 'status',
          clientId,
          mount: rs.icecastMount,
          process: proc,
          icecast: mount,
          timestamp: new Date().toISOString(),
        }))
      } catch (err) {
        logger.warn({ err: err.message, clientId }, 'Error en WS push')
      }
    }

    interval = setInterval(send, PUSH_INTERVAL_MS)
    send() // inmediato

    socket.on('close', () => {
      closed = true
      if (interval) clearInterval(interval)
      logger.info({ clientId }, 'WebSocket desconectado')
    })

    socket.on('error', (err) => {
      logger.warn({ err: err.message, clientId }, 'WebSocket error')
    })
  })
}
