// =====================================================
// Catálogo de voces ElevenLabs y voz elegida por cliente
// =====================================================

import { prisma } from '@/lib/prisma'
import { getElevenLabsConfig } from '@/lib/elevenlabs-config'

export interface ElevenLabsVoiceOption {
  id: string
  name: string
  description?: string
}

export interface ClientVoiceSettings {
  voiceId: string
  style: number
  name: string
}

export function parseVoiceCatalog(raw: string | null | undefined): ElevenLabsVoiceOption[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((v) => v && typeof v.id === 'string' && typeof v.name === 'string')
      .map((v) => ({
        id: v.id.trim(),
        name: v.name.trim(),
        description: typeof v.description === 'string' ? v.description.trim() : undefined,
      }))
      .filter((v) => v.id && v.name)
      .slice(0, 30)
  } catch {
    return []
  }
}

export async function getVoiceCatalog(): Promise<ElevenLabsVoiceOption[]> {
  const [cfg, global] = await Promise.all([
    prisma.appConfig.findFirst({ select: { elevenLabsVoices: true } }).catch(() => null),
    getElevenLabsConfig(),
  ])
  const catalog = parseVoiceCatalog(cfg?.elevenLabsVoices)
  if (global.voiceId && !catalog.some((v) => v.id === global.voiceId)) {
    catalog.unshift({ id: global.voiceId, name: 'Voz predeterminada' })
  }
  return catalog
}

export async function getClientVoiceSettings(clientId: string): Promise<ClientVoiceSettings> {
  const [rs, cfg, global] = await Promise.all([
    prisma.radioStream.findUnique({
      where: { clientId },
      select: { aiVoiceId: true, aiVoiceStyle: true },
    }).catch(() => null),
    prisma.appConfig.findFirst({ select: { elevenLabsVoices: true } }).catch(() => null),
    getElevenLabsConfig(),
  ])
  const catalog = parseVoiceCatalog(cfg?.elevenLabsVoices)
  const selected = rs?.aiVoiceId || ''
  const voice = catalog.find((v) => v.id === selected)
  const voiceId = (voice?.id || selected || global.voiceId || '').trim()
  return {
    voiceId,
    style: Math.max(0, Math.min(100, rs?.aiVoiceStyle ?? 0)),
    name: voice?.name || (selected ? 'Voz elegida' : 'Voz predeterminada'),
  }
}
