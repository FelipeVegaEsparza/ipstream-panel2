import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appConfig: { findFirst: vi.fn() },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { appConfig: mocks.appConfig },
}))

vi.mock('@/lib/encryption', () => ({
  isEncrypted: (value: string) => value.startsWith('enc:'),
  decrypt: (value: string) => value.slice(4),
}))

import { getDeepSeekApiKey, getDeepSeekConfig, invalidateDeepSeekConfig } from './deepseek-config'

const ORIGINAL_KEY = process.env.DEEPSEEK_API_KEY

beforeEach(() => {
  vi.clearAllMocks()
  invalidateDeepSeekConfig()
  delete process.env.DEEPSEEK_API_KEY
})

describe('configuración del proveedor de texto', () => {
  it('usa la clave guardada en el panel y la desencripta', async () => {
    mocks.appConfig.findFirst.mockResolvedValue({ deepseekApiKeyEnc: 'enc:sk-panel' })

    await expect(getDeepSeekConfig()).resolves.toEqual({
      apiKey: 'sk-panel',
      configured: true,
      source: 'db',
    })
  })

  it('cae a la variable de entorno si no hay clave en la base', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-env'
    mocks.appConfig.findFirst.mockResolvedValue({ deepseekApiKeyEnc: null })

    await expect(getDeepSeekConfig()).resolves.toEqual({
      apiKey: 'sk-env',
      configured: true,
      source: 'env',
    })
  })

  it('queda sin configurar si no hay clave en ningún lado', async () => {
    mocks.appConfig.findFirst.mockResolvedValue({ deepseekApiKeyEnc: null })

    await expect(getDeepSeekConfig()).resolves.toEqual({
      apiKey: '',
      configured: false,
      source: null,
    })
    await expect(getDeepSeekApiKey()).resolves.toBeNull()
  })

  it('prioriza la clave del panel sobre la del entorno', async () => {
    process.env.DEEPSEEK_API_KEY = 'sk-env'
    mocks.appConfig.findFirst.mockResolvedValue({ deepseekApiKeyEnc: 'enc:sk-panel' })

    await expect(getDeepSeekApiKey()).resolves.toBe('sk-panel')
  })

  it('invalida la caché tras guardar o quitar la clave', async () => {
    mocks.appConfig.findFirst.mockResolvedValue({ deepseekApiKeyEnc: 'enc:sk-old' })
    await expect(getDeepSeekApiKey()).resolves.toBe('sk-old')

    mocks.appConfig.findFirst.mockResolvedValue({ deepseekApiKeyEnc: null })
    await expect(getDeepSeekApiKey()).resolves.toBe('sk-old') // cacheado

    invalidateDeepSeekConfig()
    await expect(getDeepSeekApiKey()).resolves.toBeNull()
  })
})

afterAll(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.DEEPSEEK_API_KEY
  } else {
    process.env.DEEPSEEK_API_KEY = ORIGINAL_KEY
  }
})
