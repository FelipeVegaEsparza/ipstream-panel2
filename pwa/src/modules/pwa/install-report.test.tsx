import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { registerPwaInstall } from '@/core/api'
import { resetMemoryDeviceId } from '@/core/storage/safeStorage'
import { ensureInstallReported } from './register'
import { usePwaInstallReport } from './usePwaInstallReport'

vi.mock('@/core/api', () => ({
  registerPwaInstall: vi.fn().mockResolvedValue({
    registered: true,
    total: 1,
    installedCount: 1,
    firstTime: true
  })
}))

function setStandalone(value: boolean): void {
  ;(window.navigator as Navigator & { standalone?: boolean }).standalone = false
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: value && query.includes('standalone'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  })) as unknown as typeof window.matchMedia
}

beforeEach(() => {
  window.localStorage.clear()
  resetMemoryDeviceId()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
  resetMemoryDeviceId()
})

describe('ensureInstallReported', () => {
  it('reporta installed=true una sola vez por dispositivo', async () => {
    await ensureInstallReported('cmclient')
    await ensureInstallReported('cmclient')

    expect(registerPwaInstall).toHaveBeenCalledTimes(1)
    expect(vi.mocked(registerPwaInstall).mock.calls[0][2]).toBe(true)
  })
})

describe('usePwaInstallReport', () => {
  it('no reporta si se usa solo desde el navegador', () => {
    setStandalone(false)
    renderHook(() => usePwaInstallReport('cmclient'))
    expect(registerPwaInstall).not.toHaveBeenCalled()
  })

  it('reporta si la app corre en modo standalone', () => {
    setStandalone(true)
    renderHook(() => usePwaInstallReport('cmclient'))
    expect(registerPwaInstall).toHaveBeenCalledWith(
      'cmclient',
      expect.any(String),
      true
    )
  })

  it('reporta al evento appinstalled', () => {
    setStandalone(false)
    renderHook(() => usePwaInstallReport('cmclient'))
    expect(registerPwaInstall).not.toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })

    expect(registerPwaInstall).toHaveBeenCalledWith(
      'cmclient',
      expect.any(String),
      true
    )
  })
})
