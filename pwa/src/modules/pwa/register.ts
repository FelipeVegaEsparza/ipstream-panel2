import { registerPwaInstall } from '@/core/api'
import {
  DEVICE_ID_KEY,
  getOrCreateDeviceId,
  readString,
  writeString
} from '@/core/storage/safeStorage'

export { DEVICE_ID_KEY }
export const DEVICE_REGISTERED_PREFIX = 'ipstream_device_registered_'
export const INSTALL_REPORTED_PREFIX = 'ipstream_install_reported_'

/** Registros en curso por clientId: evita doble POST ante efectos duplicados o pestañas del mismo módulo. */
const inFlightRegistrations = new Map<string, Promise<void>>()
const inFlightInstallReports = new Map<string, Promise<void>>()

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

/**
 * ¿La app corre como PWA instalada? Cubre `display-mode` y `navigator.standalone`
 * (iOS). No detecta la instalación desde una pestaña del navegador.
 */
export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false

  const nav = window.navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true

  if (typeof window.matchMedia !== 'function') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  )
}

function isInstallReported(clientId: string): boolean {
  return readString(`${INSTALL_REPORTED_PREFIX}${clientId}`) === 'true'
}

function markInstallReported(clientId: string): void {
  writeString(`${INSTALL_REPORTED_PREFIX}${clientId}`, 'true')
}

/**
 * Reporta al panel que el dispositivo tiene la app instalada. Idempotente por
 * clientId (una sola vez por dispositivo); se apoya en el registro normal para
 * crear la fila si aún no existe.
 */
export function ensureInstallReported(clientId: string): Promise<void> {
  const inFlight = inFlightInstallReports.get(clientId)
  if (inFlight) return inFlight

  const report = performInstallReport(clientId).finally(() => {
    inFlightInstallReports.delete(clientId)
  })
  inFlightInstallReports.set(clientId, report)
  return report
}

async function performInstallReport(clientId: string): Promise<void> {
  if (isInstallReported(clientId)) return

  const deviceId = getDeviceId()
  try {
    await registerPwaInstall(clientId, deviceId, true)
    markInstallReported(clientId)
  } catch {
    // Sin conexión o error transitorio: se reintentará en la próxima carga.
  }
}
