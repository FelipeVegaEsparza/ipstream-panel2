import { registerPwaInstall } from '@/core/api'
import {
  DEVICE_ID_KEY,
  getOrCreateDeviceId,
  readString,
  writeString
} from '@/core/storage/safeStorage'

export { DEVICE_ID_KEY }
export const DEVICE_REGISTERED_PREFIX = 'ipstream_device_registered_'

/** Registros en curso por clientId: evita doble POST ante efectos duplicados o pestañas del mismo módulo. */
const inFlightRegistrations = new Map<string, Promise<void>>()

/**
 * Id persistente del dispositivo. `getOrCreateDeviceId` tolera `localStorage`
 * bloqueado y, en ese caso, mantiene un respaldo estable en memoria durante la
 * sesión para no registrar la misma instalación con IDs distintos.
 */
export function getDeviceId(): string {
  return getOrCreateDeviceId()
}

function isRegistered(clientId: string): boolean {
  return readString(`${DEVICE_REGISTERED_PREFIX}${clientId}`) === 'true'
}

function markRegistered(clientId: string): void {
  writeString(`${DEVICE_REGISTERED_PREFIX}${clientId}`, 'true')
}

export function ensurePwaRegistered(clientId: string): Promise<void> {
  const inFlight = inFlightRegistrations.get(clientId)
  if (inFlight) return inFlight

  const registration = performRegistration(clientId).finally(() => {
    // Se elimina también ante rechazo para permitir reintentar en la próxima carga.
    inFlightRegistrations.delete(clientId)
  })
  inFlightRegistrations.set(clientId, registration)
  return registration
}

async function performRegistration(clientId: string): Promise<void> {
  if (isRegistered(clientId)) return

  const deviceId = getDeviceId()
  try {
    await registerPwaInstall(clientId, deviceId)
    markRegistered(clientId)
  } catch {
    // Sin conexión o error transitorio: se reintentará en la próxima carga.
  }
}
