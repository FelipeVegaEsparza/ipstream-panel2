// =====================================================
// Configuración del proveedor de texto para reseñas IA.
// La API key se guarda encriptada en app_config; el env queda como fallback.
// =====================================================

import { prisma } from '@/lib/prisma'
import { decrypt, isEncrypted } from '@/lib/encryption'

export interface DeepSeekConfig {
  apiKey: string
  configured: boolean
  source: 'db' | 'env' | null
}

const CACHE_TTL_MS = 60_000
let cache: { value: DeepSeekConfig; at: number } | null = null

function clean(value: string | null | undefined): string {
  return (value || '').trim()
}

function secretFromDb(enc: string | null): string | null {
  if (!enc) return null
  try {
    return isEncrypted(enc) ? decrypt(enc) : enc
  } catch {
    return null
  }
}

export function invalidateDeepSeekConfig(): void {
  cache = null
}

export async function getDeepSeekConfig(): Promise<DeepSeekConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value

  const envKey = clean(process.env.DEEPSEEK_API_KEY)
  let value: DeepSeekConfig = envKey
    ? { apiKey: envKey, configured: true, source: 'env' }
    : { apiKey: '', configured: false, source: null }

  try {
    const cfg = await prisma.appConfig.findFirst({
      select: { deepseekApiKeyEnc: true },
    })
    const dbKey = secretFromDb(cfg?.deepseekApiKeyEnc ?? null)
    if (dbKey) {
      value = { apiKey: dbKey, configured: true, source: 'db' }
    }
  } catch {
    // DB no disponible: usar env
  }

  cache = { value, at: Date.now() }
  return value
}

export async function getDeepSeekApiKey(): Promise<string | null> {
  const config = await getDeepSeekConfig()
  return config.apiKey || null
}
