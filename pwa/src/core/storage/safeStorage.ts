/**
 * Acceso tolerante a fallos al almacenamiento local. En contextos donde
 * `localStorage` no está disponible (modo privado, storage bloqueado) las
 * operaciones no lanzan: se comportan como si no hubiera nada persistido.
 */

export const DEVICE_ID_KEY = 'ipstream_device_id'

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  try {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    // Versión 4 y variante 10 del RFC 4122.
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  } catch {
    // getRandomValues tampoco disponible: último respaldo con Math.random.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0
      const value = char === 'x' ? random : (random & 0x3) | 0x8
      return value.toString(16)
    })
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Persistencia best-effort: se omite si el storage no está disponible.
  }
}

/**
 * Respaldo en memoria para cuando la persistencia no está disponible: evita
 * generar un `deviceId` nuevo en cada llamada (lo que registraría la misma
 * instalación varias veces con IDs distintos).
 */
let memoryDeviceId: string | null = null

export function getOrCreateDeviceId(): string {
  const stored = readString(DEVICE_ID_KEY)
  if (stored) return stored
  if (memoryDeviceId) return memoryDeviceId
  const deviceId = randomUuid()
  memoryDeviceId = deviceId
  writeString(DEVICE_ID_KEY, deviceId)
  return deviceId
}

/** Solo para tests: limpia el respaldo en memoria. */
export function resetMemoryDeviceId(): void {
  memoryDeviceId = null
}
