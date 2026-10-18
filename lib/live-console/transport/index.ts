import type { LiveTransport, TransportKind } from '../types'
import { WhipTransport } from './whip'
import { WebSocketTransport } from './websocket'

export function createTransport(kind: TransportKind): LiveTransport {
  return kind === 'websocket' ? new WebSocketTransport() : new WhipTransport()
}
