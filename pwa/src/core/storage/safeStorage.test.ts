import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEVICE_ID_KEY,
  getOrCreateDeviceId,
  readString,
  resetMemoryDeviceId,
  writeString
} from './safeStorage'

function blockStorage() {
  vi.stubGlobal('localStorage', {
    getItem: () => {
      throw new Error('storage bloqueado')
    },
    setItem: () => {
      throw new Error('storage bloqueado')
    }
  })
}

beforeEach(() => {
  resetMemoryDeviceId()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  resetMemoryDeviceId()
})

describe('safeStorage', () => {
  it('readString devuelve null cuando localStorage lanza', () => {
    blockStorage()
    expect(readString('cualquiera')).toBeNull()
  })

  it('writeString no propaga el error de localStorage', () => {
    blockStorage()
    expect(() => writeString('cualquiera', 'valor')).not.toThrow()
  })

  it('getOrCreateDeviceId es estable aunque no haya persistencia', () => {
    blockStorage()
    const first = getOrCreateDeviceId()
    const second = getOrCreateDeviceId()
    expect(first).toBe(second)
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('getOrCreateDeviceId persiste y reutiliza el valor guardado', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value)
    })

    const first = getOrCreateDeviceId()
    expect(store.get(DEVICE_ID_KEY)).toBe(first)

    resetMemoryDeviceId()
    expect(getOrCreateDeviceId()).toBe(first)
  })
})
