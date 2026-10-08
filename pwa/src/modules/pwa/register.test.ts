import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerPwaInstall } from '@/core/api'
import { resetMemoryDeviceId } from '@/core/storage/safeStorage'
import { ensurePwaRegistered } from './register'

vi.mock('@/core/api', () => ({
  registerPwaInstall: vi.fn().mockResolvedValue({
    registered: true,
    total: 1,
    firstTime: true
  })
}))

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
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  resetMemoryDeviceId()
})

describe('ensurePwaRegistered', () => {
  it('reutiliza el mismo deviceId aunque no haya persistencia', async () => {
    blockStorage()

    await ensurePwaRegistered('cmclient')
    await ensurePwaRegistered('cmclient')

    const calls = vi.mocked(registerPwaInstall).mock.calls
    expect(calls.length).toBe(2)
    const ids = calls.map((call) => call[1])
    expect(new Set(ids).size).toBe(1)
  })

  it('deduplica llamadas concurrentes del mismo clientId', async () => {
    blockStorage()

    await Promise.all([
      ensurePwaRegistered('cmclient'),
      ensurePwaRegistered('cmclient')
    ])

    expect(registerPwaInstall).toHaveBeenCalledTimes(1)
  })
})
